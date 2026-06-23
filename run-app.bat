@echo off
REM ===== MODE A: Custom Vue + Node app =====
REM Starts the Node backend (port 3000) and Vue frontend (port 5173)
REM in two new windows. Requires run-superset.bat to be running too.
start "MCP Backend (Node)" cmd /k "cd /d %~dp0mcp-server && node server.js"
start "Frontend (Vite)" cmd /k "cd /d %~dp0 && npm run dev"
echo Backend  -> http://localhost:3000
echo Frontend -> http://localhost:5173
