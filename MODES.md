# Two Modes — and how to switch

This project supports **two independent ways** to use AI with Superset.
They can run at the same time or separately. **Superset itself must be
running for either mode** (`run-superset.bat`).

```
                         ┌─────────────────────────────┐
                         │  Apache Superset (port 8088) │   <- always needed
                         │  examples.db (birth_names…)  │
                         └─────────────┬───────────────┘
                  REST API            │            built-in MCP
        ┌──────────────────────────────┘             └──────────────────────┐
        ▼                                                                    ▼
MODE A: Custom Web App                                   MODE B: Native Superset MCP
  Node backend  (port 3000)  ── Gemini                     superset mcp run (port 5008)
  Vue frontend  (port 5173)                                connect Claude Code / Desktop
  Your own branded UI                                      ~25 official Superset tools
```

---

## Prerequisite (both modes): start Superset

```cmd
run-superset.bat
```
Login at http://localhost:8088 — `admin` / `admin`.

---

## MODE A — Custom Vue + Node app (your branded UI)

```cmd
run-app.bat
```
- Backend: http://localhost:3000
- Frontend: http://localhost:5173
- Uses Gemini to turn natural language into SQL, runs it via Superset,
  renders ECharts in your own UI, and can "Publish to Superset".

## MODE B — Native Superset MCP (drive Superset from Claude)

```cmd
run-mcp.bat
```
- MCP server: http://127.0.0.1:5008/mcp  (no auth in local dev)
- Gives an AI assistant ~25 official tools: list/create datasets,
  generate/update charts (preview-first), build dashboards, run SQL, etc.

### Connect Claude Code (CLI)
Already wired — see `.mcp.json` in this folder:
```json
{
  "mcpServers": {
    "superset": { "type": "http", "url": "http://127.0.0.1:5008/mcp" }
  }
}
```
Run `claude` from this folder; approve the `superset` MCP server when prompted.
Then ask: *"What Superset tools are available?"* or *"List datasets"*.

### Connect Claude Desktop
Edit `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "superset": { "url": "http://127.0.0.1:5008/mcp" }
  }
}
```
Fully quit and reopen Claude Desktop. The hammer/tools icon confirms it.

---

## Which should I use?

| If you want…                                            | Use     |
|---------------------------------------------------------|---------|
| Your own web UI for end-users                           | Mode A  |
| To build charts/dashboards conversationally in Claude   | Mode B  |
| Both — branded app *and* AI-driven Superset             | Run both |

Nothing conflicts: different ports (3000/5173 vs 5008), all read the same
Superset instance on 8088.
