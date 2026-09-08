#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const registry = require("./provider-registry.js");
const requestUtils = require("../public/assets/request-utils.js");

const providerSpecs = {
  openai: {
    operationId: "openai.chat-completions",
    tokenEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    authProfile: "openai-bearer",
    defaultStream: false,
    body: (model, stream) => ({
      model,
      messages: [{ role: "user", content: "Say hello in one short sentence." }],
      temperature: 0,
      stream,
    }),
  },
  gemini: {
    operationId: "gemini.generate-content",
    tokenEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    authProfile: "gemini-header",
    defaultStream: false,
    body: (model) => ({
      contents: [{ role: "user", parts: [{ text: "Say hello in one short sentence." }] }],
      generationConfig: { temperature: 0 },
      model,
    }),
  },
  claude: {
    operationId: "claude.messages",
    tokenEnv: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_MODEL",
    authProfile: "claude-api-key",
    defaultStream: false,
    body: (model, stream) => ({
      model,
      max_tokens: 32,
      messages: [{ role: "user", content: "Say hello in one short sentence." }],
      stream,
    }),
  },
};

function parseArgs(argv) {
  const options = { providers: Object.keys(providerSpecs), dryRun: false, stream: false, timeoutMs: 30000 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--stream") options.stream = true;
    else if (arg === "--provider") {
      const value = argv[++index];
      if (!value || (value !== "all" && !providerSpecs[value])) throw new Error("--provider must be openai, gemini, claude, or all");
      options.providers = value === "all" ? Object.keys(providerSpecs) : [value];
    } else if (arg === "--timeout") {
      const value = Number(argv[++index]);
      if (!Number.isFinite(value) || value < 1000) throw new Error("--timeout must be at least 1000 milliseconds");
      options.timeoutMs = value;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: node tools/provider-smoke-test.mjs [options]

Options:
  --dry-run             Print request metadata only; never contacts a provider.
  --provider <name>     openai, gemini, claude, or all (default: all).
  --stream              Use the provider streaming operation where supported.
  --timeout <ms>        Abort a live request after this time (default: 30000).

Environment:
  XI_AI_BASE_URL        Base URL, default https://api.xi-ai.cn.
  XI_AI_TOKEN           Gateway Bearer token, preferred for api.xi-ai.cn.
  OPENAI_API_KEY        Native OpenAI Bearer token.
  GEMINI_API_KEY        Native Gemini x-goog-api-key token.
  ANTHROPIC_API_KEY     Native Claude x-api-key token.
  OPENAI_MODEL, GEMINI_MODEL, ANTHROPIC_MODEL

Live output is a sanitized summary. It never prints tokens, headers, URLs with
secret query values, request bodies, or raw provider responses.`);
}

function providerDefinition(providerId) {
  return registry.providers.find((provider) => provider.id === providerId);
}

function operationDefinition(providerId) {
  const spec = providerSpecs[providerId];
  return registry.operations.find((operation) => operation.id === spec.operationId);
}

function endpointFor(providerId, operation, model, stream) {
  const body = providerSpecs[providerId].body(model, stream);
  const hasModelPath = operation.path.includes("{model}");
  return {
    id: operation.id,
    method: operation.method,
    path: operation.path,
    parameters: hasModelPath ? [{ name: "model", in: "path", required: true, example: model }] : [],
    requestMode: operation.requestMode,
    modelBinding: operation.modelBinding,
    requestBody: {
      required: true,
      contentType: "application/json",
      schema: {
        type: "object",
        required: providerId === "gemini" ? ["contents"] : ["model"],
        properties: {
          model: { type: "string" },
          messages: { type: "array" },
          contents: { type: "array" },
        },
      },
      example: body,
    },
  };
}

function tokenFor(providerId) {
  return process.env.XI_AI_TOKEN || process.env[providerSpecs[providerId].tokenEnv] || "";
}

function authProfileFor(providerId) {
  return process.env.XI_AI_TOKEN ? "xi-bearer" : providerSpecs[providerId].authProfile;
}

function modelFor(providerId) {
  const spec = providerSpecs[providerId];
  return process.env[spec.modelEnv] || providerDefinition(providerId).defaultModel;
}

function baseUrlFor() {
  return (process.env.XI_AI_BASE_URL || registry.gateway.defaultBaseUrl).trim().replace(/\/+$/, "");
}

function headerNames(headers) {
  return Object.keys(headers || {}).map((name) => name.toLowerCase()).sort();
}

function bodyKeys(bodyText) {
  try {
    const parsed = JSON.parse(bodyText || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).sort() : [];
  } catch {
    return [];
  }
}

function requestPlan(providerId, options) {
  const operation = operationDefinition(providerId);
  if (!operation) throw new Error(`No operation definition for ${providerId}`);
  const model = modelFor(providerId);
  const stream = options.stream || providerSpecs[providerId].defaultStream;
  const endpoint = endpointFor(providerId, operation, model, stream);
  const request = requestUtils.createRequestState(endpoint, { registry, operation });
  request.stream = stream;
  if (operation.modelBinding?.location === "path") request.path.model = model;
  request.jsonText = JSON.stringify(providerSpecs[providerId].body(model, stream));
  const plan = requestUtils.buildRequestPlan(endpoint, {
    registry,
    operation,
    request,
    baseUrl: baseUrlFor(),
    token: tokenFor(providerId),
    authProfileId: authProfileFor(providerId),
    stream,
    allowPlaceholders: options.dryRun,
  });
  return { endpoint, operation, model, stream, plan };
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    for (const key of ["key", "token", "api_key", "api-key"]) {
      if (url.searchParams.has(key)) url.searchParams.set(key, "[redacted]");
    }
    return url.toString();
  } catch {
    return "[invalid-url]";
  }
}

function dryRunSummary(providerId, prepared) {
  const { operation, model, stream, plan } = prepared;
  return {
    provider: providerId,
    operation: operation.id,
    modelCategory: model.split(/[-_]/)[0] || "custom",
    method: plan.method,
    url: safeUrl(plan.displayUrl || plan.url),
    headerNames: headerNames(plan.headers),
    bodyKeys: bodyKeys(plan.bodyText),
    stream,
    requestValid: plan.ok,
    validationErrors: plan.errors,
  };
}

function errorCategory(status, error) {
  if (status) return status >= 500 ? "upstream_5xx" : `http_${status}`;
  if (error?.name === "AbortError") return "timeout";
  return "network_or_cors";
}

async function readResponse(response, stream) {
  let bytes = 0;
  let chunks = 0;
  let rawText = "";
  if (stream && response.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const next = await reader.read();
      if (next.done) {
        rawText += decoder.decode();
        break;
      }
      chunks += 1;
      bytes += next.value.byteLength;
      rawText += decoder.decode(next.value, { stream: true });
    }
  } else {
    rawText = await response.text();
    bytes = Buffer.byteLength(rawText);
    chunks = rawText ? 1 : 0;
  }
  return { rawText, bytes, chunks };
}

async function liveProbe(providerId, prepared, timeoutMs) {
  const { operation, stream, plan } = prepared;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(plan.url, {
      method: plan.method,
      headers: plan.headers,
      body: plan.bodyText || undefined,
      signal: controller.signal,
    });
    const payload = await readResponse(response, stream);
    const elapsedMs = Date.now() - started;
    const contentType = response.headers.get("content-type") || "";
    const responseKind = requestUtils.classifyResponse(response.status, contentType, plan.responseKindHint);
    const debug = requestUtils.createCanonicalDebug({
      providerId,
      protocol: plan.protocol,
      operationId: operation.id,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      elapsedMs,
      contentType,
      headers: Object.fromEntries(response.headers.entries()),
      rawText: payload.rawText,
      responseKind,
      secrets: [tokenFor(providerId)],
      source: "provider-smoke",
    });
    return {
      provider: providerId,
      operation: operation.id,
      status: response.status,
      ok: response.ok,
      contentType,
      responseKind,
      elapsedMs,
      bytes: payload.bytes,
      chunks: payload.chunks,
      textPresent: Boolean(debug.text),
      usagePresent: Boolean(debug.usage),
      finishReasonPresent: Boolean(debug.finishReason),
      errorCategory: response.ok ? null : errorCategory(response.status),
    };
  } catch (error) {
    return {
      provider: providerId,
      operation: operation.id,
      status: null,
      ok: false,
      contentType: "",
      responseKind: null,
      elapsedMs: Date.now() - started,
      bytes: 0,
      chunks: 0,
      textPresent: false,
      usagePresent: false,
      finishReasonPresent: false,
      errorCategory: errorCategory(null, error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  const results = [];
  for (const providerId of options.providers) {
    const prepared = requestPlan(providerId, options);
    if (options.dryRun) {
      results.push(dryRunSummary(providerId, prepared));
      continue;
    }
    if (!tokenFor(providerId)) {
      results.push({
        provider: providerId,
        operation: prepared.operation.id,
        status: null,
        ok: false,
        errorCategory: `missing_${providerSpecs[providerId].tokenEnv.toLowerCase()}`,
      });
      continue;
    }
    results.push(await liveProbe(providerId, prepared, options.timeoutMs));
  }
  console.log(JSON.stringify({
    mode: options.dryRun ? "dry-run" : "live",
    baseOrigin: new URL(baseUrlFor()).origin,
    results,
  }, null, 2));
  if (!options.dryRun && results.some((result) => !result.ok)) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(`provider smoke test failed: ${error.message}`);
  process.exitCode = 2;
}
