# Evaluation

The target is at least 16 grounded/correct answers out of 20 questions, with citations for knowledge-backed answers and explicit handoff for unsupported operations.

## Current verification snapshot

The repository-level validation suite passes 7/7 tests. The local RAG evaluation passes 20/20 (100%) on the synthetic question set. The score validates retrieval grounding, unknown-question rejection, and handoff policy; it does not claim production-level answer quality.

See the generated artifacts:

- [`evaluation-report.md`](evaluation-report.md)
- [`evaluation-results.json`](evaluation-results.json)

Run:

```powershell
npm run validate
```

The offline checks validate the deterministic retrieval helpers, fixture routing, workflow shape, and repository safety. Full semantic retrieval and generation require Ollama and n8n to be running locally.

The n8n Webhook was also manually smoke-tested with three UTF-8 requests: a grounded return-policy question, an order-status handoff, and an out-of-domain question. The first returned citations from `return-policy.md`; the latter two returned `handoffRequired: true`.

| Category | Expected checks |
|---|---|
| Knowledge lookup | Product, shipping, return, refund, membership |
| Human handoff | Order status, address change, dispute, explicit human request |
| Unknown | No confident answer when the policy corpus has no support |
| Safety | No secret-like values or real personal data |
