# Architecture

```mermaid
flowchart LR
  U[Public fixture demo] --> D[Prebuilt responses]
  L[Local browser chat] --> Pxy[Local Node proxy :4173]
  Pxy --> W[n8n Webhook]
  W --> V[Validate input]
  V --> S[Local RAG service /search]
  S --> I{Relevant chunks found?}
  I -->|No| H[Explain limits and hand off]
  I -->|Yes| P[Build grounded prompt]
  P --> O[Ollama qwen3:4b]
  O --> F[Format answer, intent, citations]
  H --> R[Respond to Webhook]
  F --> R
  K[Markdown knowledge files] --> G[Manual n8n ingest workflow]
  G --> E[Ollama qwen3-embedding:0.6b]
  E --> X[data/index.json]
  X --> S
```

## Responsibilities

- n8n owns orchestration, input validation, branching, model calls, response formatting, and human-handoff decisions.
- `services/rag-service` owns Markdown parsing, chunking, embeddings, cosine retrieval, and source metadata.
- Ollama owns local generation and embedding inference.
- `demo/` is a safe, offline portfolio surface backed by fixtures rather than a live webhook.
- `local-chat/` and `services/chat-ui/` provide the real local browser path; the proxy is loopback-only and forwards requests to n8n.

## Trust boundaries

The real webhook, RAG service, and Ollama endpoint are local-only by default. The public static demo never sends user messages to the local machine. All included support data is fictional.
