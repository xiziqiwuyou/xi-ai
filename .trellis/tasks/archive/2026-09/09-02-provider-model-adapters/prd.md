# P0-P1 Provider and Model Adapters

## Goal

把现有静态 NewAPI 文档镜像升级为面向 `api.xi-ai.cn` 的 provider-aware API 工作台，完整覆盖 OpenAI/ChatGPT、Google Gemini 和 Anthropic Claude 的常用模型目录、原生协议请求、鉴权方式、cURL 在线测试和统一响应调试，同时保留现有 43 个 NewAPI 源端点的文档事实与 sitemap 覆盖。

## Requirements

### P0: Provider and protocol contract

- 建立单一 provider registry，至少包含 `openai`、`gemini`、`claude` 三个 provider、显示名、协议、默认 Base URL、认证 profile、模型种子、能力标签和验证状态。
- 为每个 provider 建立可执行 operation 定义：
  - OpenAI/ChatGPT: `GET /v1/models`、`POST /v1/chat/completions`、`POST /v1/responses`、兼容 `POST /v1/completions`。
  - Gemini: `GET /v1beta/models`、`POST /v1beta/models/{model}:generateContent`、流式 `POST /v1beta/models/{model}:streamGenerateContent?alt=sse`。
  - Claude: `GET /v1/models` 的 Claude 头格式、`POST /v1/messages`。
- 认证 profile 必须明确 header/query 注入规则：Bearer、Gemini `x-goog-api-key`/`key`、Claude `x-api-key` + `anthropic-version`；不得重复注入 `Authorization`、API key 或 multipart boundary。
- 现有 43 个源端点继续由 MDX/OpenAPI/sitemap 生成；provider 元数据在生成层 enrichment，前端不猜测 OpenAPI 事实。
- 所有模型种子必须标记 `source`（`manual`、`fixture` 或 `upstream`）和 `verification`（至少 `unverified`/`verified`），未真实请求不得显示为线上可用。

### P1: Product workflow and request lab

- 页面增加 provider、协议 operation 和模型选择工作流；选择 operation 后可载入对应文档端点或协议变体到 Request Lab。
- 模型选择应能同步到 JSON `model` 字段或 URL `{model}` 路径；切换端点时不得遗留其他端点的 path/query/header/body/file 状态。
- Request Lab 支持按认证 profile 生成真实请求，保留 Bash/PowerShell cURL，且增加可复制的 JavaScript `fetch` 与 Python `requests` 示例。
- OpenAI chat/responses、Gemini generate/stream、Claude messages 使用各自原生 payload 形状；stream 开关必须使请求体、Gemini `alt=sse` 查询和响应分流保持一致。
- 模型同步使用当前 Base URL 和当前认证 profile 发起预览请求；同步结果只在用户明确应用时进入当前会话，不自动写入仓库或 localStorage。CORS、401、429、网络失败要在页面显示可操作原因。
- 响应调试统一展示：状态码、状态文本、耗时、content type、响应头摘要、原始文本/JSON、流式增量文本、usage、finish reason、标准化文本和错误摘要。必须保留 provider 原生响应，不把错误响应丢弃。
- Token/API key 只能在密码输入和脱敏调试信息中出现，不能进入页面正文、localStorage 以外的生成文件、日志或错误文本。

## Constraints

- 保持无构建依赖的 HTML/CSS/原生 JavaScript 静态部署；不引入服务端代理、不绕过 CORS、不在前端保存真实密钥。
- 不复制 NewAPI/Apifox 源码、品牌资源、Logo、截图或受限文案；只复用公开协议结构和本地快照中的接口事实。
- 不修改 `source-new-api-docs` 原始 MDX/OpenAPI 内容；生成的 `public/data/api-data.json` 必须可重建。
- 既有非目标端点（图像、音频、视频、文件、微调、WebSocket 等）保持可浏览和原有请求测试行为；本任务不扩展 Realtime/WebSocket 实际连接。

## Acceptance Criteria

- [x] 生成数据包含 provider registry、至少三种认证 profile、三组模型种子和 provider-operation 到现有端点的绑定；原始覆盖仍为 `sitemapCount=43`、`endpointCount=43`、无 missing/extra。
- [x] 页面能按 provider/协议/方法筛选，显示 OpenAI、Gemini、Claude 的 operation 和模型状态；模型选择能更新相关路径或 JSON 字段。
- [x] 同一个请求状态能生成一致的 URL、headers、JSON/multipart body、Bash cURL、PowerShell cURL、JavaScript fetch 和 Python requests；Bearer、Gemini、Claude 认证分别通过序列化测试。
- [x] OpenAI chat/responses、Gemini native/stream、Claude messages 的 fixture 请求均能在本地 mock 中验证路径、query、headers、body 和流式标记。
- [x] 模型同步预览成功、401/429、CORS/网络失败均有可读状态，且未明确应用前不改变本地模型目录。
- [x] JSON、SSE、二进制、WebSocket/101 和非 JSON 错误响应均保留原始内容并生成 canonical debug result；usage、finish reason 和文本聚合在可识别时显示。
- [x] `node --check`、数据契约、序列化和 Playwright 浏览器回归通过；桌面与 390px 视口无页面级横向溢出、控制台错误为 0。
- [x] 文档、测试、任务工件记录真实验证边界；没有真实 Base URL/token 时不声称上游模型已验证。

## Out of Scope

- 服务端 API 网关、密钥托管、RBAC/SSO、计费、团队协作和在线代理。
- OpenAI Realtime/WebSocket、Anthropic streaming transport 之外的专用传输、视频/文件/微调扩展协议。
- 自动抓取或承诺当前供应商的完整线上模型列表；只提供可审计的手工种子和用户触发的同步预览。
