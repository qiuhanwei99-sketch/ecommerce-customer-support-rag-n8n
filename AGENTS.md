# AGENTS.md

## Mission
Deliver a small, reproducible, portfolio-ready e-commerce customer-support demo using n8n orchestration, local RAG retrieval, and an optional local language model.

## Instruction Priority
1. The user's current request and acceptance criteria
2. This project instruction file
3. Project documentation, manifests, tests, and CI
4. Existing code conventions

## Start Protocol
Before editing code:
1. Restate the goal in one sentence.
2. List acceptance criteria as checkboxes.
3. Inspect the project root, instruction files, manifests, workflows, and tests.
4. State assumptions, unknowns, and meaningful tradeoffs.
5. Use the smallest MVP that proves the RAG customer-support flow.
6. Establish a baseline with the smallest relevant check.

## Project Boundaries
- Use only synthetic shop, order, and customer data.
- Never commit API keys, tokens, cookies, n8n credentials, local model files, or real customer records.
- The public demo must use fixtures and must not call a local webhook or expose a credential.
- The real n8n and Ollama flow is local-first and may be replaced by compatible model APIs later.
- Do not connect to real payment, order, logistics, CRM, or messaging systems in this MVP.

## Change Discipline
- Prefer small, atomic, reversible changes.
- Do not add runtime dependencies unless they are necessary and documented.
- Do not install system software, download models, expose a network endpoint, or create a remote repository without recording the action and its risk.
- Keep workflow exports credential-free and importable.

## Verification Contract
- Run JavaScript syntax checks for every changed `.mjs` and `.js` file.
- Run unit tests for chunking, cosine similarity, validation, and fixture behavior.
- Validate workflow JSON and scan the repository for secret-like values.
- If Ollama is unavailable, report the limitation; offline tests and the static demo must still work.
- Record verified, repository-specific lessons in `docs/agent/lessons.md`.

## Definition of Done
- The local RAG service exposes `/health`, `/ingest`, and `/search`.
- Synthetic knowledge files and at least 20 evaluation questions exist.
- The n8n customer-support and ingestion workflows are exported without credentials.
- The static demo works without n8n or Ollama.
- README documents setup, architecture, limitations, evaluation, and publishing safety.
- Relevant checks pass and exact commands/results are reported.

## Final Report
Report the outcome, changed files, key decisions, commands, verification results, remaining risks, and rollback instructions.
