@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKUP_BAT=%SCRIPT_DIR%backup_db.bat"
set "RESTORE_BAT=%SCRIPT_DIR%restore_db.bat"

if not exist "%BACKUP_BAT%" (
  echo [erro] Nao foi encontrado: %BACKUP_BAT%
  exit /b 1
)

if not exist "%RESTORE_BAT%" (
  echo [erro] Nao foi encontrado: %RESTORE_BAT%
  exit /b 1
)

if /I "%~1"=="backup" (
  call "%BACKUP_BAT%" %2 %3 %4 %5 %6 %7 %8 %9
  exit /b %ERRORLEVEL%
)

if /I "%~1"=="restore" (
  call :confirm_restore
  if errorlevel 1 exit /b 1
  call "%RESTORE_BAT%" %2 %3 %4 %5 %6 %7 %8 %9
  exit /b %ERRORLEVEL%
)

if /I "%~1"=="restore-file" (
  if "%~2"=="" (
    echo [erro] Informe o caminho do arquivo dump.
    echo Exemplo: db_tools.bat restore-file ".\backups\db\cco_YYYYMMDD_HHMMSS.dump"
    exit /b 1
  )
  call :confirm_restore
  if errorlevel 1 exit /b 1
  call "%RESTORE_BAT%" -BackupFile "%~2" %3 %4 %5 %6 %7 %8 %9
  exit /b %ERRORLEVEL%
)

echo ===============================
echo      CCO - DB Tools Menu
echo ===============================
echo [1] Backup do banco
echo [2] Restore do ultimo backup
echo [3] Restore de arquivo especifico
echo [4] Sair
echo.

choice /C 1234 /N /M "Escolha uma opcao: "
if errorlevel 4 exit /b 0
if errorlevel 3 (
  set "BACKUP_FILE="
  set /p BACKUP_FILE=Digite o caminho do arquivo .dump: 
  if "%BACKUP_FILE%"=="" (
    echo [erro] Caminho nao informado.
    exit /b 1
  )
  call :confirm_restore
  if errorlevel 1 exit /b 1
  call "%RESTORE_BAT%" -BackupFile "%BACKUP_FILE%"
  exit /b %ERRORLEVEL%
)
if errorlevel 2 (
  call :confirm_restore
  if errorlevel 1 exit /b 1
  call "%RESTORE_BAT%"
  exit /b %ERRORLEVEL%
)
if errorlevel 1 (
  call "%BACKUP_BAT%"
  exit /b %ERRORLEVEL%
)

exit /b 0

:confirm_restore
echo.
echo [confirmacao] Esta acao sobrescreve os dados do banco atual.
set "CONFIRM_RESTORE="
set /p CONFIRM_RESTORE=Digite RESTAURAR para continuar: 
set "CONFIRM_RESTORE=%CONFIRM_RESTORE:\"=%"
for /f "tokens=* delims= " %%A in ("%CONFIRM_RESTORE%") do set "CONFIRM_RESTORE=%%A"
if /I not "%CONFIRM_RESTORE%"=="RESTAURAR" (
  echo [cancelado] Restore abortado pelo usuario.
  exit /b 1
)
exit /b 0
