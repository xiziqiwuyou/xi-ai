# 完善 New API AI 模型接口文档站

## Goal

将现有的 New API AI 模型接口静态镜像升级为一套可检索、可理解、可直接准备调用的 API Reference：保留已完成的现代化三栏视觉和 Figma 设计约束，同时让路径、query、header、JSON、multipart、流式及二进制响应都能在页面中被准确配置、生成命令并进行浏览器端测试。

## Background and Confirmed Facts

- 当前产品是无构建依赖的 HTML、CSS、原生 JavaScript 静态站，入口为 `public/index.html`，运行数据为 `public/data/api-data.json`。
- `tools/generate-site.js` 从本地 `source-new-api-docs` 的 MDX、OpenAPI 和 sitemap 快照生成数据；生成脚本只刷新 JSON，不应覆盖已完成的视觉 shell。
- 当前数据覆盖 43/43 个 sitemap 端点、20 个分类：POST 28、GET 14、DELETE 1；请求体为 JSON 22、multipart 5、无请求体 16。
- 当前响应类型包含 JSON、`audio/mpeg`、`video/mp4` 和 WebSocket/101 场景；路径参数 16 个端点，query 参数 4 个端点，header 参数 5 个端点。
- 已有设计稿与 `DESIGN.md` 要求：主要大组件统一 16px 圆角，受控使用 Figma `exclusion` 混合视觉；文档内容区保持高对比和可扫描性；桌面三栏、移动端堆叠。
- 当前实现的调用实验室只编辑一段请求体，路径仍保留 `{model}` 等占位符，curl 仅有 Bash 版本，响应统一按文本读取。

## Requirements

### R1. 完整文档覆盖

保留并展示数据源中的全部 43 个端点及其现有字段：标题、分类、方法、路径、operationId、描述、来源路径、参数、请求体 schema/示例、所有响应状态、content type、schema 行和示例。生成后必须继续通过 sitemap 与本地源的 43/43 一致性校验。

### R2. 可编辑请求配置

- 为路径参数提供独立输入控件，并在 URL、curl 和浏览器请求中进行 URI 编码替换。
- 为 query 参数提供独立输入控件；空的可选 query 参数不应被拼入 URL，枚举参数应提供可选值提示。
- 为除 Authorization 外的数据 header 提供独立输入控件，并区分必填与可选；Authorization 使用 Token 配置生成，不能被重复添加。
- JSON 请求体继续支持完整 JSON 编辑、格式化/重置示例和 JSON 校验提示；请求体必须按实际 content type 发送。
- multipart 请求体按 schema 生成文本/枚举输入以及文件选择控件，使用 `FormData` 发送并在 curl 中生成 `-F`，不能手动设置 multipart boundary。
- GET、DELETE 和无请求体接口不得发送空 body 或错误的 `Content-Type`。

### R3. curl 与请求执行

- 提供 Bash 与 PowerShell 两种 curl 输出并可切换复制；命令必须反映当前 Base URL、路径/query/header 参数、Token、JSON 或 multipart 字段。
- 发送请求前校验必填路径、query、header、body 字段和文件；错误应在 Request Lab 内给出可操作提示。
- 浏览器请求使用当前编辑值，展示状态码、耗时、响应 content type 和响应头摘要；明确标注 CORS/网络失败与服务端错误。
- 提供取消进行中请求的入口，避免页面被长请求锁死。

### R4. 响应分流

- JSON 响应以格式化文本展示，并保留无法解析的原始文本。
- `text/event-stream` 或显式流式响应使用 `ReadableStream` 增量展示已收到的数据，并标注流式状态。
- 音频、视频及其他二进制响应显示媒体预览（浏览器支持时）、大小/类型信息和下载操作，不把二进制强制转成乱码文本。
- 101/WebSocket 类型不能伪装成普通 fetch 成功；显示该接口需要 WebSocket 客户端的明确说明，同时保留 curl/路径信息。

### R5. 视觉与可用性

- 延续现有 Figma 设计稿的 2026 风格：清晰的层级、克制的暖中性背景、青蓝操作色、紧凑代码面板和三栏工作台。
- 所有主要面板、卡片、工具栏和导航容器保持 16px 圆角；小型控件可使用较小圆角或胶囊形。
- `exclusion` 只用于页面 chrome/大面积环境层，不能降低表格、代码和表单文字可读性。
- 桌面、平板和 390px 左右移动宽度均无横向溢出、文字覆盖或控件被截断；键盘焦点可见，表单控件有可读 label，并尊重 `prefers-reduced-motion`。

### R6. 数据生成与可维护性

- 在生成层补充参数默认值、schema 字段元数据、文件格式及响应类别等运行时所需信息；不通过前端猜测丢失的 OpenAPI 事实。
- 保持静态部署兼容，不引入必须联网才能查看文档的运行时依赖；浏览器直连测试受 CORS 限制时给出明确提示，curl 仍可独立使用。

## Acceptance Criteria

- [x] `node tools/generate-site.js` 成功运行，输出 `sitemapCount=43`、`endpointCount=43`、`missingFromSource=[]`、`extraSource=[]`。
- [x] `node --check public/assets/app.js` 通过；页面加载 `public/data/api-data.json` 后能显示 43 个端点且筛选、搜索、切换分类和方法正常。
- [x] 至少验证一个带 `{model}` 的路径、一个带 query 的 GET、一个带自定义 header 的接口：编辑值后 URL、Bash/PowerShell curl 和 fetch 请求三者一致。
- [x] 至少验证 JSON、无 body、multipart（含文件选择）三种请求形态；GET/DELETE 不带 body，multipart 不手工设置 boundary。
- [x] 至少验证 JSON、SSE/流式、音频或视频、101 四类响应展示分支；失败请求显示可读错误和 CORS 说明。
- [x] Base URL、Token、curl 模式和编辑值在切换端点时行为稳定；Token 不出现在文档正文或错误日志中。
- [x] 在桌面和 390px 移动视口完成截图检查，主要面板为 16px 圆角且没有明显重叠、溢出或低对比文本；Figma 对应页面节点保留同步说明。
- [x] 任务工件、实际变更文件、验证结果和剩余风险记录完整；未运行的外部真实 API 调用不声称为已验证。

## Out of Scope

- 不重写 New API 服务端、不提供服务端代理或绕过目标服务 CORS；后续可单独增加代理任务。
- 不改变本地 OpenAPI/MDX 的原始内容，不为了视觉调整删减端点或 schema。
- 不把静态站改造成 React/Next 等需要构建的框架；不引入在线代码执行服务。
- 不自动保存或提交用户真实 Token 到仓库。

## Risks and Deferred Items

- 目标站点当前在线请求曾返回 404，因此以本地源快照为事实基线；页面中继续显示来源与生成时间。
- 不同 API 服务对 CORS、SSE、WebSocket 和二进制下载的支持不同；本地 mock/fixture 只能验证前端分支，真实服务验证留在用户配置真实 Base URL 后进行。
