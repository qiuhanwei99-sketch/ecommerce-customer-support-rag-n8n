$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $projectRoot

$env:npm_config_cache = Join-Path $projectRoot '.npm-cache-official'
$env:npm_config_registry = 'https://registry.npmjs.org'
$env:GYP_MSVS_VERSION = '2022'
$env:npm_config_msvs_version = '2022'
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false'
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
$env:CHAT_MODEL = 'qwen3:4b'

$npx = Get-Command npx.cmd -ErrorAction Stop
& $npx.Source --yes --no-audit --no-fund --package=n8n@2.33.5 n8n start
