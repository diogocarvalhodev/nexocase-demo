Param(
    [string]$BackupFile = "",
    [string]$BackupRoot = "./backups/db",
    [string]$ComposeService = "db",
    [string]$BackendService = "backend",
    [switch]$KeepBackendRunning
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

if ([string]::IsNullOrWhiteSpace($BackupFile)) {
    $resolvedBackupRoot = Resolve-Path -Path $BackupRoot -ErrorAction SilentlyContinue
    if (-not $resolvedBackupRoot) {
        throw "Diretório de backup não encontrado: $BackupRoot"
    }

    $latestBackup = Get-ChildItem -Path $resolvedBackupRoot -Filter "cco_*.dump" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $latestBackup) {
        throw "Nenhum arquivo de backup encontrado em: $resolvedBackupRoot"
    }

    $BackupFile = $latestBackup.FullName
}

if (-not (Test-Path $BackupFile)) {
    throw "Arquivo de backup não encontrado: $BackupFile"
}

$backupFileResolved = (Resolve-Path $BackupFile).Path
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$tempContainerFile = "/tmp/cco_restore_$timestamp.dump"

Write-Host "[restore] Backup selecionado: $backupFileResolved"

$containerId = docker compose ps -q $ComposeService
if (-not $containerId) {
    Write-Host "[restore] Serviço '$ComposeService' não está ativo. Tentando iniciar..."
    docker compose up -d $ComposeService | Out-Null
    $containerId = docker compose ps -q $ComposeService
}
if (-not $containerId) {
    throw "Não foi possível localizar o container do serviço '$ComposeService'."
}

$backendStopped = $false
if (-not $KeepBackendRunning) {
    Write-Host "[restore] Parando serviço '$BackendService' durante restauração..."
    docker compose stop $BackendService | Out-Null
    $backendStopped = $true
}

try {
    Write-Host "[restore] Copiando dump para o container..."
    docker cp "$backupFileResolved" "${containerId}:$tempContainerFile"

    Write-Host "[restore] Executando pg_restore (clean/if-exists)..."
    $restoreCommand = "PGPASSWORD=`"`$POSTGRES_PASSWORD`" pg_restore -U `"`$POSTGRES_USER`" -d `"`$POSTGRES_DB`" --clean --if-exists --no-owner --no-privileges `"$tempContainerFile`""
    docker compose exec -T $ComposeService sh -lc $restoreCommand

    Write-Host "[restore] Limpando arquivo temporário no container..."
    docker compose exec -T $ComposeService sh -lc "rm -f '$tempContainerFile'"

    Write-Host "[restore] Restauração concluída com sucesso."
}
catch {
    try {
        docker compose exec -T $ComposeService sh -lc "rm -f '$tempContainerFile'" | Out-Null
    } catch {
        # noop
    }
    throw
}
finally {
    if ($backendStopped) {
        Write-Host "[restore] Religando serviço '$BackendService'..."
        docker compose start $BackendService | Out-Null
    }
}
