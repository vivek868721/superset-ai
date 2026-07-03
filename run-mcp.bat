@echo off
REM ===== MODE B: Native Superset MCP server =====
REM Exposes ~25 Superset tools at http://127.0.0.1:5008/mcp
REM Connect Claude Code / Claude Desktop to it (see MODES.md).
REM Requires run-superset.bat to be running too.
set MCP_DEV_USERNAME=admin
"C:\Users\vivek.ky\Desktop\superset-setup\venv\Scripts\superset.exe" mcp run --host 127.0.0.1 --port 5008
