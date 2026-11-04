@echo off
cd /d "%~dp0"
C:\Python314\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8080 --reload
pause