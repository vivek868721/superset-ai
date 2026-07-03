'use strict';

const { GoogleGenAI } = require('@google/genai');

// ── Gemini client (lazy-init so tests can mock before requiring this module) ──
let _genAI = null;
function getGenAI() {
  if (!_genAI) _genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _genAI;
}

function cleanJSON(text) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

// ── Pipe rules ────────────────────────────────────────────────────────────────
// Each rule says: when the previous completed step was `fromTool`,
// and the current step is `toTool`, inject `fromPath(prevResult)` into
// `toParam` of the current step's params (with optional transform).
const PIPE_RULES = [
  // execute_sql result is NOT piped to generate_chart — generate_chart needs a
  // datasource_id (Superset dataset ID), not raw SQL rows.
  {
    fromTool: 'create_virtual_dataset',
    toTool:   'generate_chart',
    toParam:  'datasource_id',
    fromPath: r => r?.id ?? r?.dataset_id,
  },
  {
    fromTool:    'generate_chart',
    toTool:      'generate_dashboard',
    toParam:     'chart_ids',
    fromPath:    r => r?.chart?.id ?? r?.id ?? r?.chart_id,
    toTransform: id => [id],
  },
  {
    fromTool: 'generate_chart',
    toTool:   'add_chart_to_existing_dashboard',
    toParam:  'chart_id',
    fromPath: r => r?.chart?.id ?? r?.id ?? r?.chart_id,
  },
];

// Merges pipe-resolved values into the current step's params.
function applyPipeRules(currentStep, previousResult, completedSteps) {
  if (!previousResult || completedSteps.length === 0) return { ...currentStep.params };

  const prevTool = completedSteps[completedSteps.length - 1].tool;
  const params   = { ...currentStep.params };

  for (const rule of PIPE_RULES) {
    if (rule.fromTool === prevTool && rule.toTool === currentStep.tool) {
      const value = rule.fromPath(previousResult);
      if (value != null) {
        params[rule.toParam] = rule.toTransform ? rule.toTransform(value) : value;
      }
    }
  }
  return params;
}

// ── Plan executor ─────────────────────────────────────────────────────────────
async function executePlan(plan, callMcp) {
  const completedSteps = [];
  let previousResult   = null;

  for (const step of plan) {
    try {
      const params = applyPipeRules(step, previousResult, completedSteps);
      const result = await callMcp(step.tool, params);
      completedSteps.push({ tool: step.tool, params, result });
      previousResult = result;
    } catch (err) {
      return {
        completedSteps,
        failedStep: { tool: step.tool, error: err.message },
      };
    }
  }

  return { completedSteps, failedStep: null };
}

// ── Response shape builder ────────────────────────────────────────────────────
const URL_TOOLS = new Set([
  'generate_chart', 'generate_dashboard', 'generate_explore_link',
  'add_chart_to_existing_dashboard',
]);

function buildChatResponse(completedSteps, reply) {
  const last   = completedSteps[completedSteps.length - 1];
  let data     = null;
  let url      = null;
  let chartInfo = null;

  if (last) {
    const r = last.result;
    if (last.tool === 'execute_sql') {
      data = r;
    } else if (URL_TOOLS.has(last.tool)) {
      // generate_chart returns { chart: { id, url, ... }, previews: { url: { preview_url } } }
      // Other tools return a flat url/dashboard_url/explore_url
      const rawUrl = r?.chart?.url
        ?? r?.url
        ?? r?.dashboard_url
        ?? r?.chart_url
        ?? r?.explore_url
        ?? r?.previews?.url?.preview_url
        ?? null;
      // Normalise the URL: replace 0.0.0.0:8080 → localhost:8088
      url = rawUrl ? rawUrl.replace(/0\.0\.0\.0:8080/g, 'localhost:8088') : null;
      if (last.tool === 'generate_chart') {
        chartInfo = { id: r?.chart?.id ?? r?.id ?? r?.chart_id, title: r?.chart?.slice_name ?? r?.title };
      }
    }
  }

  return { reply, data, url, chartInfo };
}

// ── Gemini call 1: classify intent + generate plan ───────────────────────────
async function classifyAndPlan(query, messages, systemPrompt) {
  const genAI = getGenAI();

  const history = (messages || []).slice(-20).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const fullPrompt = `${systemPrompt}

CONVERSATION HISTORY:
${history.map(m => `[${m.role}]: ${m.parts[0].text}`).join('\n') || '(none)'}

USER QUERY:
${query}

Respond with ONLY valid JSON — no prose, no markdown fences.`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: fullPrompt,
  });

  const raw     = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = cleanJSON(raw);
  return JSON.parse(cleaned);
}

// ── Gemini call 2: convert tool results to natural language ──────────────────
async function narrateResults(query, completedSteps, failedStep) {
  const genAI = getGenAI();

  const stepSummary = completedSteps.map((s, i) =>
    `Step ${i + 1} — ${s.tool}: ${JSON.stringify(s.result).slice(0, 300)}`
  ).join('\n');

  const failInfo = failedStep
    ? `\nFailed at step: ${failedStep.tool} — ${failedStep.error}`
    : '';

  const prompt = `You are summarising the results of Superset MCP tool calls for a user.
Write a concise, friendly 1–3 sentence response in plain English.

Original user request: "${query}"

Tool results:
${stepSummary}${failInfo}

Rules:
- Mention specific numbers, chart IDs, or dashboard names if available
- If a step failed, explain what completed and suggest a fix
- Do NOT include JSON, code, or raw API responses
- Do NOT start with "I" — vary your openings
- If a chart or dashboard was created, invite the user to open it or add it somewhere

Reply (plain text only):`;

  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
    'Done. Check your Superset instance for the result.';
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
async function handleChat(query, messages, systemPrompt, callMcp) {
  // Gemini call 1 — classify and plan
  const planResult = await classifyAndPlan(query, messages, systemPrompt);

  // Viz path — no MCP tools, pure local ECharts rendering
  if (planResult.path === 'viz') {
    return {
      path:      'viz',
      sql:       planResult.sql,
      chartType: planResult.chartType || 'bar',
      groupby:   planResult.groupby   || ['name'],
      reply:     null,
      data:      null,
      url:       null,
    };
  }

  // MCP path — execute plan steps
  const { completedSteps, failedStep } = await executePlan(planResult.plan || [], callMcp);

  // Gemini call 2 — narrate results
  const reply = await narrateResults(query, completedSteps, failedStep);

  return buildChatResponse(completedSteps, reply);
}

module.exports = {
  handleChat,
  classifyAndPlan,
  executePlan,
  applyPipeRules,
  buildChatResponse,
  narrateResults,
};
