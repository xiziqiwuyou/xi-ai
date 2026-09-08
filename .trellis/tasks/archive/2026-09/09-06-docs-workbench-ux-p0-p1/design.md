# Technical Design

## Architecture Boundary

本任务维持静态站点架构。事实源仍由 `source-new-api-docs`、sitemap 和 OpenAPI 生成 43 个 endpoint；Provider registry 和生成器负责附加运行时元数据；浏览器层只管理选择、编辑、显示与请求执行。部署新增独立 Nginx 容器，但不增加 API 代理。

```text
read-only sources + provider registry
                 |
          generate-site.js
                 |
      api-data.json (43 docs)
                 |
    app.js state + request-utils.js
       |                 |
 endpoint/deep link    one request plan
       |                 |
 responsive UI      curl/js/python/fetch/debug

public/ -> nginx container -> docs.xi-ai.cn
```

## Generated Metadata

`tools/generate-site.js` 为每个 endpoint 增加以下可重建字段：

- `documentationOnly`: 当分类或标题明确包含“未实现”，或声明响应只有 501 时为 `true`。
- `routeKey`: 标准化后的 `${METHOD} ${PATH}`，只用于 UI 变体识别，不替代 endpoint id。
- `routeVariantIds`: 与该 endpoint 共享 `routeKey` 的所有源 endpoint id。

`coverage.endpointCount` 和 `coverage.sitemapCount` 继续表示源文档数量，不能被 route 分组改变。

## UI State and Transitions

### Initial endpoint and deep link

初始化优先读取 `#endpoint=<encoded id>`；合法时选择该 endpoint，否则选择 `createchatcompletion`，最后才回退到首个源 endpoint。每次用户切换 endpoint 或协议模板后使用 `history.replaceState` 更新 hash。hash 只保存 endpoint id。

### Operation selection

`handleOperationSelection` 成为单一 transition owner：

1. 无值时恢复当前 endpoint 的兼容请求状态。
2. Operation 绑定当前 endpoint 时在原地重建该 endpoint 的请求状态。
3. Operation 绑定其他 endpoint 时调用 `loadOperation`，在同一事件中更新筛选、active endpoint、request state、URL hash 和视图。

移除 `openOperation` 二次动作。对于没有绑定 operation 的 endpoint，下拉首项显示“当前接口：兼容协议”，其余项作为快速切换模板。

### Documentation-only endpoints

`isEndpointRunnable(endpoint)` 统一决定发送按钮、状态文案和 `sendRequest` 保护。仅文档 endpoint 仍调用 planner 生成安全示例，但不执行 fetch。

### Token persistence

- Base URL: 保持现有 localStorage 行为。
- Token: 默认只存在 input/state；`rememberToken.checked === true` 时才写入既有 token key。
- 取消勾选并保存或点击清除：删除 localStorage key 并清空输入。

## Responsive Request Lab

在 `max-width: 1180px` 时，`.tester` 从文档流中的长尾区变为固定右侧抽屉；390px 使用全宽。新增：

- `#openTester`: 固定“测试此接口”入口，显示当前 method。
- `#testerBackdrop`: 模态遮罩。
- `#closeTester`: 图标关闭按钮。
- `body.tester-open`: 锁定页面背景滚动。

打开时聚焦关闭按钮；关闭时把焦点还给触发按钮；Escape 和遮罩均可关闭。桌面断点不使用遮罩，也不改变 sticky tester。

## Code and Response Actions

复制行为使用同一个 `copyWithFeedback(button, text)`，分别服务 cURL、当前代码示例、当前响应视图和 endpoint 深链接。代码示例标签改为 `Node.js` 与 `Python`，避免把依赖 `process.env` 的示例描述为浏览器代码。

响应 tab 使用：

- `role="tablist"`
- `role="tab"`, `aria-selected`, `aria-controls`, roving `tabindex`
- `role="tabpanel"`, `aria-labelledby`

左右箭头切换响应 tab；点击和键盘走同一 `setResponseView`。

## Duplicate Route Presentation

不合并或删除源 endpoint。`renderEndpoint` 在同一路由有多个文档时显示“同路径变体”区，按钮名称由类别和标题组成。侧栏项显示变体数量，用户可显式切换来源语义。

## Deployment

- `Dockerfile`: `nginx:1.27-alpine`，复制 `public/` 和 `deploy/nginx.conf`，暴露 80，使用 `/healthz` 健康检查。
- `docker-compose.yml`: `${DOCS_PORT:-8080}:80`，restart policy。
- `deploy/nginx.conf`: `server_name docs.xi-ai.cn`，静态缓存、gzip、基础安全头和 `/healthz`。
- `README.md`: 本地运行、Docker 运行、反向代理/DNS 边界和验证说明。

不配置会阻断用户自定义 Base URL 请求的严格 `connect-src` CSP；API CORS 仍由目标服务决定。

## Compatibility and Rollback

- 新生成字段为 additive；旧 endpoint 结构仍可渲染。
- 抽屉只在媒体查询中生效；移除相关 class/事件即可回退为原堆叠布局。
- URL hash 非法时安全回退，不影响无 hash 的旧链接。
- Docker 文件独立于本地 Node 静态服务器，不改变现有开发入口。

## Verification Boundary

Playwright fixture 证明前端状态与本地请求分支，不证明真实 Provider 授权、配额、模型或 CORS。Nginx/Docker 只在本机 Docker 可用时执行镜像构建；DNS、TLS、线上 reload 和根站保留由部署环境单独验证。
