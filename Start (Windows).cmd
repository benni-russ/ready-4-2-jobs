@echo off
setlocal
set "ZIEL=%~dp0app\index.html"
set "PFADE=Software\Microsoft\Windows\CurrentVersion\App Paths"
set "BROWSER="
set "PROGID="

rem Der Standardbrowser hat Vorrang, wenn die App in ihm laeuft.
for /f "tokens=3" %%a in ('reg query "HKCU\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\https\UserChoice" /v ProgId 2^>nul') do set "PROGID=%%a"
if /i "%PROGID%"=="ChromeHTML" call :waehlen chrome
if /i "%PROGID%"=="MSEdgeHTM" call :waehlen msedge
call :waehlen msedge
call :waehlen chrome

rem Ohne Edge und Chrome oeffnet Windows den Standardbrowser, die App zeigt dort ihre Hinweisseite.
start "" %BROWSER% "%ZIEL%"
exit /b

:waehlen
if defined BROWSER exit /b
reg query "HKLM\%PFADE%\%~1.exe" >nul 2>&1 && set "BROWSER=%~1"
reg query "HKCU\%PFADE%\%~1.exe" >nul 2>&1 && set "BROWSER=%~1"
exit /b
