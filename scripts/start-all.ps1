#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$RebuildIndex
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

$ollamaBaseUrl = if ($env:OLLAMA_BASE_URL) { $env:OLLAMA_BASE_URL.TrimEnd('/') } else { 'http://127.0.0.1:11434' }
$chatModel = if ($env:CHAT_MODEL) { $env:CHAT_MODEL } else { 'qwen3:4b' }
$embeddingModel = if ($env:EMBEDDING_MODEL) { $env:EMBEDDING_MODEL } else { 'qwen3-embedding:0.6b' }
$ragPort = if ($env:RAG_PORT) { [int]$env:RAG_PORT } else { 8787 }
$n8nPort = 5678
$chatUiPort = if ($env:CHAT_UI_PORT) { [int]$env:CHAT_UI_PORT } else { 4173 }

function Stop-WithMessage([string]$message) {
    Write-Host "[ERROR] $message" -ForegroundColor Red
    exit 1
}

function Resolve-Executable([string]$name) {
    try {
        return (Get-Command $name -ErrorAction Stop).Source
    } catch {
        return $null
    }
}

function Test-ListeningPort([int]$port) {
    $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
    return $null -ne $connection
}

function Wait-ForPort([int]$port, [int]$timeoutSeconds) {
    for ($second = 0; $second -lt $timeoutSeconds; $second += 1) {
        if (Test-ListeningPort $port) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

Write-Host '=== Ecommerce customer-support local stack ===' -ForegroundColor Cyan
Write-Host "Project: $projectRoot"

$node = Resolve-Executable 'node.exe'
$npx = Resolve-Executable 'npx.cmd'
$ollama = Resolve-Executable 'ollama.exe'
if (-not $node) { Stop-WithMessage 'Node.js was not found. Install Node.js 20+ first.' }
if (-not $npx) { Stop-WithMessage 'npx.cmd was not found. Check the Node.js installation.' }
if (-not $ollama) { Stop-WithMessage 'Ollama was not found. Install Ollama and restart this script.' }

$env:OLLAMA_BASE_URL = $ollamaBaseUrl
$env:CHAT_MODEL = $chatModel
$env:EMBEDDING_MODEL = $embeddingModel
$env:RAG_PORT = [string]$ragPort
$env:CHAT_UI_PORT = [string]$chatUiPort
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false'

$ollamaHealthy = $false
try {
    Invoke-RestMethod -Uri "$ollamaBaseUrl/api/version" -TimeoutSec 3 | Out-Null
    $ollamaHealthy = $true
} catch {
    Write-Host 'Ollama is not responding. Starting ollama serve in the background...' -ForegroundColor Yellow
    Start-Process -FilePath $ollama -ArgumentList @('serve') -WindowStyle Hidden | Out-Null
    for ($second = 0; $second -lt 20; $second += 1) {
        Start-Sleep -Seconds 1
        try {
            Invoke-RestMethod -Uri "$ollamaBaseUrl/api/version" -TimeoutSec 3 | Out-Null
            $ollamaHealthy = $true
            break
        } catch { }
    }
}
if (-not $ollamaHealthy) {
    Stop-WithMessage "Ollama is unavailable at $ollamaBaseUrl. Start Ollama and try again."
}
Write-Host "Ollama is ready: $ollamaBaseUrl" -ForegroundColor Green

$models = (& $ollama list 2>&1 | Out-String)
if ($LASTEXITCODE -ne 0) {
    Stop-WithMessage "Could not read the Ollama model list. Run 'ollama list' to inspect the problem."
}
foreach ($model in @($chatModel, $embeddingModel)) {
    if ($models -notmatch [regex]::Escape($model)) {
        Stop-WithMessage "Required model '$model' is missing. Run: ollama pull $model"
    }
}
Write-Host "Models ready: $chatModel + $embeddingModel" -ForegroundColor Green

$indexPath = Join-Path $projectRoot 'data\index.json'
if ($RebuildIndex -or -not (Test-Path -LiteralPath $indexPath)) {
    if ($RebuildIndex) {
        Write-Host 'Rebuilding the local RAG index...' -ForegroundColor Yellow
    } else {
        Write-Host 'No local index found. Building it now...' -ForegroundColor Yellow
    }
    & $node 'services/rag-service/ingest.mjs'
    if ($LASTEXITCODE -ne 0) {
        Stop-WithMessage 'RAG ingestion failed. Check the Ollama model and the terminal output above.'
    }
} else {
    Write-Host 'Using existing data/index.json. Use -RebuildIndex after knowledge-base changes.'
}

if (Test-ListeningPort $ragPort) {
    Write-Host "RAG service already listens on http://127.0.0.1:$ragPort" -ForegroundColor Yellow
} else {
    $ragProcess = Start-Process -FilePath $node `
        -ArgumentList @('services/rag-service/server.mjs') `
        -WorkingDirectory $projectRoot `
        -WindowStyle Normal `
        -PassThru
    if (-not (Wait-ForPort $ragPort 20)) {
        if ($ragProcess.HasExited) {
            Stop-WithMessage "RAG service exited immediately (process $($ragProcess.Id))."
        }
        Stop-WithMessage "RAG service did not open port $ragPort within 20 seconds."
    }
    Write-Host "RAG service started (process $($ragProcess.Id))." -ForegroundColor Green
}

if (Test-ListeningPort $n8nPort) {
    Write-Host "n8n already listens on http://127.0.0.1:$n8nPort" -ForegroundColor Yellow
} else {
    $n8nScript = Join-Path $projectRoot 'scripts\start-n8n.ps1'
    $windowsPowerShell = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $n8nProcess = Start-Process -FilePath $windowsPowerShell `
        -ArgumentList @('-NoExit', '-ExecutionPolicy', 'Bypass', '-File', $n8nScript) `
        -WorkingDirectory $projectRoot `
        -WindowStyle Normal `
        -PassThru
    if (-not (Wait-ForPort $n8nPort 60)) {
        if ($n8nProcess.HasExited) {
            Stop-WithMessage "n8n exited immediately (process $($n8nProcess.Id)). Check the n8n window."
        }
        Write-Host "n8n is still starting. Check the n8n window at http://127.0.0.1:$n8nPort" -ForegroundColor Yellow
    } else {
        Write-Host "n8n started (process $($n8nProcess.Id))." -ForegroundColor Green
    }
}

if (Test-ListeningPort $chatUiPort) {
    Write-Host "Local chat UI already listens on http://127.0.0.1:$chatUiPort" -ForegroundColor Yellow
} else {
    $chatUiProcess = Start-Process -FilePath $node `
        -ArgumentList @('services/chat-ui/server.mjs') `
        -WorkingDirectory $projectRoot `
        -WindowStyle Normal `
        -PassThru
    if (-not (Wait-ForPort $chatUiPort 20)) {
        if ($chatUiProcess.HasExited) {
            Stop-WithMessage "Local chat UI exited immediately (process $($chatUiProcess.Id))."
        }
        Stop-WithMessage "Local chat UI did not open port $chatUiPort within 20 seconds."
    }
    Write-Host "Local chat UI started (process $($chatUiProcess.Id))." -ForegroundColor Green
}

Write-Host ''
Write-Host 'Local stack is ready.' -ForegroundColor Green
Write-Host "n8n editor: http://127.0.0.1:$n8nPort"
Write-Host "RAG health:  http://127.0.0.1:$ragPort/health"
Write-Host "Chat UI:     http://127.0.0.1:$chatUiPort"
Start-Process "http://127.0.0.1:$chatUiPort" | Out-Null
Write-Host 'Use the opened service windows to view logs. Close those windows to stop RAG, n8n and the chat UI.'
