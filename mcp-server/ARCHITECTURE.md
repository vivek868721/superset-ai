# MCP Server — Architecture & Developer Guide

## Overview

This Node.js/Express server is the backend for the SupersetMCP AI analytics platform.
It exposes a chat API (`POST /chat`) that translates natural-language queries into
Apache Superset operations via the MCP (Model Context Protocol) server.

**Stack:** Express 4 · Google Gemini 2.5 Flash · Superset MCP (port 5008) · Jest

---

## File Map

```
mcp-server/
├── server.js        Entry point — routes, startup boot, production callMcpTool
├── startup.js       Context pre-fetch + Gemini system prompt builder
├── chat.js          Plan generation (Gemini call 1), plan executor, pipe rules,
│                    narration (Gemini call 2), response shaping
├── llm.js           Original Gemini SQL generator for the /ask viz path
├── superset.js      Direct Superset REST API client (used by /ask and /publish)
└── __tests__/
    ├── startup.test.js   11 tests — fetchStartupContext, buildSystemPrompt, extractList
    └── chat.test.js      14 tests — applyPipeRules, executePlan, buildChatResponse
```

---

## Startup Sequence

On `node server.js`, `initServer()` runs before the HTTP server binds:

```
1. fetchStartupContext(callMcpTool)
   ├── healthCheckWithRetries()   ← 3 retries, 2s gap; process.exit(1) if all fail
   ├── list_databases             ← parallel
   └── list_datasets              ← parallel

2. buildSystemPrompt(databases, datasets)
   └── embeds DB list, dataset list, full tool catalog, pipe rule hints,
       birth_names schema, and output format instructions into a static string

3. app.listen(3000)
```

The `systemPrompt` string is stored at module scope and injected into every
Gemini call made by `/chat`. Use `POST /refresh-context` to rebuild it without
restarting the server (e.g. after adding a new dataset in Superset).

---

## /chat Route — Request & Response

### Request
```json
POST /chat
{
  "query":    "Create a pie chart of gender distribution",
  "messages": [
    { "role": "user",      "content": "What databases are connected?" },
    { "role": "assistant", "content": "You have 1 database: examples (SQLite)." }
  ]
}
```
- `messages` is the full conversation history (frontend maintains it).
- Capped at 20 entries before being passed to Gemini.

### Response — MCP path
```json
{
  "reply":     "Done! Created a pie chart 'Gender Distribution' (ID: 42). Add it to a dashboard?",
  "data":      null,
  "url":       "http://localhost:8088/explore/table/42",
  "chartInfo": { "id": 42, "title": "Gender Distribution" }
}
```

### Response — Viz path (local ECharts render, no Superset write)
```json
{
  "path":      "viz",
  "sql":       "SELECT gender, SUM(num) AS total FROM birth_names GROUP BY gender",
  "chartType": "pie",
  "groupby":   ["gender"],
  "reply":     null,
  "data":      null,
  "url":       null
}
```

**Frontend rendering rule:**
- `path === 'viz'` → run SQL via `/ask` fallback, render with ECharts locally
- `data !== null` → render ECharts card from row data  
- `url !== null`  → render "Open in Superset →" card

---

## Two Gemini Calls Per MCP Request

```
User query
    │
    ▼
[Gemini call 1] classifyAndPlan()
    │  Input:  systemPrompt + conversation history + user query
    │  Output: { "path": "mcp", "plan": [{tool, params}, ...] }
    │          OR { "path": "viz", "sql": "...", "chartType": "...", "groupby": [...] }
    │
    ▼  (only for "mcp" path)
executePlan(plan, callMcpTool)
    │  Runs each step sequentially
    │  Applies pipe rules between steps
    │  Stops and captures partial results on first failure
    │
    ▼
[Gemini call 2] narrateResults()
    │  Input:  original query + all completed step results + optional failure info
    │  Output: plain English reply (1–3 sentences)
    │
    ▼
buildChatResponse()
    └── { reply, data, url, chartInfo }
```

For the **viz path**, only one Gemini call runs (same as the original `/ask` flow).

---

## Pipe Rules

When a plan has multiple steps, the executor automatically wires outputs to inputs
so Gemini doesn't need to know values it can't predict (e.g. a chart ID that
doesn't exist yet).

| From tool                   | From field       | To tool                          | To param      |
|-----------------------------|------------------|----------------------------------|---------------|
| `execute_sql`               | `result`         | `generate_chart`                 | `data`        |
| `create_virtual_dataset`    | `result.id`      | `generate_chart`                 | `datasource_id` |
| `generate_chart`            | `result.id`      | `generate_dashboard`             | `chart_ids[0]` |
| `generate_chart`            | `result.id`      | `add_chart_to_existing_dashboard`| `chart_id`    |

Rules are applied in `applyPipeRules()` in [chat.js](./chat.js). Only the
immediately preceding completed step's output is piped — there is no cross-step
context beyond the adjacent pair.

**Gemini's job:** Specify tool names and non-piped params. The backend injects piped values.

---

## Plan Failure Behaviour

- Stops at the **first failed step** — does not skip or continue.
- Returns `completedSteps` (what worked) and `failedStep: { tool, error }` to Gemini.
- Gemini call 2 receives both and produces a reply like:
  > "The SQL query ran and returned 10 rows, but creating the chart failed: dataset ID not found. Try listing your datasets first with 'show my datasets'."
- **No rollback** — Superset has no transaction API. Any objects created in
  completed steps persist.

---

## callMcpTool — Production MCP Client

`callMcpTool(toolName, args)` in `server.js` dispatches to the Superset MCP
server at `http://127.0.0.1:5008/mcp` using JSON-RPC 2.0 over HTTP.

Superset's MCP server exposes two tiers:

| Tier | Tools | How to call |
|------|-------|-------------|
| Base | `health_check`, `get_instance_info`, `search_tools`, `call_tool` | `tools/call` with `{ name: toolName }` directly |
| Superset | `list_databases`, `execute_sql`, `generate_chart`, etc. | Via `call_tool` meta-wrapper: `{ name: 'call_tool', arguments: { name: toolName, arguments: { request: args } } }` |

The response comes back as **Server-Sent Events (SSE)**. The function parses the
`data: ` line, checks `result.isError`, and returns `JSON.parse(result.content[0].text)`.

---

## /refresh-context

```
POST /refresh-context
Response: { "ok": true, "databasesCount": 1, "datasetsCount": 4 }
```

Re-runs the full pre-fetch (`list_databases` + `list_datasets`) and rebuilds
`systemPrompt` in-place. Call this after:
- Adding or removing a dataset in Superset
- Connecting a new database
- Any schema change you want Gemini to know about

---

## Legacy Routes (kept for compatibility)

| Route | Purpose |
|-------|---------|
| `POST /ask` | Original viz path: Gemini → SQL → Superset SQL execution → ECharts data |
| `POST /publish` | Create chart + dashboard in Superset via direct REST API |
| `POST /mcp-proxy` | CORS bridge for the MCPConsole Vue tab: forwards raw JSON-RPC to port 5008 |

These routes are unchanged. The new `/chat` route internally falls back to the
same flow as `/ask` for pure viz queries (path === 'viz').

---

## Running Tests

```bash
cd mcp-server
npm test             # run all tests once
npm run test:watch   # watch mode during development
```

Tests use Jest and inject mock `callMcp` functions — no live MCP or Gemini
connection required.

```
PASS __tests__/startup.test.js
  fetchStartupContext
    ✓ returns databases and datasets when all MCP calls succeed
    ✓ retries health_check once on first failure and succeeds on second attempt
    ✓ throws a clear error after 3 consecutive health_check failures
  buildSystemPrompt
    ✓ includes database names and IDs
    ✓ includes dataset names and IDs
    ✓ includes MCP tool names from every category
    ✓ falls back to placeholder text when no databases or datasets are provided
  extractList
    ✓ returns the array directly when result is already an array
    ✓ extracts from result.result
    ✓ extracts from result.data
    ✓ returns empty array for unexpected shapes

PASS __tests__/chat.test.js
  applyPipeRules
    ✓ pipes execute_sql result into generate_chart data param
    ✓ pipes create_virtual_dataset id into generate_chart datasource_id
    ✓ wraps generate_chart id into chart_ids array for generate_dashboard
    ✓ pipes generate_chart id into add_chart_to_existing_dashboard chart_id
    ✓ returns params unchanged when no pipe rule matches
    ✓ returns params unchanged when completedSteps is empty
  executePlan
    ✓ executes all steps and returns null failedStep when all succeed
    ✓ stops at first failure and captures partial results
    ✓ wires pipe rules between steps automatically
  buildChatResponse
    ✓ populates data from execute_sql result
    ✓ populates url from generate_dashboard result
    ✓ returns null data and url for discovery tools
```

---

## Environment Variables

Copy `.env.example` to `.env` inside `mcp-server/`:

```
GEMINI_API_KEY=your-gemini-api-key

SUPERSET_URL=http://localhost:8088
SUPERSET_USERNAME=admin
SUPERSET_PASSWORD=admin
SUPERSET_DATABASE_ID=1
DATASET_ID=16
```

---

## Starting All Services

```
1. run-superset.bat     → Superset UI on :8088
2. run-mcp.bat          → Superset MCP server on :5008
3. run-app.bat          → Node backend :3000 + Vue frontend :5173
```

All three must be running for `/chat` to work. The Node backend fails fast at
startup if the MCP server (step 2) is not reachable.

---

## Frontend Architecture

### File Map

```
src/
├── App.vue                     Root layout: sidebar (ChatPanel) + main panel (Dashboard)
├── store.js                    Global reactive state — messages, cards, dark mode
├── services/
│   └── api.js                  HTTP helpers: chatAI(), refreshContext(), askAI(), publishToSuperset()
└── components/
    ├── ChatPanel.vue            Left sidebar: message thread + input box
    ├── Dashboard.vue            Right panel: card grid + MCP Console tab
    ├── ChartCard.vue            ECharts visualization card (viz path output)
    ├── SupersetLinkCard.vue     Superset link card (MCP path output, has "Open in Superset →")
    └── MCPConsole.vue           Developer tool: direct MCP tool calls from the browser
```

### store.js — Card Types

`store.cards` is a unified array. Every entry has a `type` field:

```js
// Viz path — local ECharts rendering
{ id, type: 'chart',    title, sql, chartType, groupby, data }

// MCP path — Superset-hosted object
{ id, type: 'superset', title, url, reply, chartInfo }
```

`store.addChart()` is kept as a backward-compat alias for `store.addCard({ type: 'chart', ... })`.

### ChatPanel.vue — Conversation Flow

```
User types query
    │
    ▼
chatAI(query, priorHistory)    ← POST /chat with session history (last 20 entries)
    │
    ├── result.data + result.chartType  → store.addCard({ type: 'chart', ... })
    ├── result.url                      → store.addCard({ type: 'superset', ... })
    └── result.reply                    → store.addMessage({ role: 'ai', ... })
                                          (always shown in chat thread)
```

**Conversation history** is maintained locally in `conversationHistory[]` inside
`ChatPanel.vue` — not in the global store. It is session-only (lost on page refresh)
and capped at 20 entries. It is sent as `messages[]` with every `/chat` request so
Gemini can resolve references like "add that chart to my dashboard".

**Render decision** (frontend, in `handleSubmit`):

| Condition | Action |
|-----------|--------|
| `result.data && result.chartType` | Add ECharts card (`ChartCard`) |
| `result.url` | Add Superset link card (`SupersetLinkCard`) |
| Both null | Text-only AI bubble (e.g. list results narrated in prose) |

### Dashboard.vue — Card Grid

Renders `store.cards` with type discrimination:

```vue
<ChartCard        v-if="card.type === 'chart'"    :chartData="card" @remove="removeCard" />
<SupersetLinkCard v-else-if="card.type === 'superset'" :card="card" @remove="removeCard" />
```

Card count badge shows total with per-type breakdown:  
`3 cards (2 charts, 1 Superset)`

### SupersetLinkCard.vue

Displays for MCP-path results (generate_chart, generate_dashboard, generate_explore_link).

- Header: auto-detected type badge (`CHART` / `DASHBOARD` / `EXPLORE`), title, remove button
- Body: Superset icon + Gemini's narrated reply + chart ID chip
- Footer: "Open in Superset →" link (opens in new tab)

### api.js — Exported Functions

| Function | Route | Purpose |
|----------|-------|---------|
| `chatAI(query, messages)` | `POST /chat` | Primary: natural language → chart/link/text |
| `refreshContext()` | `POST /refresh-context` | Rebuild Gemini context after dataset changes |
| `askAI(query)` | `POST /ask` | Legacy: viz-only, no history |
| `publishToSuperset({sql, chartType, groupby})` | `POST /publish` | Legacy: direct publish |

### Example Prompts by Path

**Viz path** (fast, local ECharts, no Superset write):
- "Top 10 baby names"
- "Births by year as a line chart"
- "Gender distribution pie chart"

**MCP path** (creates/reads Superset objects):
- "Create a bar chart of top 10 names in Superset"
- "List all my dashboards"
- "What datasets do I have?"
- "How many charts are in my Superset?"
- "Add that chart to my Birth Names dashboard"
- "Create a dashboard with the chart you just made"
