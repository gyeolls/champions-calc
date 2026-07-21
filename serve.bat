@echo off
cd /d "%~dp0"
echo Starting local server at http://localhost:8420 ...
start "" http://localhost:8420
where py >nul 2>nul && (py -m http.server 8420 & goto :eof)
where python >nul 2>nul && (python -m http.server 8420 & goto :eof)
echo Python not found. Please open index.html directly in Chrome/Edge.
pause
