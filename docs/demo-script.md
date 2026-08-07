# Portfolio demo script

## 2-minute recording script

1. **开场（15 秒）**：说明这是一个完全本地运行的虚构电商客服机器人，目标是让回答有依据、让高风险操作转人工。
2. **静态 Demo（25 秒）**：打开 `demo/index.html`，输入“退货需要满足什么条件？”，展示回答和 `return-policy.md` 引用。
3. **n8n 工作流（25 秒）**：展示路径 `Webhook → Validate Input → Search Knowledge → Relevant? → Ollama → Format Answer`。
4. **知识库回答（20 秒）**：在 n8n 中展示 `return_policy`、引用数组和 `handoffRequired: false`。
5. **人工转接（20 秒）**：输入“请帮我查询订单现在到哪里了？”，展示 `order_service` 和 `handoffRequired: true`。
6. **未知问题（15 秒）**：输入“你们卖汽车保险吗？”，展示机器人不猜测并转人工。
7. **资料更新（15 秒）**：打开独立的 `knowledge-ingest.json` 工作流，说明 Markdown 资料更新后可以重新建立索引。
8. **结果收尾（25 秒）**：打开 [`evaluation-report.md`](evaluation-report.md)，展示 20/20 评测结果，并说明公开 Demo 是 fixture-backed，真实实现是本地 n8n + RAG + Ollama。

## Recommended screenshots

- n8n 客服工作流全貌。
- `Respond to Webhook` 节点中的正常回答、`return_policy` 和 citations。
- 订单查询的 `handoffRequired: true`。
- 静态 Demo 对话界面。
- 20/20 评测报告。
