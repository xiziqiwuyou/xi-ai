const assert = require("node:assert/strict");
const utils = require("../public/assets/request-utils.js");
const registry = require("./provider-registry.js");

const jsonEndpoint = {
  id: "json",
  method: "POST",
  path: "/v1/models/{model}",
  parameters: [
    { name: "model", in: "path", required: true, example: "gpt-4" },
    { name: "mode", in: "query", required: false, example: "fast" },
    { name: "x-trace", in: "header", required: true, example: "" },
  ],
  requestMode: "json",
  requestBody: {
    required: true,
    contentType: "application/json",
    schema: { type: "object", required: ["prompt"], properties: { prompt: { type: "string" } } },
    example: { prompt: "hello" },
  },
};
const request = utils.createRequestState(jsonEndpoint);
request.path.model = "gpt/4";
request.query.mode = "";
request.headers["x-trace"] = "trace 1";
request.jsonText = '{"prompt":"hello"}';
const plan = utils.buildRequestPlan(jsonEndpoint, {
  request,
  baseUrl: "https://api.example.com/",
  token: "sk-test",
});
assert.equal(plan.ok, true);
assert.equal(plan.url, "https://api.example.com/v1/models/gpt%2F4");
assert.equal(plan.headers.Authorization, "Bearer sk-test");
assert.equal(plan.headers["x-trace"], "trace 1");
assert.equal(plan.headers["Content-Type"], "application/json");
assert.equal(plan.bodyText, '{"prompt":"hello"}');
assert.equal(plan.hasBody, true);

const bash = utils.buildCurl(jsonEndpoint, { request, baseUrl: "https://api.example.com", token: "sk-test", curlMode: "bash" });
const powershell = utils.buildCurl(jsonEndpoint, { request, baseUrl: "https://api.example.com", token: "sk-test", curlMode: "powershell" });
assert.match(bash, /gpt%2F4/);
assert.match(bash, /--data-raw/);
assert.match(bash, /x-trace: trace 1/);
assert.doesNotMatch(bash, /mode=fast/);
assert.match(powershell, /^curl\.exe/);
assert.match(powershell, /`\n/);

const noBodyEndpoint = {
  id: "get",
  method: "GET",
  path: "/v1/models",
  parameters: [{ name: "key", in: "query", required: false, example: "unused" }],
  requestMode: "none",
};
const noBodyRequest = utils.createRequestState(noBodyEndpoint);
const noBodyPlan = utils.buildRequestPlan(noBodyEndpoint, { request: noBodyRequest, baseUrl: "https://api.example.com", token: "" });
assert.equal(noBodyPlan.url, "https://api.example.com/v1/models");
assert.equal(noBodyPlan.body, undefined);
assert.equal(noBodyPlan.hasBody, false);
assert.doesNotMatch(utils.buildCurl(noBodyEndpoint, { request: noBodyRequest, baseUrl: "https://api.example.com" }), /Content-Type|--data-raw/);

const multipartEndpoint = {
  id: "multipart",
  method: "POST",
  path: "/v1/files",
  parameters: [],
  requestMode: "multipart",
  requestBody: {
    required: true,
    contentType: "multipart/form-data",
    fields: [
      { name: "file", required: true, isBinary: true, type: "string", format: "binary" },
      { name: "purpose", required: false, isBinary: false, type: "string", example: "assistants" },
    ],
  },
};
const multipartRequest = utils.createRequestState(multipartEndpoint);
multipartRequest.multipart.file = { value: "", file: { name: "sample.txt", size: 4 }, curlPath: "C:/tmp/sample.txt" };
multipartRequest.multipart.purpose.value = "assistants";
const multipartPlan = utils.buildRequestPlan(multipartEndpoint, { request: multipartRequest, baseUrl: "https://api.example.com" });
assert.equal(multipartPlan.ok, true);
assert.equal(multipartPlan.headers["Content-Type"], undefined, "browser must choose multipart boundary");
assert.equal(multipartPlan.multipartFields.length, 2);
const multipartCurl = utils.buildCurl(multipartEndpoint, { request: multipartRequest, baseUrl: "https://api.example.com" });
assert.match(multipartCurl, /-F 'file=@C:\/tmp\/sample\.txt'/);
assert.match(multipartCurl, /-F 'purpose=assistants'/);

const documentationOnlyEndpoint = { ...multipartEndpoint, id: "multipart-docs", documentationOnly: true };
const documentationOnlyRequest = utils.createRequestState(documentationOnlyEndpoint);
documentationOnlyRequest.multipart.file = { value: "", file: { name: "docs.txt", size: 4 }, curlPath: "/tmp/docs.txt" };
const documentationOnlyPlan = utils.buildRequestPlan(documentationOnlyEndpoint, {
  request: documentationOnlyRequest,
  baseUrl: "https://api.example.com",
});
assert.equal(documentationOnlyPlan.ok, true, "documentation-only endpoints must still serialize examples");
assert.match(utils.buildCurl(documentationOnlyEndpoint, {
  request: documentationOnlyRequest,
  baseUrl: "https://api.example.com",
}), /docs\.txt/);

assert.equal(utils.classifyResponse(200, "application/json"), "json");
assert.equal(utils.classifyResponse(200, "text/event-stream"), "stream");
assert.equal(utils.classifyResponse(200, "audio/mpeg"), "binary");
assert.equal(utils.classifyResponse(200, "video/mp4"), "binary");
assert.equal(utils.classifyResponse(101, ""), "websocket");

function protocolEndpoint(operation, extra = {}) {
  return {
    id: operation.id,
    method: operation.method,
    path: operation.path,
    parameters: operation.path.includes("{model}") ? [{ name: "model", in: "path", required: true, example: "model" }] : [],
    requestMode: operation.requestMode,
    requestBody: operation.requestMode === "json"
      ? {
          required: true,
          contentType: "application/json",
          schema: { type: "object", required: ["model"], properties: { model: { type: "string" }, messages: { type: "array" }, contents: { type: "array" }, max_tokens: { type: "integer" } } },
          example: { model: "model", messages: [{ role: "user", content: "hello" }] },
        }
      : undefined,
    ...extra,
  };
}

const openAiOperation = registry.operations.find((operation) => operation.id === "openai.chat-completions");
const openAiEndpoint = protocolEndpoint(openAiOperation);
const openAiRequest = utils.createRequestState(openAiEndpoint, { registry, operation: openAiOperation });
openAiRequest.jsonText = JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: "hello" }], stream: false });
const openAiPlan = utils.buildRequestPlan(openAiEndpoint, {
  registry,
  operation: openAiOperation,
  request: openAiRequest,
  baseUrl: "https://api.xi-ai.cn",
  token: "openai-secret",
  authProfileId: "openai-bearer",
});
assert.equal(openAiPlan.headers.Authorization, "Bearer openai-secret");
assert.equal(openAiPlan.url, "https://api.xi-ai.cn/v1/chat/completions");
assert.equal(JSON.parse(openAiPlan.bodyText).stream, false);

const geminiOperation = registry.operations.find((operation) => operation.id === "gemini.generate-content");
const geminiEndpoint = protocolEndpoint(geminiOperation, {
  requestBody: {
    required: true,
    contentType: "application/json",
    schema: { type: "object", required: ["contents"], properties: { contents: { type: "array" } } },
    example: { contents: [{ parts: [{ text: "hello" }] }] },
  },
});
const geminiRequest = utils.createRequestState(geminiEndpoint, { registry, operation: geminiOperation });
geminiRequest.path.model = "gemini 2.5/pro";
geminiRequest.stream = true;
const geminiHeaderPlan = utils.buildRequestPlan(geminiEndpoint, {
  registry,
  operation: geminiOperation,
  request: geminiRequest,
  baseUrl: "https://api.xi-ai.cn",
  token: "gemini-secret",
  authProfileId: "gemini-header",
});
assert.equal(geminiHeaderPlan.url, "https://api.xi-ai.cn/v1beta/models/gemini%202.5%2Fpro:streamGenerateContent?alt=sse");
assert.equal(geminiHeaderPlan.headers["x-goog-api-key"], "gemini-secret");
assert.equal(geminiHeaderPlan.headers.Authorization, undefined);
const geminiQueryPlan = utils.buildRequestPlan(geminiEndpoint, {
  registry,
  operation: geminiOperation,
  request: geminiRequest,
  baseUrl: "https://api.xi-ai.cn",
  token: "gemini-secret",
  authProfileId: "gemini-query",
});
assert.match(geminiQueryPlan.url, /[?&]key=gemini-secret/);
assert.doesNotMatch(geminiQueryPlan.headers["x-goog-api-key"] || "", /gemini-secret/);
assert.match(geminiQueryPlan.curlUrl, /key=%7B%7BENV%3AGEMINI_API_KEY%7D%7D/);

const claudeOperation = registry.operations.find((operation) => operation.id === "claude.messages");
const claudeEndpoint = protocolEndpoint(claudeOperation);
const claudeRequest = utils.createRequestState(claudeEndpoint, { registry, operation: claudeOperation });
const claudePlan = utils.buildRequestPlan(claudeEndpoint, {
  registry,
  operation: claudeOperation,
  request: claudeRequest,
  baseUrl: "https://api.xi-ai.cn",
  token: "claude-secret",
  authProfileId: "claude-api-key",
});
assert.equal(claudePlan.headers["x-api-key"], "claude-secret");
assert.equal(claudePlan.headers["anthropic-version"], "2023-06-01");
assert.equal(claudePlan.headers.Authorization, undefined);

const examples = utils.buildCodeExamples(claudeEndpoint, {
  registry,
  operation: claudeOperation,
  request: claudeRequest,
  baseUrl: "https://api.xi-ai.cn",
  token: "claude-secret",
  authProfileId: "claude-api-key",
});
assert.doesNotMatch(examples.javascript, /claude-secret/);
assert.match(examples.javascript, /process\.env\.ANTHROPIC_API_KEY/);
assert.doesNotMatch(examples.python, /\$\{/);
assert.match(examples.python, /os\.environ\.get\('ANTHROPIC_API_KEY'/);

const modelPayloads = [
  ["openai", { data: [{ id: "gpt-fixture" }, { id: "gpt-fixture" }] }],
  ["gemini", { models: [{ name: "models/gemini-fixture", displayName: "Gemini Fixture" }] }],
  ["claude", { data: [{ id: "claude-fixture" }] }],
];
for (const [providerId, payload] of modelPayloads) {
  const models = utils.parseModelList(providerId, payload);
  assert.equal(models.length, 1);
  assert.equal(models[0].source, "upstream");
  assert.equal(models[0].verification, "observed");
}

const canonical = utils.createCanonicalDebug({
  providerId: "gemini",
  protocol: "gemini-native",
  operationId: "gemini.generate-content",
  status: 200,
  statusText: "OK",
  ok: true,
  elapsedMs: 12,
  contentType: "text/event-stream",
  headers: { "x-api-key": "secret" },
  responseKind: "stream",
  rawText: 'data: {"candidates":[{"content":{"parts":[{"text":"Hi"}]},"finishReason":"STOP","usageMetadata":{"totalTokenCount":3}}]}\n\ndata: [DONE]\n\n',
  secrets: ["secret"],
});
assert.equal(canonical.text, "Hi");
assert.equal(canonical.finishReason, "STOP");
assert.equal(canonical.usage.totalTokenCount, 3);
assert.doesNotMatch(canonical.rawText, /secret/);

const invalidMultipartPlan = utils.buildRequestPlan(multipartEndpoint, {
  request: utils.createRequestState(multipartEndpoint),
  baseUrl: "https://api.example.com",
});
assert.equal(invalidMultipartPlan.ok, false);
assert.match(invalidMultipartPlan.errors.join(";"), /file/);

console.log("request serialization contract passed");
