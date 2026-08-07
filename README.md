# 星河集市客服助手：n8n + RAG + Ollama

一个面向作品集的电商客服机器人模拟项目。它用 n8n 编排请求流程，用本地 RAG 服务从合成客服资料中检索内容，再由 Ollama 本地模型生成带来源的回答。

> 这是学习和演示项目。店铺、商品、政策、订单和客户均为虚构内容，不连接真实订单、支付、物流或客服系统。

## 作品亮点

- n8n Webhook → 输入校验 → RAG 检索 → 相关性判断 → Ollama → 引用格式化 → 人工转接。
- Markdown 知识库可以重新导入，生成带来源和更新时间的本地索引。
- 对订单状态、地址修改、争议退款、账户安全和未知问题采取人工转接或拒绝猜测。
- GitHub Pages 可部署的离线 Demo，不调用本机服务，不包含任何秘密。
- 20 条评测问题、自动化检查和可复现的演示脚本。

评测结果：RAG 检索和安全转人工规则 **20/20 通过（100%）**，详见 [`docs/evaluation-report.md`](docs/evaluation-report.md) 和机器可读的 [`docs/evaluation-results.json`](docs/evaluation-results.json)。另外，n8n Webhook 已完成正常回答、转人工和未知问题三条人工冒烟测试。

## 架构

详见 [`docs/architecture.md`](docs/architecture.md)，也可以直接展示 [工作流预览图](docs/workflow-preview.svg)。

```text
客户问题
  ↓
n8n Webhook
  ↓
本地 RAG 服务 /search  ←  data/knowledge/*.md + Ollama Embedding
  ↓
达到阈值？ ── 否 → 说明知识库不足并转人工
  ↓ 是
Ollama qwen3:4b
  ↓
答案 + intent + citations + handoffRequired
```

## 目录

```text
data/knowledge/                 合成客服知识库
data/eval/questions.json        20 条评测问题
services/rag-service/           Node 内置模块实现的本地检索服务
n8n/                            可导入的 n8n 工作流 JSON
demo/                           GitHub Pages 静态演示页面
docs/                           架构、演示脚本、评测和运行手册
tests/                          离线单元测试
```

作品集案例说明见 [`docs/portfolio-case-study.md`](docs/portfolio-case-study.md)，发布前清单见 [`docs/portfolio-checklist.md`](docs/portfolio-checklist.md)，演示视频交付说明见 [`docs/video-delivery.md`](docs/video-delivery.md)。

## 本地运行

### 1. 安装并准备 Ollama

如果本机没有 Ollama，需要先按官方方式安装。然后下载默认模型：

```powershell
ollama pull qwen3:4b
ollama pull qwen3-embedding:0.6b
```

默认配置位于 [`.env.example`](.env.example)。项目不会自动安装软件或下载模型。

### 2. 启动 RAG 服务并建立索引

```powershell
$env:OLLAMA_BASE_URL='http://127.0.0.1:11434'
$env:EMBEDDING_MODEL='qwen3-embedding:0.6b'
$env:RAG_PORT='8787'
node services/rag-service/server.mjs
```

在另一个终端运行：

```powershell
node services/rag-service/ingest.mjs
```

成功后会生成被 `.gitignore` 忽略的 `data/index.json`。检查服务：

```powershell
Invoke-RestMethod http://127.0.0.1:8787/health
```

### 3. 启动 n8n

当前项目不依赖 Docker。Windows 上建议使用项目内缓存和官方 npm 源，通过 npx 启动，避免全局安装权限和原生依赖镜像问题：

```powershell
$env:npm_config_cache=(Join-Path (Get-Location) '.npm-cache-official')
$env:npm_config_registry='https://registry.npmjs.org'
$env:N8N_BLOCK_ENV_ACCESS_IN_NODE='false'
$env:OLLAMA_BASE_URL='http://127.0.0.1:11434'
$env:CHAT_MODEL='qwen3:4b'
npx.cmd --yes --no-audit --no-fund --package=n8n@2.33.5 n8n start
```

在 n8n 中分别创建两个工作流并导入：

- [`n8n/customer-support-rag.json`](n8n/customer-support-rag.json)
- [`n8n/knowledge-ingest.json`](n8n/knowledge-ingest.json)

建议先手动运行 `knowledge-ingest.json`，再调用 `customer-support-rag.json`。默认 Webhook 只绑定本机，不要直接暴露到公网。Windows PowerShell 测试中文请求时，使用 [`scripts/test-webhook.mjs`](scripts/test-webhook.mjs) 发送 UTF-8 请求：

```powershell
node scripts/test-webhook.mjs return
node scripts/test-webhook.mjs handoff
node scripts/test-webhook.mjs unknown
```

调用示例：

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri 'http://127.0.0.1:5678/webhook/customer-support' `
  -ContentType 'application/json' `
  -Body '{"sessionId":"demo-session-001","message":"退货需要满足什么条件？","channel":"local"}'
```

### 4. 打开公开 Demo

在线地址：[`GitHub Pages Demo`](https://qiuhanwei99-sketch.github.io/ecommerce-customer-support-rag-n8n/)。如果部署尚未完成，也可以直接打开 [`demo/index.html`](demo/index.html)，或用任意静态服务器托管 `demo/` 目录。该 Demo 使用预置回答，访客不需要安装 n8n、Ollama，也不会访问你的本机服务。

## API 契约

客服 Webhook 接收：

```json
{
  "sessionId": "demo-session-001",
  "message": "退货需要满足什么条件？",
  "channel": "local"
}
```

响应示例：

```json
{
  "answer": "签收商品后 7 天内可以申请无理由退货……",
  "intent": "return_policy",
  "citations": [
    {"source":"return-policy.md","section":"退货条件","chunkId":"return-policy-02"}
  ],
  "handoffRequired": false,
  "handoffReason": null
}
```

RAG 服务接口：

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/health` | 检查 Ollama 和索引状态 |
| POST | `/ingest` | 重新读取 Markdown 并生成向量索引 |
| POST | `/search` | 返回达到相似度阈值的来源片段 |

## 验证

离线检查不需要 Ollama 或 n8n：

```powershell
npm run validate
```

它会执行 JavaScript 语法检查、单元测试、工作流 JSON 检查、评测数据检查和秘密扫描。完整语义检索与模型生成需要本地启动 Ollama 和 n8n。

运行本地 RAG 评测：

```powershell
npm run evaluate
```

它会生成 `docs/evaluation-results.json` 和 `docs/evaluation-report.md`。知识库未覆盖的问题必须明确说明限制或转人工。

## 发布到 GitHub / 作品集

1. 只提交本仓库源码、合成数据、工作流导出、截图和文档。
2. 不提交 `.env`、`data/index.json`、`.n8n/`、模型文件、执行日志和任何 n8n 凭据。
3. 通过 `.github/workflows/pages.yml` 在 GitHub Pages 发布 `demo/` 目录，README 同时链接在线 Demo。
4. 作品集描述建议强调：RAG 检索、来源引用、人工转接、隐私边界和可替换模型接口。
5. 演示脚本见 [`docs/demo-script.md`](docs/demo-script.md)；已完成一版可直接放入作品集的 MP4，交付说明见 [`docs/video-delivery.md`](docs/video-delivery.md)。

## 已知限制

- 默认只支持 Markdown 文档；复杂 PDF/OCR 可作为后续迭代。
- 本地索引使用 JSON 文件，适合小型作品集数据，不适合生产级高并发。
- 订单、物流、支付和退款没有真实系统连接，只演示安全的转人工分支。
- 本地模型质量和速度取决于电脑硬件。
- 公开 Demo 是 fixture-backed 模拟体验，不等同于公网生产客服。

## 免责声明

所有商店政策和回答仅用于软件工程演示，不构成真实购物、退款或法律承诺。
