# 作品集发布清单

## GitHub 仓库应提交

- `README.md`
- `AGENTS.md`、`CLAUDE.md`
- `services/rag-service/`
- `n8n/customer-support-rag.json`
- `n8n/knowledge-ingest.json`
- `data/knowledge/` 和 `data/eval/questions.json`
- `demo/`
- `docs/architecture.md`
- `docs/workflow-preview.svg`
- `docs/evaluation-report.md` 和 `docs/evaluation-results.json`
- `docs/portfolio-case-study.md`
- `docs/demo-script.md`
- `docs/screenshots/`

## 不应提交

- `.env`、API Key、Token、Cookie
- `data/index.json`
- `.n8n/`、执行数据库和本地凭据
- Ollama 模型文件
- npm 缓存和安装日志
- 真实客户数据或真实订单记录

## 建议截图

1. n8n 客服工作流全貌。
2. n8n 正常回答节点，显示 `return_policy` 和来源引用。
3. n8n 转人工节点，显示 `handoffRequired: true`。
4. 静态 Demo 首页和一轮对话。
5. `docs/evaluation-report.md` 的 20/20 结果。

## 发布前检查

```powershell
npm run validate
node scripts/evaluate-rag.mjs
```

确认 README 中补充 GitHub 仓库地址和 GitHub Pages 地址后，再推送公开仓库。
