@echo off
start "" msedge "%~dp0app\index.html" 2>nul || start "" chrome "%~dp0app\index.html" 2>nul || start "" "%~dp0app\index.html"
