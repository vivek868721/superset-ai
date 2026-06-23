require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { generateAIConfig } = require('./llm');
const { runSQL, publishToSuperset } = require('./superset');

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Ask: generate SQL via AI, run it, return the raw data.
// (Does NOT create anything in Superset — the frontend renders the chart itself.)
app.post('/ask', async (req, res) => {
  try {
    const query = req.body.query;

    const config = await generateAIConfig(query);

    console.log("🤖 AI CONFIG:", config);

    let sql = config.sql;

    // 🔥 enforce LIMIT from user query
    const match = query.match(/(top|limit)\s+(\d+)/i);
    if (match) {
      const limit = parseInt(match[2]);
      if (/limit\s+\d+/i.test(sql)) {
        // replace existing LIMIT
        sql = sql.replace(/limit\s+\d+/i, `LIMIT ${limit}`);
      } else {
        // no LIMIT in AI SQL → append it
        sql = sql.replace(/;?\s*$/, ` LIMIT ${limit}`);
      }
    } else if (!sql.toLowerCase().includes("limit")) {
      sql = sql.replace(/;?\s*$/, " LIMIT 5");
    }

    const { data } = await runSQL(sql);

    res.json({
      sql,
      chartType: config.chartType,
      groupby: config.groupby,
      data
    });

  } catch (err) {
    console.error("❌ ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// 🚀 Publish: create a chart + dashboard in Superset on demand, return its URL.
app.post('/publish', async (req, res) => {
  try {
    const { sql, chartType, groupby } = req.body;

    const result = await publishToSuperset({ sql, chartType, groupby });

    console.log("📊 PUBLISHED:", result);

    res.json(result);

  } catch (err) {
    console.error("❌ PUBLISH ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// 🌉 Proxy to Superset MCP server (for Vue frontend CORS)
app.post('/mcp-proxy', async (req, res) => {
  try {
    const { method, params } = req.body;
    const response = await fetch('http://127.0.0.1:5008/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method,
        params
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`MCP server error: ${response.status}`, errorText);
      throw new Error(`MCP server returned ${response.status}`);
    }

    const text = await response.text();
    // Parse Server-Sent Events format from MCP
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const json = JSON.parse(line.slice(6));
        return res.json(json);
      }
    }
    throw new Error('No data received from MCP server');
  } catch (err) {
    console.error('MCP proxy error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 MCP Server running on port 3000");
});
