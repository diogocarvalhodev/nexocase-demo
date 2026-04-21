@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%restore_db.ps1"

if not exist "%PS_SCRIPT%" (
  echo [erro] Nao foi encontrado: %PS_SCRIPT%
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo [erro] Restore falhou com codigo %EXIT_CODE%.
)

exit /b %EXIT_CODE%
