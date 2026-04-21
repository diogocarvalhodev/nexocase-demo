Param(
    [string]$TaskName = "CCO-DB-Backup-Diario",
    [string]$Time = "02:00",
    [string]$BackupRoot = "C:\\Backups\\CCO\\db",
    [int]$RetentionDays = 30,
    [switch]$RunNow
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$backupScript = Join-Path $PSScriptRoot "backup_db.ps1"

if (-not (Test-Path $backupScript)) {
    throw "Script de backup não encontrado: $backupScript"
}

if (-not (Test-Path $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
}

$escapedBackupScript = $backupScript.Replace('"', '""')
$escapedBackupRoot = $BackupRoot.Replace('"', '""')

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$escapedBackupScript`" -BackupRoot `"$escapedBackupRoot`" -RetentionDays $RetentionDays"

schtasks /Create /SC DAILY /TN "$TaskName" /TR "$taskCommand" /ST $Time /RL HIGHEST /F | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Falha ao criar tarefa agendada. Execute o PowerShell como Administrador e tente novamente."
}

Write-Host "[task] Tarefa criada/atualizada com sucesso."
Write-Host "[task] Nome: $TaskName"
Write-Host "[task] Horário diário: $Time"
Write-Host "[task] Destino de backup: $BackupRoot"
Write-Host "[task] Retenção (dias): $RetentionDays"

if ($RunNow) {
    schtasks /Run /TN "$TaskName" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Tarefa criada, mas falhou ao iniciar execução manual. Verifique permissões no Agendador de Tarefas."
    }
    Write-Host "[task] Execução manual disparada agora."
}

Write-Host "[task] Para remover: schtasks /Delete /TN `"$TaskName`" /F"
