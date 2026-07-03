'use strict';

const RETRY_DEFAULTS = { retries: 3, delayMs: 2000 };

// Tools exposed directly by the MCP server (no call_tool wrapper needed)
const BASE_TOOLS = new Set(['health_check', 'get_instance_info', 'search_tools', 'call_tool']);

// Full tool catalog injected into the Gemini system prompt
const TOOL_CATALOG = {
  discovery: [
    { name: 'list_databases',    desc: 'List all database connections',                         params: '{}' },
    { name: 'list_datasets',     desc: 'List all datasets/tables',                              params: '{}' },
    { name: 'list_dashboards',   desc: 'List all dashboards',                                   params: '{}' },
    { name: 'list_charts',       desc: 'List all charts',                                       params: '{}' },
    { name: 'get_database_info', desc: 'Get database details by ID',                            params: '{ "database_id": number }' },
    { name: 'get_dataset_info',  desc: 'Get columns and row count for a dataset',               params: '{ "dataset_id": number }' },
    { name: 'get_dashboard_info',desc: 'Get charts and layout for a dashboard',                 params: '{ "dashboard_id": number }' },
    { name: 'get_instance_info', desc: 'Get Superset-wide statistics (chart/dataset counts)',   params: '{}' },
    { name: 'health_check',      desc: 'Verify MCP server is reachable',                       params: '{}' },
  ],
  sql: [
    { name: 'execute_sql',           desc: 'Run SQL; returns columns + rows',                                            params: '{ "database_id": number, "sql": string }' },
    { name: 'save_sql_query',        desc: 'Save SQL to SQL Lab saved queries',                                          params: '{ "database_id": number, "sql": string, "label": string }' },
    { name: 'create_virtual_dataset',desc: 'Save a SQL query as a chartable virtual dataset',                           params: '{ "database_id": number, "sql": string, "dataset_name": string }' },
  ],
  charts: [
    { name: 'generate_chart',
      desc: 'Create and save a chart permanently in Superset. chart_type: xy (bar/line), pie, table, big_number',
      params: '{ "dataset_id": number, "config": { "chart_type": "xy", "kind": "bar"|"line", "x": {"name": "col"}, "y": [{"name": "col", "aggregate": "SUM"}] }, "title": string, "save_chart": true }' },
    { name: 'update_chart',          desc: 'Modify an existing saved chart',             params: '{ "chart_id": number, "config": {...} }' },
    { name: 'update_chart_preview',  desc: 'Preview chart changes without saving',        params: '{ "chart_id": number, "config": {...} }' },
    { name: 'generate_explore_link', desc: 'Get an interactive Explore URL for ad-hoc analysis (preferred for quick explore)', params: '{ "dataset_id": number, "config": {...} }' },
  ],
  dashboards: [
    { name: 'generate_dashboard',              desc: 'Create a new dashboard from chart IDs',           params: '{ "title": string, "chart_ids": number[] }' },
    { name: 'add_chart_to_existing_dashboard', desc: 'Add a chart to an existing dashboard by ID',     params: '{ "dashboard_id": number, "chart_id": number }' },
  ],
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Handles variations in how MCP tools return list data.
// Superset list tools use keys like 'databases', 'datasets', 'charts', etc.
function extractList(result) {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== 'object') return [];
  // Explicit known keys
  if (Array.isArray(result.result))    return result.result;
  if (Array.isArray(result.data))      return result.data;
  if (Array.isArray(result.databases)) return result.databases;
  if (Array.isArray(result.datasets))  return result.datasets;
  // Fallback: first array-valued property
  for (const v of Object.values(result)) {
    if (Array.isArray(v)) return v;
  }
  return [];
}

async function healthCheckWithRetries(callMcp, opts = {}) {
  const { retries, delayMs } = { ...RETRY_DEFAULTS, ...opts };
  let lastError;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await callMcp('health_check', {});
      return;
    } catch (err) {
      lastError = err;
      if (attempt < retries - 1) await sleep(delayMs);
    }
  }
  throw new Error(
    `Cannot reach Superset MCP server after ${retries} attempts: ${lastError.message}\n` +
    `Make sure run-mcp.bat is running (superset mcp run --host 127.0.0.1 --port 5008)`
  );
}

async function fetchStartupContext(callMcp, opts = {}) {
  await healthCheckWithRetries(callMcp, opts);

  const [dbsResult, dsResult] = await Promise.all([
    callMcp('list_databases', {}),
    callMcp('list_datasets', {}),
  ]);

  return {
    databases: extractList(dbsResult),
    datasets:  extractList(dsResult),
  };
}

function buildSystemPrompt(databases, datasets) {
  const dbLines = databases.length
    ? databases.map(d => `  - ${d.database_name || d.name} (id: ${d.id})`).join('\n')
    : '  - examples (id: 1, type: sqlite)';

  const dsLines = datasets.length
    ? datasets.map(d => `  - ${d.table_name || d.name} (id: ${d.id}, database_id: ${d.database?.id ?? 'unknown'})`).join('\n')
    : '  - birth_names (id: 16, database_id: 1)';

  const catalogSections = Object.entries(TOOL_CATALOG)
    .map(([category, tools]) => {
      const lines = tools.map(t => `  - ${t.name}: ${t.desc}\n    params: ${t.params}`).join('\n');
      return `[${category.toUpperCase()} TOOLS]\n${lines}`;
    })
    .join('\n\n');

  return `You are an AI assistant that controls an Apache Superset analytics instance.
Users ask natural-language questions. You translate them into a structured plan of MCP tool calls.

AVAILABLE DATABASES:
${dbLines}

AVAILABLE DATASETS:
${dsLines}

BIRTH_NAMES SCHEMA (primary dataset, id: 16):
  Columns: ds (DATETIME), gender (TEXT 'boy'|'girl'), name (TEXT), num (BIGINT births count),
           state (TEXT US state), num_boys (BIGINT), num_girls (BIGINT)
  SQLite rules: NO "year" column — use CAST(strftime('%Y', ds) AS INTEGER) AS year
                Always aggregate with SUM(num) AS total

MCP TOOL CATALOG:
${catalogSections}

AUTOMATIC PIPE RULES (backend wires these — do NOT include piped values in plan params):
  create_virtual_dataset.id  → generate_chart datasource_id (wired automatically)
  generate_chart.id          → generate_dashboard chart_ids (wired automatically)
  generate_chart.id          → add_chart_to_existing_dashboard chart_id (wired automatically)

OUTPUT FORMAT — respond with ONLY valid JSON, no prose, no markdown:

For Superset operations (creating charts/dashboards, running SQL, listing data):
{ "path": "mcp", "plan": [{ "tool": "<tool_name>", "params": { ... } }] }

For pure local visualization (no Superset persistence, fast rendering):
{ "path": "viz", "sql": "SELECT ...", "chartType": "bar|line|pie", "groupby": ["column"] }

EXAMPLE — create bar chart of top baby names in Superset (use xy + kind bar):
{ "path": "mcp", "plan": [{ "tool": "generate_chart", "params": { "dataset_id": 16, "config": { "chart_type": "xy", "kind": "bar", "x": {"name": "name"}, "y": [{"name": "num", "aggregate": "SUM"}] }, "title": "Top Baby Names", "save_chart": true } }] }

EXAMPLE — create pie chart of gender distribution in Superset:
{ "path": "mcp", "plan": [{ "tool": "generate_chart", "params": { "dataset_id": 16, "config": { "chart_type": "pie", "groupby": ["gender"], "metric": {"name": "num", "aggregate": "SUM"} }, "title": "Gender Distribution", "save_chart": true } }] }

EXAMPLE — quick local bar chart (no Superset, just show me):
{ "path": "viz", "sql": "SELECT name, SUM(num) AS total FROM birth_names GROUP BY name ORDER BY total DESC", "chartType": "bar", "groupby": ["name"] }

RULES:
PATH SELECTION (most important rule):
- Use "viz" path when the user says: "show me", "display", "visualize", "quick chart", or any simple chart/graph/plot request WITHOUT explicitly asking to save or create in Superset
- Use "mcp" path ONLY when the user explicitly says: "create in Superset", "save to Superset", "add to dashboard", "list my ...", "how many ...", or any read/write operation on Superset objects

GENERATE_CHART RULES:
- generate_chart needs datasource_id (an ID from the AVAILABLE DATASETS list above), NOT raw SQL data
- chart_type must be: bar, pie, line, table, scatter, or big_number
- Do NOT plan execute_sql followed by generate_chart — they do not chain. Use datasource_id directly.

VIZ PATH RULES:
- SQL must be SQLite syntax, always use SUM(num) AS total, use strftime for dates
- Never include LIMIT in viz path SQL (the backend adds it)

PIPE RULES (backend auto-wires these — do NOT include in your plan params):
- create_virtual_dataset.id → generate_chart datasource_id
- generate_chart.id         → generate_dashboard chart_ids
- generate_chart.id         → add_chart_to_existing_dashboard chart_id

GENERAL:
- For multi-step plans, order matters: dataset before chart, chart before dashboard
- When user references "that chart" or "my dashboard", resolve from conversation history`;
}

module.exports = { fetchStartupContext, buildSystemPrompt, healthCheckWithRetries, extractList, BASE_TOOLS, TOOL_CATALOG };
