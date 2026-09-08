# Implementation Plan

## Ordered Checklist

- [x] 扩展生成器：生成 `documentationOnly`、`routeKey`、`routeVariantIds`，保持 43/43 coverage。
- [x] 重构 endpoint 初始化、hash 深链接和 Operation transition，移除二次“载入 operation”状态。
- [x] 增加仅文档运行保护、状态和同路径变体切换。
- [x] 调整 Token 保存为显式 opt-in，并加入清除动作。
- [x] 补齐 Request Lab、响应 tabs、筛选/模式按钮和 JSON 编辑器的 ARIA 契约。
- [x] 增加代码、响应和 endpoint 链接复制动作，统一反馈函数。
- [x] 实现 1180px 以下 Request Lab 抽屉、遮罩、焦点恢复和 Escape 关闭。
- [x] 压缩 Hero、统一术语和状态文案，检查 1440/1180/1024/768/390 布局。
- [x] 将 Figma capture 改为仅显式查询参数加载。
- [x] 新增 Dockerfile、Compose、Nginx 配置、`.dockerignore` 和部署 README。
- [x] 扩展数据、序列化和浏览器回归，覆盖新状态、深链接、复制、抽屉和无障碍语义。
- [x] 运行完整质量门、检查截图并更新相关 Trellis frontend spec。

## Validation Commands

```powershell
node tools\generate-site.js
node --check tools\generate-site.js
node --check public\assets\app.js
node --check public\assets\request-utils.js
node --check tools\test-api-data.js
node --check tools\test-request-serialization.js
node --check tools\test-request-lab.js
node tools\test-api-data.js
node tools\test-request-serialization.js
$env:NODE_PATH='C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools\test-request-lab.js
docker compose config
docker compose build
```

若 `docker` 不可用，记录该环境边界，并至少静态检查 Docker/Nginx 文件以及继续运行本地 HTTP/Playwright 回归。

## Risky Files and Rollback Points

- `tools/generate-site.js` / `public/data/api-data.json`: 必须重生成；若 coverage 改变立即回滚生成逻辑。
- `public/assets/app.js`: 状态转换、hash 和请求生命周期风险最高；每个新入口都必须复用 `setRequestForEndpoint`、`loadOperation` 和 request run identity。
- `public/assets/styles.css`: 旧媒体查询存在多段覆盖；新增抽屉规则放在文件末尾并验证全部断点。
- `public/index.html`: ARIA 与控件 id 必须和 app.js 选择器一致。
- `tools/test-request-lab.js`: 避免只断言测试自己设置的 class，必须断言用户可见状态和 URL/请求结果。
- Docker/Nginx 文件: 不接管现有根站，只构建独立文档服务。

## Completion Gate

- 所有 PRD acceptance criteria 有自动化或截图证据。
- `source-new-api-docs` 无修改。
- 43/43 coverage、序列化契约、Provider fixture 和旧响应分支继续通过。
- 不声称未经验证的 Docker 构建、Git commit/push、DNS、TLS 或线上发布。

## Verification Results

- `node tools\generate-site.js`: `sitemapCount=43`, `endpointCount=43`, `missingFromSource=[]`, `extraSource=[]`.
- Node syntax checks passed for the generator, registry, browser modules, and all four contract/regression scripts.
- `test-api-data.js`, `test-request-serialization.js`, and `test-deployment-files.js` passed.
- Compose YAML parsed successfully with PyYAML.
- `test-request-lab.js` passed with zero console errors and no horizontal overflow at 1180, 1024, 768, or 390px.
- Visual evidence: `qa-desktop-viewport-current.png`, `qa-mobile-viewport-current.png`, and `qa-mobile-drawer-current.png`.
- Local HTTP checks returned 200 for `/` and `/data/api-data.json` at `http://127.0.0.1:5173/`.
- `source-new-api-docs` contains 269 files; none have a write time on or after 2026-09-06. Latest source write remains 2026-05-25T20:42:07+08:00.
- Docker and Nginx executables are unavailable on this host. Image build, container `/healthz`, DNS, TLS, host reload, and production Provider calls remain unverified.
- The workspace is not a Git repository, so no commit or GitHub push was performed.
