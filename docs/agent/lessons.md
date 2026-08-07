# Project lessons

Record only repository-specific lessons that were verified by a passing command or test.

| Date | Symptom | Root cause | Minimal fix | Verification | Prevention |
|---|---|---|---|---|---|
| 2026-08-07 | Ollama health endpoint responded but ingestion failed | Ollama service was running with an empty model list | Check `/api/tags` before indexing and return a clear 503 when the embedding model is missing | `curl.exe http://127.0.0.1:11434/api/tags`; POST `/ingest` returned the missing-model error | Keep model download explicit and run the health check before ingest |
| 2026-08-07 | n8n install reported `node-gyp`/`sqlite3` failure after C++ workload was selected | Visual Studio was installed correctly, but npm used a restricted cache and a mirror that did not reliably provide the sqlite3 prebuilt binary | Use a project-local npm cache plus `https://registry.npmjs.org`; run n8n through npx | `sqlite3@5.1.7` installed successfully and `n8n --version` returned `2.33.5` | Keep registry/cache troubleshooting separate from Visual Studio troubleshooting |
| 2026-08-07 | RAG search succeeded but Ollama node returned `access to env vars denied` | n8n blocks `$env` access inside nodes by default | Start the local n8n process with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` | Re-run the webhook after restart and verify the Ollama node completes | Keep n8n bound to localhost and never put secrets in workflow JSON |
