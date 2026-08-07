# Local runbook

## 1. Start Ollama (optional until model validation)

Install Ollama separately if it is not installed, then pull the models:

```powershell
ollama pull qwen3:4b
ollama pull qwen3-embedding:0.6b
```

## 2. Start the RAG service

From the project root:

```powershell
$env:OLLAMA_BASE_URL='http://127.0.0.1:11434'
$env:EMBEDDING_MODEL='qwen3-embedding:0.6b'
$env:RAG_PORT='8787'
node services/rag-service/server.mjs
```

In another terminal, build the index:

```powershell
node services/rag-service/ingest.mjs
```

## 3. Start n8n

If n8n is not installed, use the official npm self-hosting route. On this Windows setup, keep npm's cache inside the project and use the public npm registry because the configured mirror may not serve native prebuilt packages correctly:

```powershell
$env:npm_config_cache = (Join-Path (Get-Location) '.npm-cache-official')
$env:npm_config_registry = 'https://registry.npmjs.org'
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE = 'false'
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11434'
$env:CHAT_MODEL = 'qwen3:4b'
npx.cmd --yes --no-audit --no-fund --package=n8n@2.33.5 n8n --version
npx.cmd --yes --no-audit --no-fund --package=n8n@2.33.5 n8n start
```

On some Windows PowerShell profiles, `npm` resolves to a blocked `npm.ps1`; use `npm.cmd`/`npx.cmd` for npm commands. Peer-dependency warnings during installation are not failures by themselves. Verify with the version command before starting n8n.

### Windows `node-gyp` troubleshooting

If the install ends with `gyp ERR! configure error`, `Could not find any Visual Studio installation to use`, and a path containing `sqlite3`, npm is trying to compile a native dependency. This is different from the peer-dependency warnings above.

Recommended low-cost recovery:

1. Confirm Visual Studio 2022 has the Desktop development with C++ workload, MSVC, and a Windows SDK. `vswhere.exe -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64` should return an installation path.
2. Use a writable npm cache and the public registry:

```powershell
$env:npm_config_cache = (Join-Path (Get-Location) '.npm-cache-official')
$env:npm_config_registry = 'https://registry.npmjs.org'
npx.cmd --yes --no-audit --no-fund --package=n8n@2.33.5 n8n --version
```

3. If native compilation is still required, install Node.js 22 LTS and retry in a new PowerShell window. This project does not require Node 24 specifically. The RAG service itself does not require Visual Studio.

Import `n8n/customer-support-rag.json` and `n8n/knowledge-ingest.json`. Keep the webhook bound to localhost for this portfolio project.

## 4. Test the webhook

For Chinese test messages, use Node's UTF-8 request script to avoid Windows PowerShell 5.1 body-encoding issues:

```powershell
node scripts/test-webhook.mjs
```

The equivalent PowerShell request must send UTF-8 bytes explicitly:

```powershell
$json = @{ sessionId = 'demo-session-001'; message = '退货需要满足什么条件？'; channel = 'local' } | ConvertTo-Json -Compress
Invoke-RestMethod `
  -Method Post `
  -Uri 'http://127.0.0.1:5678/webhook/customer-support' `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([Text.Encoding]::UTF8.GetBytes($json))
```

## 5. Static demo

Open `demo/index.html` directly or serve the project with any static server. It is fixture-backed and does not require n8n, Ollama, or network access.
