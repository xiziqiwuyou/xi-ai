# API 文档 P0-P1 体验与发布改进

## Goal

将现有 `api.xi-ai.cn` 静态接口文档从可用的文档镜像提升为操作语义清晰、移动端可快速调试、具备基础无障碍能力且可独立部署的 API Integration Workbench。文档站使用 `docs.xi-ai.cn` 作为目标发布边界，保留现有 `api.xi-ai.cn` 根站，不在本任务中执行 DNS、证书或服务器变更。

## Background

- 当前生成数据包含 43 个 sitemap 源文档、3 个 Provider 和 13 个手工模型种子，既有数据、序列化和浏览器回归通过。
- 桌面三栏视觉已经达到可用水平，但 Endpoint、Provider、Operation 和 Model 的切换关系不够明确。
- 在无 Operation 绑定的接口上，选择其他 Operation 后页面暂时保持原接口，必须再次点击“载入 operation”才切换，形成状态错位。
- 10 个标题标记“未实现”的接口仍允许点击发送。
- 390px 页面没有文档级横向溢出，但 Request Lab 位于约 4985px 后，完整页面约 6873px 高。
- 当前线上 `https://api.xi-ai.cn/` 与 `/docs` 返回标题为 `Xi-Api` 的既有 React 页面；本地文档尚未部署到独立地址。
- 当前工作目录不是 Git 仓库，且没有 Docker 配置。真实上游认证、配额、CORS 和模型可用性没有验证。

## Requirements

### P0: Interaction correctness and safety

- Operation 选择必须是原子操作：选择当前接口绑定的模板时立即更新请求；选择绑定到其他接口的模板时一次完成接口跳转和请求状态重建，不留下“下拉已变、接口未变”的中间状态。
- 将用户可见术语统一为“Provider / 协议模板 / 模型”，移除需要二次确认的“载入 operation”流程。
- 生成层为明确返回 501 或属于“未实现”分类的端点标记 `documentationOnly`；此类页面保留文档、示例和 Schema，但禁用真实发送并展示“仅文档”状态。
- Token 默认只保留在当前页面内存；只有用户主动勾选“本机保存 Token”并点击保存后才能写入 localStorage，同时提供清除动作。Base URL 可以继续持久化。
- 为请求体编辑器、响应 Tab、筛选与模式选择补齐可访问名称、`role`、`aria-selected` 或 `aria-pressed`，保持可见焦点。
- 移除生产环境无条件加载的 Figma capture 脚本；仅在显式查询参数启用时动态加载。

### P1: Developer workflow and visual refinement

- 在不改变 43 个源文档覆盖的前提下，识别相同 method/path 的文档变体，显示同路径变体数量和快速切换入口，避免重复路径看起来像重复错误。
- 默认打开最常用的 OpenAI Chat Completions 文档；URL hash 记录当前 endpoint id，支持刷新和分享具体接口，但不得包含 Token、Base URL、请求体或其他密钥。
- cURL、JavaScript/Node.js、Python 示例均提供独立复制动作；响应区提供当前视图复制动作和明确反馈。
- 1180px 及以下将 Request Lab 改为可呼出的响应式抽屉，并提供固定“测试此接口”入口、遮罩、关闭按钮和 Escape 关闭；桌面继续保留三栏工作台。
- 缩短首屏 Hero，移动端优先露出搜索和接口目录；表格继续在自身容器内横向滚动，不产生页面级溢出。
- 对 Provider 筛选、协议状态、模型来源和未验证状态使用一致中文微文案；避免状态被省略号截断后失去含义。
- 为 `docs.xi-ai.cn` 增加独立 Nginx 静态容器、Compose、健康检查和部署说明，明确不覆盖根站。

## Constraints

- 保持 HTML/CSS/原生 JavaScript、无构建步骤的静态架构。
- `source-new-api-docs` 为只读事实源；`public/data/api-data.json` 必须通过生成器重建，不手工修改。
- 保持 sitemap/source 覆盖 `43/43`，不删除重复来源文档，不复制 NewAPI 或 Apifox 的源码、品牌或资产。
- 不新增服务端 API 代理，不绕过 CORS，不把真实 Token 写入生成文件、日志、截图、URL 或 Docker 镜像。
- 不执行线上 DNS、TLS、Nginx reload 或现有 `api.xi-ai.cn` 根站替换。
- 不实现账号、团队协作、请求历史云同步、RBAC、计费、WebSocket 客户端或完整 Apifox 项目管理。

## Acceptance Criteria

- [x] 选择任一协议模板后，Endpoint、Provider、协议、模型、URL 和请求编辑器在一次交互内保持一致；不存在需要再次点击“载入”的中间状态。
- [x] 10 个明确未实现的源端点标记为仅文档，发送按钮不可用；其文档、Schema 和代码示例仍可浏览。
- [x] Token 默认不进入 localStorage；显式勾选后可保存，取消勾选或清除后从 localStorage 删除。
- [x] 请求体编辑器有可访问名称；响应视图使用有效 tab/tablist/tabpanel 语义；筛选和模式按钮暴露选中状态。
- [x] cURL、JavaScript/Node.js、Python 和当前响应均可独立复制，并有可见且可被辅助技术感知的反馈。
- [x] 默认入口为 Chat Completions；endpoint hash 可直接恢复对应文档，且 URL 中不出现 Token、Base URL 或请求正文。
- [x] 重复 method/path 文档显示为同路径变体并可切换；源文档数量仍为 43，生成覆盖无 missing/extra。
- [x] 在 390、768、1024 和 1180px 下可一键打开/关闭 Request Lab 抽屉，正文不产生页面级横向溢出；1440px 保持三栏布局。
- [x] Docker/Nginx 配置能从 `public/` 提供静态站点和 `/healthz`，目标 `server_name` 为 `docs.xi-ai.cn`；Docker 不可用时必须如实记录未构建边界。
- [x] 生成、语法、数据、序列化和 Playwright 回归全部通过，浏览器控制台错误为 0。

## Out of Scope

- 真实 DNS、TLS 证书、云服务器发布以及覆盖现有 `api.xi-ai.cn` 根站。
- 真实 Provider Token 的端到端调用验证和 CORS 策略调整。
- 后端密钥托管、请求代理、用户登录、团队空间、Mock 服务和自动化测试编排平台。
- 将全部 43 个来源文档合并成更少的事实记录；本任务只改善重复路由的呈现和切换。

## Open Questions

无阻塞问题。用户已批准独立 `docs.xi-ai.cn`、保留 `api.xi-ai.cn` 根站的发布边界，并批准实施本 P0/P1 范围。
