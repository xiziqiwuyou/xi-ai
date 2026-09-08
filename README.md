# Xi AI API 文档

面向 `api.xi-ai.cn` 的静态 API Integration Workbench，覆盖 OpenAI、Google Gemini 和 Anthropic Claude 的兼容与原生协议。页面包含接口检索、请求编辑、cURL / Node.js / Python 示例、在线发送、流式响应和统一调试视图。

## 本地运行

接口数据由只读事实源和 Provider registry 生成：

```powershell
node tools\generate-site.js
python -m http.server 5173 --directory public
```

打开 `http://127.0.0.1:5173/`。Token 默认只保留在当前页面；只有主动勾选“本机保存 Token”并保存环境时才写入浏览器 localStorage。

## Docker

```powershell
docker compose build
docker compose up -d
```

默认映射到 `http://127.0.0.1:8080/`，健康检查地址为 `http://127.0.0.1:8080/healthz`。可通过环境变量改端口：

```powershell
$env:DOCS_PORT=8090
docker compose up -d
```

停止服务：

```powershell
docker compose down
```

## Provider 冒烟测试

仓库提供一个只输出脱敏摘要的命令行检查器。默认使用
`https://api.xi-ai.cn`，不会保存请求体、响应原文、Token 或带密钥的 URL。
先执行 dry-run 查看请求方法、路径、请求头名称和模型类别：

```powershell
node tools\provider-smoke-test.mjs --dry-run
```

实时检查前，在当前终端通过环境变量注入临时凭据，不要把值写入脚本、截图、
命令历史或聊天记录。网关 Token 使用 `XI_AI_TOKEN`；也可以分别使用
`OPENAI_API_KEY`、`GEMINI_API_KEY` 和 `ANTHROPIC_API_KEY`。模型可通过
`OPENAI_MODEL`、`GEMINI_MODEL` 和 `ANTHROPIC_MODEL` 覆盖：

```powershell
node tools\provider-smoke-test.mjs --provider openai
node tools\provider-smoke-test.mjs --provider gemini --stream
node tools\provider-smoke-test.mjs --provider claude
```

缺少凭据时命令会失败并指出缺少的环境变量；401、429、网络/CORS、超时和
5xx 只会以分类摘要输出。真实模型可用性仍取决于账户权限、配额、路由和
上游协议支持，dry-run 或本地 fixture 不代表线上验证成功。

## 域名边界

容器内 Nginx 的目标 `server_name` 是 `docs.xi-ai.cn`。本项目不会修改 DNS、TLS 证书、宿主机 Nginx，也不会覆盖现有 `api.xi-ai.cn` 根站。生产环境需要将 `docs.xi-ai.cn` 解析到服务器，并由现有入口层终止 TLS 后转发到容器端口。

示例宿主机反向代理片段：

```nginx
server {
    listen 443 ssl http2;
    server_name docs.xi-ai.cn;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

请在服务器的真实 include 上下文中执行 `nginx -t` 后再 reload。不要把这段示例当作已完成的线上部署证明。

## 验证

```powershell
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-deployment-files.js
node tools\test-provider-smoke-test.mjs
$env:NODE_PATH='C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools\test-request-lab.js
```

浏览器在线发送直接访问用户填写的 Base URL，不经过文档容器代理。实际 Provider 可用性仍取决于 Token 权限、模型授权、额度和目标服务的 CORS 策略；本地 fixture 回归不代表真实上游已验证。
