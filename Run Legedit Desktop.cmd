@echo off
cd /d "%~dp0"

if exist "%ProgramFiles%\nodejs\npm.cmd" (
  call "%ProgramFiles%\nodejs\npm.cmd" start
  exit /b %errorlevel%
)

if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" (
  call "%ProgramFiles(x86)%\nodejs\npm.cmd" start
  exit /b %errorlevel%
)

call npm.cmd start
exit /b %errorlevel%
