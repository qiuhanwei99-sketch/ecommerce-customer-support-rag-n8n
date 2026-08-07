# 演示视频交付

已制作一版 16:9、1080p、约 86 秒的作品集演示视频，内容包括：

1. 片头：项目目标与技术栈。
2. n8n 成功执行的工作流运行画面。
3. Webhook → `/search` → Ollama → 分流的架构说明。
4. 有知识库依据的回答与引用来源。
5. 评测结果：20/20 通过、三类分流、零真实数据。
6. 环境变量权限错误和输入校验/转人工结果，展示排错与安全边界。

视频采用字幕/画面讲解，没有添加付费配音或音乐，适合直接放入 GitHub README、简历作品集或面试演示。

本地交付文件：`outputs/ecommerce-customer-support-rag-n8n-demo-v3.mp4`（最终公开仓库不提交大体积 MP4，可在 README 中放视频链接或 GIF 预览）。

ChatCut 可编辑项目：<https://app.chatcut.io/editor/f37b4933-9ddc-4120-b052-b04f37994e8e?chatcutLaunchClient=codex_app&chatcutLaunchSurface=ext_browser>

## 画面素材

- `docs/screenshots/n8n-success-workflow.png`：成功执行的工作流总览（视频主展示画面）。
- `docs/screenshots/n8n-success-response.png`：成功响应、引用来源与人工转接结果（视频主展示画面）。
- `docs/screenshots/n8n-workflow-overview.png`：早期工作流总览截图（保留作历史记录）。
- `docs/screenshots/n8n-grounded-response.png`：首次运行错误记录（仅用于展示排错过程，不作为成功结果）。
- `docs/screenshots/n8n-citations-result.png`：成功回答与引用来源（实际 n8n 输出）。
- `docs/screenshots/n8n-validation-handoff.png`：输入校验/转人工结果（实际 n8n 输出）。
- `docs/screenshots/n8n-env-error.png`：环境变量权限错误（实际 n8n 排错画面）。
- ChatCut 片头、架构卡、评测卡：用于把原始截图整理成作品集演示节奏。

如果要进一步增强真实性，下一版可以再补一张静态 Demo 页面截图；当前视频已经覆盖回答、引用、架构、评测、排错和转人工六类证据。
