const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const { chromium } = require("playwright");

const EDGE_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const ROOT = path.join(__dirname, "..");

function send(res, status, contentType, body, extraHeaders = {}) {
  res.writeHead(status, {
    "access-control-allow-origin": "http://127.0.0.1:5173",
    "access-control-expose-headers": "x-mock-response",
    "content-type": contentType,
    "x-mock-response": "fixture",
    ...extraHeaders,
  });
  res.end(body);
}

function sendJson(res, status, payload, extraHeaders = {}) {
  send(res, status, "application/json", JSON.stringify(payload), extraHeaders);
}

function sendStream(res, chunks, delay = 20) {
  res.writeHead(200, {
    "access-control-allow-origin": "http://127.0.0.1:5173",
    "access-control-expose-headers": "x-mock-response",
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "x-mock-response": "stream-fixture",
  });
  let index = 0;
  const writeNext = () => {
    if (index >= chunks.length) {
      res.end();
      return;
    }
    res.write(chunks[index]);
    index += 1;
    setTimeout(writeNext, delay);
  };
  writeNext();
}

function startMockServer() {
  const requests = [];
  const server = http.createServer((req, res) => {
    const requestChunks = [];
    req.on("data", (chunk) => requestChunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(requestChunks);
      const requestUrl = new URL(req.url, "http://127.0.0.1");
      requests.push({
        method: req.method,
        pathname: requestUrl.pathname,
        search: requestUrl.search,
        contentType: req.headers["content-type"] || "",
        bodyLength: body.length,
        bodyText: body.toString("utf8"),
        headers: {
          authorization: req.headers.authorization || "",
          "x-api-key": req.headers["x-api-key"] || "",
          "x-goog-api-key": req.headers["x-goog-api-key"] || "",
          "anthropic-version": req.headers["anthropic-version"] || "",
        },
      });
    });
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "http://127.0.0.1:5173",
        "access-control-allow-headers": "content-type, authorization, x-trace, x-api-key, x-goog-api-key, anthropic-version",
        "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
      });
      res.end();
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1");
    if (url.pathname === "/v1/models") {
      if (req.headers.authorization === "Bearer unauthorized") return sendJson(res, 401, { error: { message: "invalid api key" } });
      if (req.headers.authorization === "Bearer rate-limit") return sendJson(res, 429, { error: { message: "rate limit fixture" } });
      if (req.headers["x-api-key"] === "unauthorized") return sendJson(res, 401, { error: { message: "invalid anthropic key" } });
      return sendJson(res, 200, { data: [{ id: "fixture-model" }, { id: "fixture-model-2" }] });
    }
    if (url.pathname === "/v1beta/models") {
      if (req.headers["x-goog-api-key"] === "unauthorized" || url.searchParams.get("key") === "unauthorized") return sendJson(res, 401, { error: { message: "invalid gemini key" } });
      return sendJson(res, 200, { models: [{ name: "models/gemini-fixture", displayName: "Gemini Fixture" }] });
    }
    if (url.pathname.endsWith("/v1/chat/completions")) {
      if (url.pathname.startsWith("/slow/")) {
        setTimeout(() => send(res, 200, "application/json", JSON.stringify({ late: true })), 1000);
        return;
      }
      sendStream(res, [
        'data: {"choices":[{"delta":{"content":"fixture-one"},"finish_reason":null}]}\n\n',
        'data: {"choices":[{"delta":{"content":" fixture-two"},"finish_reason":"stop"}]}\n\n',
        "data: [DONE]\n\n",
      ], 250);
      return;
    }
    if (url.pathname.startsWith("/v1beta/models/") && url.pathname.endsWith(":generateContent")) {
      return sendJson(res, 200, {
        candidates: [{ content: { parts: [{ text: "gemini fixture" }] }, finishReason: "STOP" }],
        usageMetadata: { totalTokenCount: 4 },
      });
    }
    if (url.pathname.startsWith("/v1beta/models/") && url.pathname.endsWith(":streamGenerateContent")) {
      return sendStream(res, [
        'data: {"candidates":[{"content":{"parts":[{"text":"gemini-one"}]}}]}\n\n',
        'data: {"candidates":[{"content":{"parts":[{"text":" gemini-two"}]},"finishReason":"STOP","usageMetadata":{"totalTokenCount":5}}]}\n\n',
      ]);
    }
    if (url.pathname === "/v1/messages") {
      return sendJson(res, 200, {
        id: "msg_fixture",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "claude fixture" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 3, output_tokens: 2 },
      });
    }
    if (url.pathname === "/v1/audio/speech") return send(res, 200, "audio/mpeg", Buffer.from("ID3fixture"));
    if (url.pathname === "/v1/videos/fixture-task/content") return send(res, 200, "video/mp4", Buffer.from("video-fixture"));
    if (url.pathname === "/v1/realtime") return send(res, 101, "", "");
    if (url.pathname === "/fixture-stream") {
      res.writeHead(200, {
        "access-control-allow-origin": "http://127.0.0.1:5173",
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      });
      res.write("data: one\\n\\n");
      setTimeout(() => {
        res.write("data: two\\n\\n");
        res.end();
      }, 35);
      return;
    }
    if (url.pathname === "/fixture-slow") {
      setTimeout(() => send(res, 200, "application/json", JSON.stringify({ late: true })), 1000);
      return;
    }
    if (url.pathname === "/v1/audio/transcriptions" && req.method === "POST") {
      let size = 0;
      req.on("data", (chunk) => { size += chunk.length; });
      req.on("end", () => send(res, 200, "application/json", JSON.stringify({ received: size, contentType: req.headers["content-type"] })));
      return;
    }
    send(res, 404, "application/json", JSON.stringify({ error: "fixture not found" }));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ server, requests })));
}

async function main() {
  assert.ok(fs.existsSync(EDGE_PATH), `Edge executable not found: ${EDGE_PATH}`);
  const { server, requests } = await startMockServer();
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true, executablePath: EDGE_PATH });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (value) => { window.__copiedText = value; } },
    });
  });
  const errors = [];
  const expectedResourceErrors = /Failed to load resource: the server responded with a status of (401|429)|Failed to load resource: net::ERR_UNSAFE_PORT/;
  page.on("console", (message) => {
    if (message.type() === "error" && !expectedResourceErrors.test(message.text())) errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(`PAGEERROR: ${error.message}`));
  await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#navList [data-id]").count(), 43);
  assert.equal(await page.locator("#resultCount").textContent(), "43 个");
  assert.equal(await page.locator('.nav-link.active').getAttribute("data-id"), "createchatcompletion");
  assert.equal(new URL(page.url()).hash, "#endpoint=createchatcompletion");
  assert.equal(await page.locator('script[data-figma-capture="enabled"]').count(), 0);
  assert.equal(await page.locator("#requestBody").getAttribute("aria-labelledby"), "jsonEditorTitle");
  assert.equal(await page.locator('[data-response-view="raw"]').getAttribute("role"), "tab");
  assert.equal(await page.locator('[data-response-view="raw"]').getAttribute("aria-selected"), "true");
  assert.equal(await page.locator("#responseBox").getAttribute("role"), "tabpanel");
  assert.equal(await page.locator('[data-filter="all"]').getAttribute("aria-pressed"), "true");
  const accessibility = await page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((element) => element.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const unlabeledControls = [...document.querySelectorAll("input, select, textarea")]
      .filter((element) => !element.hidden && element.type !== "hidden")
      .filter((element) => !element.labels?.length && !element.getAttribute("aria-label") && !element.getAttribute("aria-labelledby"))
      .map((element) => element.id || element.outerHTML.slice(0, 80));
    const unnamedButtons = [...document.querySelectorAll("button")]
      .filter((button) => !button.textContent.trim() && !button.getAttribute("aria-label"))
      .map((button) => button.id || button.outerHTML.slice(0, 80));
    return { duplicateIds, unlabeledControls, unnamedButtons };
  });
  assert.deepEqual(accessibility, { duplicateIds: [], unlabeledControls: [], unnamedButtons: [] });
  assert.equal(await page.locator("[data-variant-id]").count(), 2);

  await page.click('[data-variant-id="geminirelayv1beta-389846313"]');
  assert.equal(await page.locator(".nav-link.active").getAttribute("data-id"), "geminirelayv1beta-389846313");
  assert.equal(new URL(page.url()).hash, "#endpoint=geminirelayv1beta-389846313");
  await page.click('[data-id="createchatcompletion"]');

  await page.click('[data-id="createspeech"]');
  assert.equal(await page.locator("#operationSelect").inputValue(), "");
  assert.match(await page.locator("#operationSelect option").first().textContent(), /当前接口：兼容协议/);
  await page.selectOption("#operationSelect", "openai.chat-completions");
  assert.equal(await page.locator(".nav-link.active").getAttribute("data-id"), "createchatcompletion");
  assert.equal(await page.locator("#operationSelect").inputValue(), "openai.chat-completions");
  assert.equal(await page.locator("#testerPath").textContent(), "https://api.xi-ai.cn/v1/chat/completions");
  assert.equal(new URL(page.url()).hash, "#endpoint=createchatcompletion");
  assert.equal(await page.locator("#openOperation").count(), 0);

  await page.locator('[data-response-view="raw"]').focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator('[data-response-view="debug"]').getAttribute("aria-selected"), "true");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.locator('[data-response-view="raw"]').getAttribute("aria-selected"), "true");

  await page.locator('[data-code-mode="javascript"]').focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator('[data-code-mode="python"]').getAttribute("aria-selected"), "true");
  await page.keyboard.press("ArrowLeft");
  assert.equal(await page.locator('[data-code-mode="javascript"]').getAttribute("aria-selected"), "true");

  await page.click("#copyCurl");
  assert.match(await page.evaluate(() => window.__copiedText), /\/v1\/chat\/completions/);
  await page.click("#copyCode");
  assert.match(await page.evaluate(() => window.__copiedText), /fetch\(/);
  await page.click('[data-code-mode="python"]');
  await page.click("#copyCode");
  assert.match(await page.evaluate(() => window.__copiedText), /requests\./);
  await page.click('[data-code-mode="javascript"]');
  await page.click("[data-copy-endpoint-link]");
  const copiedEndpointUrl = await page.evaluate(() => window.__copiedText);
  assert.equal(new URL(copiedEndpointUrl).hash, "#endpoint=createchatcompletion");
  assert.equal(new URL(copiedEndpointUrl).search, "");

  await page.fill("#apiToken", "memory-only-token");
  await page.click("#saveConfig");
  assert.equal(await page.evaluate(() => localStorage.getItem("newapi-docs-token")), null);
  assert.equal(await page.inputValue("#apiToken"), "memory-only-token");
  await page.check("#rememberToken");
  await page.click("#saveConfig");
  assert.equal(await page.evaluate(() => localStorage.getItem("newapi-docs-token")), "memory-only-token");
  await page.uncheck("#rememberToken");
  assert.equal(await page.evaluate(() => localStorage.getItem("newapi-docs-token")), null);
  await page.check("#rememberToken");
  await page.click("#saveConfig");
  await page.click("#clearToken");
  assert.equal(await page.inputValue("#apiToken"), "");
  assert.equal(await page.evaluate(() => localStorage.getItem("newapi-docs-token")), null);

  await page.fill("#baseUrl", `http://127.0.0.1:${port}`);
  await page.fill("#apiToken", "sk-fixture");

  const firstPathInput = page.locator('[data-request-location="path"]').first();
  if (await firstPathInput.count()) {
    await firstPathInput.fill("gemini 2.5/pro");
    assert.match(await page.locator("#testerPath").textContent(), /gemini%202\.5%2Fpro/);
    assert.match(await page.locator("#curlBox").textContent(), /gemini%202\.5%2Fpro/);
  }

  await page.click('[data-id="listmodels"]');
  const queryInput = page.locator('[data-request-location="query"]').first();
  if (await queryInput.count()) {
    await queryInput.fill("query value");
    assert.match(await page.locator("#testerPath").textContent(), /query%20value/);
  }
  const headerInput = page.locator('[data-request-location="header"]').first();
  if (await headerInput.count()) {
    await headerInput.fill("trace value");
    assert.match(await page.locator("#curlBox").textContent(), /trace value/);
  }
  await page.click('[data-curl-mode="powershell"]');
  assert.match(await page.locator("#curlBox").textContent(), /^curl\.exe/);

  await page.click('[data-id="createfile"]');
  assert.equal(await page.locator("#sendRequest").isDisabled(), true);
  assert.match(await page.locator(".endpoint-notice").textContent(), /仅文档/);
  assert.equal(await page.locator("#multipartEditorSection").isVisible(), true);
  const fileInput = page.locator('input[type="file"][data-multipart-name="file"]');
  await fileInput.setInputFiles({ name: "fixture.txt", mimeType: "text/plain", buffer: Buffer.from("fixture") });
  assert.match(await page.locator("#curlBox").textContent(), /-F .*file=@.*fixture\.txt/);
  assert.doesNotMatch(await page.locator("#curlBox").textContent(), /Content-Type: multipart\/form-data/);
  await page.fill('[data-curl-path-name="file"]', "C:/fixtures/fixture.txt");
  assert.ok(await page.locator("#curlBox").textContent().then((value) => value.includes("C:/fixtures/fixture.txt")));

  await page.click('[data-id="listmodels"]');
  await page.click("#sendRequest");
  await page.locator("#responseMeta").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("200"));
  assert.match(await page.locator("#responseBox").textContent(), /fixture-model/);
  const modelsRequest = requests.findLast((request) => request.pathname === "/v1/models");
  assert.equal(modelsRequest.method, "GET");
  assert.equal(modelsRequest.bodyLength, 0);
  assert.equal(modelsRequest.contentType, "");

  await page.click('[data-id="createchatcompletion"]');
  await page.check("#streamToggle");
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseBox")?.textContent.includes("fixture-one"));
  assert.doesNotMatch(await page.locator("#responseBox").textContent(), /fixture-two/);
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("流式完成"));
  assert.match(await page.locator("#responseMeta").textContent(), /text\/event-stream/);
  assert.match(await page.locator("#responseBox").textContent(), /fixture-one/);
  assert.match(await page.locator("#responseBox").textContent(), /fixture-two/);
  await page.click('[data-response-view="debug"]');
  assert.match(await page.locator("#responseDebug").textContent(), /fixture-one fixture-two/);
  assert.match(await page.locator("#responseDebug").textContent(), /原始响应/);
  await page.click('[data-response-view="raw"]');
  await page.click("#copyResponse");
  assert.match(await page.evaluate(() => window.__copiedText), /fixture-one/);
  assert.match(await page.locator("#copyResponse").textContent(), /已复制/);
  const chatRequest = requests.findLast((request) => request.pathname === "/v1/chat/completions");
  assert.equal(chatRequest.headers.authorization, "Bearer sk-fixture");
  assert.equal(JSON.parse(chatRequest.bodyText).stream, true);
  assert.match(chatRequest.bodyText, /gpt-4o-mini/);

  await page.click('[data-id="geminirelayv1beta"]');
  await page.selectOption("#authProfileSelect", "gemini-header");
  await page.uncheck("#streamToggle");
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("200"));
  assert.match(await page.locator("#responseBox").textContent(), /gemini fixture/);
  const geminiNativeRequest = requests.findLast((request) => request.pathname.includes(":generateContent"));
  assert.equal(geminiNativeRequest.headers["x-goog-api-key"], "sk-fixture");
  assert.equal(geminiNativeRequest.headers.authorization, "");
  assert.match(geminiNativeRequest.bodyText, /contents/);
  await page.check("#streamToggle");
  assert.match(await page.locator("#testerPath").textContent(), /streamGenerateContent/);
  assert.match(await page.locator("#curlBox").textContent(), /x-goog-api-key/);
  assert.match(await page.locator("#curlBox").textContent(), /alt=sse/);
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("流式完成"));
  await page.click('[data-response-view="debug"]');
  assert.match(await page.locator("#responseDebug").textContent(), /gemini-one gemini-two/);
  assert.match(await page.locator("#responseDebug").textContent(), /STOP/);
  await page.click('[data-response-view="raw"]');
  const geminiStreamRequest = requests.findLast((request) => request.pathname.includes(":streamGenerateContent"));
  assert.equal(geminiStreamRequest.headers["x-goog-api-key"], "sk-fixture");
  assert.match(geminiStreamRequest.search, /alt=sse/);
  assert.match(geminiStreamRequest.bodyText, /contents/);

  await page.click('[data-id="createmessage"]');
  await page.selectOption("#authProfileSelect", "claude-api-key");
  assert.match(await page.locator("#curlBox").textContent(), /x-api-key/);
  assert.match(await page.locator("#curlBox").textContent(), /anthropic-version/);
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("200"));
  await page.click('[data-response-view="debug"]');
  assert.match(await page.locator("#responseDebug").textContent(), /claude fixture/);
  assert.match(await page.locator("#responseDebug").textContent(), /end_turn/);
  await page.click('[data-response-view="raw"]');
  const claudeRequest = requests.findLast((request) => request.pathname === "/v1/messages");
  assert.equal(claudeRequest.headers["x-api-key"], "sk-fixture");
  assert.equal(claudeRequest.headers["anthropic-version"], "2023-06-01");
  assert.equal(claudeRequest.headers.authorization, "");
  assert.match(claudeRequest.bodyText, /claude-3-5-sonnet/);

  await page.click('[data-id="createchatcompletion"]');
  await page.click("#syncModels");
  await page.waitForFunction(() => document.querySelector("#modelSyncStatus")?.textContent.includes("同步预览完成"));
  assert.equal(await page.locator("#modelSyncPreview").isVisible(), true);
  assert.match(await page.locator("#modelSyncPreview").textContent(), /fixture-model/);
  await page.click("#applySyncedModels");
  assert.match(await page.locator("#modelSyncStatus").textContent(), /已应用/);
  assert.match(await page.locator("#modelSelect").textContent(), /fixture-model/);

  await page.fill("#apiToken", "unauthorized");
  await page.click("#syncModels");
  await page.waitForFunction(() => document.querySelector("#modelSyncStatus")?.textContent.includes("401"));
  assert.match(await page.locator("#modelSyncStatus").textContent(), /认证失败/);
  await page.fill("#apiToken", "rate-limit");
  await page.click("#syncModels");
  await page.waitForFunction(() => document.querySelector("#modelSyncStatus")?.textContent.includes("429"));
  assert.match(await page.locator("#modelSyncStatus").textContent(), /配额|频繁/);
  await page.fill("#apiToken", "sk-fixture");
  await page.fill("#baseUrl", "http://127.0.0.1:9");
  await page.click("#syncModels");
  await page.waitForFunction(() => document.querySelector("#modelSyncStatus")?.textContent.includes("模型同步失败"));
  assert.match(await page.locator("#modelSyncStatus").textContent(), /模型同步失败/);
  await page.fill("#baseUrl", `http://127.0.0.1:${port}`);

  await page.click('[data-id="createchatcompletion"]');
  await page.fill("#baseUrl", `http://127.0.0.1:${port}/slow`);
  await page.click("#sendRequest");
  await page.click('[data-id="listmodels"]');
  await page.fill("#baseUrl", `http://127.0.0.1:${port}`);
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseBox")?.textContent.includes("fixture-model"));
  await page.waitForTimeout(1100);
  assert.match(await page.locator("#responseBox").textContent(), /fixture-model/);
  assert.doesNotMatch(await page.locator("#responseBox").textContent(), /late/);

  await page.click('[data-id="createspeech"]');
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("audio/mpeg"));
  assert.equal(await page.locator("#responseMedia audio").count(), 1);
  assert.equal(await page.locator("#responseMedia .download-link").count(), 1);
  const speechRequest = requests.findLast((request) => request.pathname === "/v1/audio/speech");
  assert.equal(speechRequest.method, "POST");
  assert.ok(speechRequest.bodyLength > 0);
  assert.equal(speechRequest.contentType, "application/json");

  await page.click('[data-id="getvideocontent"]');
  const requiredPath = page.locator('[data-request-location="path"]').first();
  await requiredPath.fill("");
  await page.click("#sendRequest");
  assert.match(await page.locator("#responseMeta").textContent(), /path 参数/);
  await requiredPath.fill("fixture-task");
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("video/mp4"));
  assert.equal(await page.locator("#responseMedia video").count(), 1);

  await page.click('[data-id="createrealtimesession"]');
  await page.click("#sendRequest");
  assert.match(await page.locator("#responseMeta").textContent(), /WebSocket/);
  assert.match(await page.locator("#responseBox").textContent(), /ws:/);

  await page.click('[data-id="createtranscription"]');
  const multipartFile = page.locator('input[type="file"][data-multipart-name="file"]');
  await multipartFile.setInputFiles({ name: "sent.txt", mimeType: "text/plain", buffer: Buffer.from("sent") });
  await page.click("#sendRequest");
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("200"));
  const multipartRequest = requests.findLast((request) => request.pathname === "/v1/audio/transcriptions");
  assert.equal(multipartRequest.method, "POST");
  assert.ok(multipartRequest.bodyLength > 0);
  assert.match(multipartRequest.contentType, /^multipart\/form-data; boundary=/);

  await page.click('[data-id="createchatcompletion"]');
  await page.fill("#baseUrl", `http://127.0.0.1:${port}/slow`);
  await page.click("#sendRequest");
  await page.locator("#cancelRequest").click();
  await page.waitForFunction(() => document.querySelector("#responseMeta")?.textContent.includes("取消"));
  assert.match(await page.locator("#responseBox").textContent(), /取消/);

  await page.fill("#searchInput", "完全不存在的接口");
  assert.match(await page.locator("#endpointView").textContent(), /没有匹配的接口/);
  assert.equal(await page.locator("#sendRequest").isDisabled(), true);
  await page.fill("#baseUrl", `http://127.0.0.1:${port}/stale-check`);
  await page.fill("#apiToken", "stale-check-token");
  assert.equal(await page.locator("#curlBox").textContent(), "请先选择一个接口。");
  assert.equal(await page.locator("#testerPath").textContent(), "没有选中的接口");
  await page.fill("#searchInput", "");

  await page.goto("http://127.0.0.1:5173/?qa=clean#endpoint=createchatcompletion", { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector("#requestTester").scrollTop = 0;
  });
  assert.equal(await page.locator("#openTester").isVisible(), false);
  assert.equal(await page.locator("#requestTester").getAttribute("aria-hidden"), null);
  await page.screenshot({ path: path.join(ROOT, "qa-desktop-viewport-current.png"), fullPage: false });
  await page.screenshot({ path: path.join(ROOT, "qa-desktop-current.png"), fullPage: true });

  const responsive = [];
  for (const width of [1180, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.waitForTimeout(50);
    assert.equal(await page.locator("#openTester").isVisible(), true);
    assert.equal(await page.locator("#openTester").getAttribute("aria-expanded"), "false");
    await page.waitForFunction(() => document.querySelector("#requestTester")?.getAttribute("aria-hidden") === "true");
    assert.equal(await page.locator("#requestTester").getAttribute("aria-hidden"), "true");
    await page.click("#openTester");
    assert.equal(await page.locator("#openTester").getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#requestTester").getAttribute("aria-hidden"), "false");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "closeTester");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#openTester").getAttribute("aria-expanded"), "false");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "openTester");
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    }));
    assert.equal(dimensions.overflow, false);
    responsive.push(dimensions);
  }

  await page.setViewportSize({ width: 768, height: 800 });
  await page.waitForTimeout(50);
  await page.click("#openTester");
  await page.mouse.click(120, 120);
  assert.equal(await page.locator("#openTester").getAttribute("aria-expanded"), "false");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(50);
  await page.click("#openTester");
  await page.waitForTimeout(220);
  await page.screenshot({ path: path.join(ROOT, "qa-mobile-drawer-current.png"), fullPage: false });
  await page.click("#closeTester");
  await page.waitForTimeout(220);
  assert.equal(await page.locator("#openTester").getAttribute("aria-expanded"), "false");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(ROOT, "qa-mobile-viewport-current.png"), fullPage: false });
  await page.screenshot({ path: path.join(ROOT, "qa-mobile-current.png"), fullPage: true });
  const mobile = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  assert.equal(mobile.overflow, false);

  const deepLinkPage = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  deepLinkPage.on("console", (message) => {
    if (message.type() === "error" && !expectedResourceErrors.test(message.text())) errors.push(`DEEPLINK: ${message.text()}`);
  });
  deepLinkPage.on("pageerror", (error) => errors.push(`DEEPLINK PAGEERROR: ${error.message}`));
  await deepLinkPage.goto("http://127.0.0.1:5173/#endpoint=createmessage", { waitUntil: "networkidle" });
  assert.equal(await deepLinkPage.locator(".nav-link.active").getAttribute("data-id"), "createmessage");
  assert.equal(await deepLinkPage.locator("#testerPath").textContent(), `${await deepLinkPage.inputValue("#baseUrl")}/v1/messages`);
  assert.doesNotMatch(deepLinkPage.url(), /token|stale-check|sk-fixture/i);
  await deepLinkPage.goto("http://127.0.0.1:5173/?reload=1#endpoint=missing-endpoint", { waitUntil: "networkidle" });
  assert.equal(await deepLinkPage.locator(".nav-link.active").getAttribute("data-id"), "createchatcompletion");
  assert.equal(new URL(deepLinkPage.url()).hash, "#endpoint=createchatcompletion");
  await deepLinkPage.close();

  assert.equal(errors.length, 0, errors.join(" | "));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log(JSON.stringify({ ok: true, port, mobile, responsive, consoleErrors: errors.length }));
}

main().catch(async (error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
