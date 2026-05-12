const ENDPOINTS = {
  chat: {
    method: "POST",
    path: "/chat/completions",
    model: "gpt-4o-mini",
    buildBody: ({ model, prompt, temperature, maxTokens, stream }) => ({
      model,
      messages: [
        {
          role: "user",
          content: prompt || "用一句话介绍 Xi AI API。",
        },
      ],
      temperature,
      max_tokens: maxTokens,
      stream,
    }),
  },
  models: {
    method: "GET",
    path: "/models",
    model: "",
    buildBody: () => null,
  },
  embeddings: {
    method: "POST",
    path: "/embeddings",
    model: "text-embedding-3-large",
    buildBody: ({ model, prompt }) => ({
      model,
      input: prompt || "Xi AI API 支持统一模型调用。",
    }),
  },
  images: {
    method: "POST",
    path: "/images/generations",
    model: "gpt-image-1",
    buildBody: ({ model, prompt }) => ({
      model,
      prompt: prompt || "一张干净的 API 控制台产品截图风格插画",
      size: "1024x1024",
      n: 1,
    }),
  },
};

const state = {
  activeResponseTab: "body",
  response: {
    body: {
      status: "ready",
      message: "填写 API Key 后点击发送测试。",
    },
    headers: {},
    insights: ["等待发起请求。"],
  },
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const refs = {
  sidebarToggle: $("#sidebarToggle"),
  docSearch: $("#docSearch"),
  baseUrl: $("#baseUrl"),
  apiKey: $("#apiKey"),
  endpointSelect: $("#endpointSelect"),
  methodBadge: $("#methodBadge"),
  modelInput: $("#modelInput"),
  promptInput: $("#promptInput"),
  temperatureInput: $("#temperatureInput"),
  maxTokensInput: $("#maxTokensInput"),
  streamInput: $("#streamInput"),
  sendRequest: $("#sendRequest"),
  copyCurl: $("#copyCurl"),
  refreshCurl: $("#refreshCurl"),
  curlOutput: $("#curlOutput"),
  copyResponse: $("#copyResponse"),
  responseStatus: $("#responseStatus"),
  responseTime: $("#responseTime"),
  responseOutput: $("#responseOutput"),
  statusLine: $("#statusLine"),
  toast: $("#toast"),
};

function normalizeBaseUrl(value) {
  return (value || "https://api.xi-ai.cn/v1").trim().replace(/\/+$/, "");
}

function getEndpoint() {
  return ENDPOINTS[refs.endpointSelect.value];
}

function getFormValues() {
  const temperature = Number.parseFloat(refs.temperatureInput.value);
  const maxTokens = Number.parseInt(refs.maxTokensInput.value, 10);

  return {
    baseUrl: normalizeBaseUrl(refs.baseUrl.value),
    apiKey: refs.apiKey.value.trim(),
    endpoint: getEndpoint(),
    model: refs.modelInput.value.trim(),
    prompt: refs.promptInput.value.trim(),
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : 256,
    stream: refs.streamInput.checked,
  };
}

function getRequestConfig() {
  const values = getFormValues();
  const body = values.endpoint.buildBody(values);
  const url = `${values.baseUrl}${values.endpoint.path}`;
  const headers = {
    Authorization: `Bearer ${values.apiKey || "$XI_API_KEY"}`,
  };

  if (body) {
    headers["Content-Type"] = "application/json";
  }

  return {
    ...values,
    url,
    body,
    headers,
    method: values.endpoint.method,
  };
}

function escapeSingleQuotedShell(value) {
  return value.replace(/'/g, "'\\''");
}

function buildCurl() {
  const config = getRequestConfig();
  const lines = [`curl --request ${config.method} '${config.url}'`];

  Object.entries(config.headers).forEach(([key, value]) => {
    lines.push(`  --header '${key}: ${escapeSingleQuotedShell(value)}'`);
  });

  if (config.body) {
    const payload = JSON.stringify(config.body, null, 2);
    lines.push(`  --data-raw '${escapeSingleQuotedShell(payload)}'`);
  }

  return lines.join(" \\\n");
}

function renderCurl() {
  refs.curlOutput.textContent = buildCurl();
}

function renderMethod() {
  const endpoint = getEndpoint();
  refs.methodBadge.textContent = endpoint.method;
  refs.methodBadge.className = `method ${endpoint.method.toLowerCase()}`;
}

function updateEndpointDefaults() {
  const endpoint = getEndpoint();
  renderMethod();

  if (endpoint.model) {
    refs.modelInput.value = endpoint.model;
    refs.modelInput.disabled = false;
  } else {
    refs.modelInput.value = "";
    refs.modelInput.disabled = true;
  }

  const isChat = refs.endpointSelect.value === "chat";
  refs.temperatureInput.disabled = !isChat;
  refs.maxTokensInput.disabled = !isChat;
  refs.streamInput.disabled = !isChat;

  renderCurl();
}

function setStatus(kind, message, time = "") {
  const dot = refs.statusLine.querySelector(".status-dot");
  dot.className = `status-dot ${kind}`;
  refs.responseStatus.textContent = message;
  refs.responseTime.textContent = time;
}

function renderResponse() {
  const selected = state.response[state.activeResponseTab];
  refs.responseOutput.textContent =
    typeof selected === "string" ? selected : JSON.stringify(selected, null, 2);
}

function activateTab(tab) {
  state.activeResponseTab = tab;
  $$(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });
  renderResponse();
}

function toHeaderObject(headers) {
  const output = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}

function buildInsights({ url, method, status, statusText, headers, body, duration }) {
  const insights = [
    `${method} ${url}`,
    `HTTP ${status} ${statusText || ""}`.trim(),
    `耗时 ${duration}ms`,
  ];

  const requestId =
    headers["x-request-id"] ||
    headers["x-correlation-id"] ||
    headers["cf-ray"] ||
    headers["x-trace-id"];
  if (requestId) {
    insights.push(`请求 ID: ${requestId}`);
  }

  const rateLimit = Object.entries(headers).filter(([key]) => key.startsWith("x-ratelimit"));
  if (rateLimit.length) {
    insights.push(`限流信息: ${rateLimit.map(([key, value]) => `${key}=${value}`).join(", ")}`);
  }

  if (body && typeof body === "object" && body.usage) {
    insights.push(`Token 用量: ${JSON.stringify(body.usage)}`);
  }

  if (body && typeof body === "object" && body.error) {
    const error = body.error;
    insights.push(`错误类型: ${error.type || error.code || "unknown"}`);
    insights.push(`错误信息: ${error.message || JSON.stringify(error)}`);
  }

  return insights;
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    showToast("浏览器阻止了复制，请手动选中文本复制。");
  }
}

let toastTimer = null;
function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => refs.toast.classList.remove("show"), 2200);
}

async function sendRequest() {
  const config = getRequestConfig();

  if (!config.apiKey) {
    state.response = {
      body: {
        error: {
          type: "missing_api_key",
          message: "请先填写 API Key，或复制 cURL 后在已设置环境变量的终端执行。",
        },
      },
      headers: {},
      insights: ["请求未发送: 缺少 API Key。"],
    };
    setStatus("error", "缺少 API Key");
    activateTab("body");
    return;
  }

  refs.sendRequest.disabled = true;
  setStatus("busy", "请求中");
  state.response = {
    body: {
      status: "loading",
      url: config.url,
    },
    headers: {},
    insights: ["请求已发出，等待响应。"],
  };
  renderResponse();

  const startedAt = performance.now();

  try {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    const duration = Math.round(performance.now() - startedAt);
    const headers = toHeaderObject(response.headers);
    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    state.response = {
      body,
      headers,
      insights: buildInsights({
        url: config.url,
        method: config.method,
        status: response.status,
        statusText: response.statusText,
        headers,
        body,
        duration,
      }),
    };

    setStatus(response.ok ? "ok" : "error", `${response.status} ${response.statusText}`, `${duration}ms`);
    activateTab("body");
  } catch (error) {
    const duration = Math.round(performance.now() - startedAt);
    state.response = {
      body: {
        error: {
          type: "network_or_cors_error",
          message: error.message,
        },
      },
      headers: {},
      insights: [
        "浏览器请求失败，常见原因是 CORS、网络不可达、证书错误或接口拒绝当前 Origin。",
        "可复制上方 cURL 在终端执行，或将本文档部署到允许的来源后重试。",
        `耗时 ${duration}ms`,
      ],
    };
    setStatus("error", "请求失败", `${duration}ms`);
    activateTab("body");
  } finally {
    refs.sendRequest.disabled = false;
  }
}

function filterNavigation(query) {
  const normalized = query.trim().toLowerCase();

  $$(".side-nav a").forEach((link) => {
    const target = document.querySelector(link.getAttribute("href"));
    const text = `${link.textContent} ${target ? target.textContent : ""}`.toLowerCase();
    link.classList.toggle("hidden", normalized && !text.includes(normalized));
  });
}

function setupScrollSpy() {
  const sections = $$(".doc-section, .tester");
  const navLinks = $$(".side-nav a");

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (!visible) return;

      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
      });
    },
    {
      rootMargin: "-12% 0px -70% 0px",
      threshold: [0.08, 0.2, 0.6],
    },
  );

  sections.forEach((section) => observer.observe(section));
}

function setupCopyButtons() {
  $$("[data-copy-source]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = document.getElementById(button.dataset.copySource);
      if (source) {
        copyText(source.textContent, "示例已复制。");
      }
    });
  });
}

function setupListeners() {
  refs.sidebarToggle.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  $$(".side-nav a").forEach((link) => {
    link.addEventListener("click", () => document.body.classList.remove("sidebar-open"));
  });

  refs.docSearch?.addEventListener("input", (event) => filterNavigation(event.target.value));

  [
    refs.baseUrl,
    refs.apiKey,
    refs.modelInput,
    refs.promptInput,
    refs.temperatureInput,
    refs.maxTokensInput,
    refs.streamInput,
  ].forEach((input) => {
    input.addEventListener("input", renderCurl);
    input.addEventListener("change", renderCurl);
  });

  refs.endpointSelect.addEventListener("change", updateEndpointDefaults);
  refs.refreshCurl.addEventListener("click", renderCurl);
  refs.copyCurl.addEventListener("click", () => copyText(refs.curlOutput.textContent, "cURL 已复制。"));
  refs.copyResponse.addEventListener("click", () =>
    copyText(refs.responseOutput.textContent, "响应内容已复制。"),
  );
  refs.sendRequest.addEventListener("click", sendRequest);

  $$(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setupListeners();
  setupCopyButtons();
  setupScrollSpy();
  updateEndpointDefaults();
  renderResponse();

  if (window.lucide) {
    window.lucide.createIcons();
  }
});
