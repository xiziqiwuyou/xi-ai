# Xi AI API Docs

`api.xi-ai.cn` 的中文 API 模型接口文档网页，包含 cURL 在线测试、请求生成、响应头查看和返回调试。

## 本地预览

直接打开 `index.html` 即可预览静态页面。

## Docker 运行

```bash
docker compose up --build
```

打开：

```text
http://localhost:8080
```

## 手动构建

```bash
docker build -t xi-ai-api-docs .
docker run --rm -p 8080:80 xi-ai-api-docs
```

## 说明

在线测试台会在浏览器中直接请求 `https://api.xi-ai.cn/v1`。如果接口未允许当前页面来源跨域访问，请复制生成的 cURL 到终端执行，或通过服务端代理转发测试请求。
