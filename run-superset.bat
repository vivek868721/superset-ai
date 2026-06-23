@echo off
REM Superset web UI on http://localhost:8088  (login: admin / admin)
REM Needed by BOTH modes (custom app + native MCP).
"C:\Users\vivek.ky\Desktop\superset-setup\venv\Scripts\superset.exe" run -p 8088 --with-threads
