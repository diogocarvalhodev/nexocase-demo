Param(
    [string]$BackupRoot = "./backups/db",
    [int]$RetentionDays = 30,
    [string]$ComposeService = "db"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupDir = Resolve-Path -Path $BackupRoot -ErrorAction SilentlyContinue
if (-not $backupDir) {
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
    $backupDir = Resolve-Path -Path $BackupRoot
}

$backupFile = Join-Path $backupDir ("cco_{0}.dump" -f $timestamp)
$tempContainerFile = "/tmp/cco_backup_$timestamp.dump"

Write-Host "[backup] Iniciando backup PostgreSQL..."

$containerId = docker compose ps -q $ComposeService
if (-not $containerId) {
    throw "Serviço '$ComposeService' não encontrado. Verifique se o Docker Compose está em execução."
}

$dumpCommand = "PGPASSWORD=`"`$POSTGRES_PASSWORD`" pg_dump -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" -Fc -f `"$tempContainerFile`""
docker compose exec -T $ComposeService sh -lc $dumpCommand

Write-Host "[backup] Copiando arquivo para o host: $backupFile"
docker cp "${containerId}:$tempContainerFile" "$backupFile"
docker compose exec -T $ComposeService sh -lc "rm -f '$tempContainerFile'"

if (-not (Test-Path $backupFile)) {
    throw "Falha ao criar backup em $backupFile"
}

$fileInfo = Get-Item $backupFile
if ($fileInfo.Length -le 0) {
    throw "Arquivo de backup vazio: $backupFile"
}

Write-Host ("[backup] Concluído com sucesso: {0} ({1} bytes)" -f $backupFile, $fileInfo.Length)

if ($RetentionDays -gt 0) {
    $threshold = (Get-Date).AddDays(-$RetentionDays)
    $removed = Get-ChildItem -Path $backupDir -Filter "cco_*.dump" -File |
        Where-Object { $_.LastWriteTime -lt $threshold }

    foreach ($file in $removed) {
        Remove-Item -Path $file.FullName -Force
    }

    Write-Host ("[backup] Retenção aplicada: {0} arquivo(s) removido(s)." -f $removed.Count)
}
