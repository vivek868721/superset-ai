'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { generateAIConfig }               = require('./llm');
const { runSQL, publishToSuperset }      = require('./superset');
const { fetchStartupContext, buildSystemPrompt, BASE_TOOLS, TOOL_CATALOG } = require('./startup');
const { handleChat }                     = require('./chat');

const app = express();
app.use(cors());
app.use(express.json());

// ── Module-level context (populated at startup) ───────────────────────────────
let systemPrompt = '';

// ── Production MCP tool caller ────────────────────────────────────────────────
// Superset-specific tools are accessed via the call_tool meta-wrapper.
// Base tools (health_check, get_instance_info) are called directly.
async function callMcpTool(toolName, args = {}) {
  const isBase = BASE_TOOLS.has(toolName);

  const params = isBase
    ? (Object.keys(args).length ? { name: toolName, arguments: args } : { name: toolName })
    : { name: 'call_tool', arguments: { name: toolName, arguments: { request: args } } };

  const response = await fetch('http://127.0.0.1:5008/mcp', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id:      Date.now(),
      method:  'tools/call',
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`MCP server returned ${response.status}`);
  }

  const text = await response.text();
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const json = JSON.parse(line.slice(6));
    // Skip SSE notification messages; only process the actual JSON-RPC result
    if (json.method === 'notifications/message') continue;
    if (json.result?.isError) {
      throw new Error(json.result.content?.[0]?.text || 'MCP tool error');
    }
    const rawText = json.result?.content?.[0]?.text;
    if (rawText) {
      try { return JSON.parse(rawText); } catch { return rawText; }
    }
    return json.result;
  }
  throw new Error('No data received from MCP server');
}

// ── Startup: pre-fetch context + build Gemini system prompt ──────────────────
async function initServer() {
  console.log('⏳ Connecting to Superset MCP server...');
  try {
    const { databases, datasets } = await fetchStartupContext(callMcpTool);
    systemPrompt = buildSystemPrompt(databases, datasets);
    console.log(`✅ Context loaded — ${databases.length} database(s), ${datasets.length} dataset(s)`);
  } catch (err) {
    console.error(`\n❌ STARTUP FAILED\n${err.message}\n`);
    process.exit(1);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /chat — single entry point for all user queries.
// Response shape (always):
//   { reply, data, url, chartType, groupby, sql, chartInfo }
// Frontend renders:
//   data + chartType  → ECharts card (viz path)
//   url               → Superset link card (MCP path)
//   reply only        → text bubble (discovery / list operations)
app.post('/chat', async (req, res) => {
  try {
    const { query, messages = [] } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) is required' });
    }
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    const result = await handleChat(query, messages, systemPrompt, callMcpTool);

    // Viz path — Gemini chose local SQL rendering; execute SQL here and return data.
    if (result.path === 'viz') {
      let sql = result.sql;
      const match = query.match(/(top|limit)\s+(\d+)/i);
      if (match) {
        const limit = parseInt(match[2]);
        sql = /limit\s+\d+/i.test(sql)
          ? sql.replace(/limit\s+\d+/i, `LIMIT ${limit}`)
          : sql.replace(/;?\s*$/, ` LIMIT ${limit}`);
      } else if (!sql.toLowerCase().includes('limit')) {
        sql = sql.replace(/;?\s*$/, ' LIMIT 5');
      }
      const { data } = await runSQL(sql);
      return res.json({
        reply:     `Here's a ${result.chartType} chart for your query.`,
        data,
        chartType: result.chartType || 'bar',
        groupby:   result.groupby   || ['name'],
        sql,
        url:       null,
        chartInfo: null,
      });
    }

    // MCP path — handleChat already ran the plan and narrated; return as-is.
    res.json(result);
  } catch (err) {
    console.error('❌ /chat error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /tools — returns all known MCP tool names for the MCP Console UI
app.get('/tools', (req, res) => {
  const superset = Object.values(TOOL_CATALOG).flat().map(t => ({
    name:        t.name,
    description: t.desc,
    category:    Object.entries(TOOL_CATALOG).find(([, v]) => v.some(x => x.name === t.name))?.[0] || 'other',
    paramsHint:  t.params,
    _isSuperset: true,
  }));
  res.json({ tools: superset });
});

// POST /refresh-context — re-fetch databases/datasets without restarting
app.post('/refresh-context', async (req, res) => {
  try {
    const { databases, datasets } = await fetchStartupContext(callMcpTool);
    systemPrompt = buildSystemPrompt(databases, datasets);
    console.log(`🔄 Context refreshed — ${databases.length} database(s), ${datasets.length} dataset(s)`);
    res.json({ ok: true, datasetsCount: datasets.length, databasesCount: databases.length });
  } catch (err) {
    console.error('❌ /refresh-context error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /ask — original viz-only route (kept for backwards compatibility)
app.post('/ask', async (req, res) => {
  try {
    const query  = req.body.query;
    const config = await generateAIConfig(query);
    console.log('🤖 AI CONFIG:', config);

    let sql = config.sql;
    const match = query.match(/(top|limit)\s+(\d+)/i);
    if (match) {
      const limit = parseInt(match[2]);
      sql = /limit\s+\d+/i.test(sql)
        ? sql.replace(/limit\s+\d+/i, `LIMIT ${limit}`)
        : sql.replace(/;?\s*$/, ` LIMIT ${limit}`);
    } else if (!sql.toLowerCase().includes('limit')) {
      sql = sql.replace(/;?\s*$/, ' LIMIT 5');
    }

    const { data } = await runSQL(sql);
    res.json({ sql, chartType: config.chartType, groupby: config.groupby, data });
  } catch (err) {
    console.error('❌ /ask error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// POST /publish — original publish route (kept for backwards compatibility)
app.post('/publish', async (req, res) => {
  try {
    const { sql, chartType, groupby } = req.body;
    const result = await publishToSuperset({ sql, chartType, groupby });
    console.log('📊 PUBLISHED:', result);
    res.json(result);
  } catch (err) {
    console.error('❌ /publish error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// POST /mcp-proxy — CORS bridge for the Vue frontend (kept for MCPConsole tab)
app.post('/mcp-proxy', async (req, res) => {
  try {
    const { method, params } = req.body;
    const response = await fetch('http://127.0.0.1:5008/mcp', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MCP server error: ${response.status}`, errorText);
      throw new Error(`MCP server returned ${response.status}`);
    }

    const text = await response.text();
    for (const line of text.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      const json = JSON.parse(line.slice(6));
      if (json.method === 'notifications/message') continue;
      return res.json(json);
    }
    throw new Error('No data received from MCP server');
  } catch (err) {
    console.error('MCP proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────
initServer().then(() => {
  app.listen(3000, () => console.log('🚀 MCP Server running on port 3000'));
});
