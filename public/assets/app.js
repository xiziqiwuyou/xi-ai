const requestUtils = window.NewApiRequestUtils;

const state = {
  data: null,
  filtered: [],
  activeId: null,
  filter: "all",
  providerFilter: "all",
  curlMode: "bash",
  codeMode: "javascript",
  responseView: "raw",
  request: null,
  operationOverride: null,
  operationSelection: null,
  abortController: null,
  requestRunId: 0,
  responseObjectUrl: null,
  lastDebug: null,
  syncAbortController: null,
  syncRunId: 0,
  modelSyncPreview: null,
  syncedModels: {},
  testerTrigger: null,
};

const els = {
  search: document.getElementById("searchInput"),
  nav: document.getElementById("navList"),
  resultCount: document.getElementById("resultCount"),
  stats: document.getElementById("stats"),
  endpointView: document.getElementById("endpointView"),
  baseUrl: document.getElementById("baseUrl"),
  token: document.getElementById("apiToken"),
  rememberToken: document.getElementById("rememberToken"),
  clearToken: document.getElementById("clearToken"),
  saveConfig: document.getElementById("saveConfig"),
  configStatus: document.getElementById("configStatus"),
  tester: document.querySelector(".tester"),
  openTester: document.getElementById("openTester"),
  closeTester: document.getElementById("closeTester"),
  testerBackdrop: document.getElementById("testerBackdrop"),
  launcherMethod: document.getElementById("launcherMethod"),
  launcherLabel: document.getElementById("launcherLabel"),
  launcherPath: document.getElementById("launcherPath"),
  testerHeaderContext: document.getElementById("testerHeaderContext"),
  testerMethod: document.getElementById("testerMethod"),
  testerPath: document.getElementById("testerPath"),
  testerMode: document.getElementById("testerMode"),
  testerAvailability: document.getElementById("testerAvailability"),
  modelConsole: document.getElementById("modelConsole"),
  modelStatus: document.getElementById("modelStatus"),
  providerSelect: document.getElementById("providerSelect"),
  authProfileSelect: document.getElementById("authProfileSelect"),
  modelSelect: document.getElementById("modelSelect"),
  modelCustom: document.getElementById("modelCustom"),
  operationSelect: document.getElementById("operationSelect"),
  streamToggle: document.getElementById("streamToggle"),
  syncModels: document.getElementById("syncModels"),
  modelSyncStatus: document.getElementById("modelSyncStatus"),
  modelSyncPreview: document.getElementById("modelSyncPreview"),
  curlBox: document.getElementById("curlBox"),
  codeExampleBox: document.getElementById("codeExampleBox"),
  copyCurl: document.getElementById("copyCurl"),
  copyCode: document.getElementById("copyCode"),
  pathFields: document.getElementById("pathFields"),
  pathFieldList: document.getElementById("pathFieldList"),
  queryFields: document.getElementById("queryFields"),
  queryFieldList: document.getElementById("queryFieldList"),
  headerFields: document.getElementById("headerFields"),
  headerFieldList: document.getElementById("headerFieldList"),
  noParameterFields: document.getElementById("noParameterFields"),
  parameterSummary: document.getElementById("parameterSummary"),
  jsonEditorSection: document.getElementById("jsonEditorSection"),
  requestBody: document.getElementById("requestBody"),
  bodyValidation: document.getElementById("bodyValidation"),
  formatJson: document.getElementById("formatJson"),
  resetRequest: document.getElementById("resetRequest"),
  multipartEditorSection: document.getElementById("multipartEditorSection"),
  multipartFieldList: document.getElementById("multipartFieldList"),
  requestForm: document.getElementById("requestForm"),
  sendRequest: document.getElementById("sendRequest"),
  cancelRequest: document.getElementById("cancelRequest"),
  responseMeta: document.getElementById("responseMeta"),
  responseHeaders: document.getElementById("responseHeaders"),
  responseMedia: document.getElementById("responseMedia"),
  responseBox: document.getElementById("responseBox"),
  responseDebug: document.getElementById("responseDebug"),
  copyResponse: document.getElementById("copyResponse"),
  clearResponse: document.getElementById("clearResponse"),
};

const testerMedia = window.matchMedia("(max-width: 1180px)");
window.addEventListener("resize", syncTesterDrawer);

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function prettyJson(value) {
  return requestUtils.prettyJson(value);
}

function getActiveEndpoint() {
  return state.filtered.find((endpoint) => endpoint.id === state.activeId) || null;
}

function getRegistry() {
  return state.data?.providerRegistry || { providers: [], authProfiles: [], operations: [] };
}

function getProvider(providerId) {
  return requestUtils.findProvider(getRegistry(), providerId);
}

function getOperation(operationId) {
  return requestUtils.findOperation(getRegistry(), operationId);
}

function getAuthProfile(profileId) {
  return requestUtils.findAuthProfile(getRegistry(), profileId);
}

function getCurrentProviderId() {
  const endpoint = getActiveEndpoint();
  return state.request?.providerId || endpoint?.providerId || endpoint?.providerIds?.[0] || "openai";
}

function getCurrentOperation() {
  const endpoint = getActiveEndpoint();
  if (!endpoint) return null;
  return state.operationOverride || getOperation(state.request?.operationId) || getOperation(endpoint.operationIds?.[0]);
}

function getCurrentProvider() {
  return getProvider(getCurrentProviderId()) || getRegistry().providers[0] || null;
}

function providerLabel(providerId) {
  return getProvider(providerId)?.name || providerId || "Provider";
}

function operationLabel(operation) {
  if (!operation) return "兼容协议";
  return `${operation.label || operation.id} · ${operation.protocol || "protocol"}`;
}

function endpointSupportsProvider(endpoint, providerId) {
  return (endpoint?.providerIds || [endpoint?.providerId || "openai"]).includes(providerId);
}

function normalizeBaseUrl() {
  return els.baseUrl.value.trim().replace(/\/+$/, "");
}

function methodClass(method) {
  return String(method || "get").toLowerCase();
}

function modeLabel(mode) {
  return {
    json: "JSON 请求",
    multipart: "Multipart 表单",
    none: "无请求体",
    raw: "原始请求体",
  }[mode] || "请求配置";
}

function kindLabel(kind) {
  return {
    json: "JSON",
    stream: "SSE 流",
    binary: "二进制",
    websocket: "WebSocket",
    text: "文本",
    empty: "空响应",
  }[kind] || "响应";
}

function kindClass(kind) {
  return String(kind || "text").replace(/[^a-z]/gi, "").toLowerCase() || "text";
}

function isEndpointRunnable(endpoint) {
  return Boolean(endpoint && !endpoint.documentationOnly);
}

function endpointHash(id) {
  return `#endpoint=${encodeURIComponent(id)}`;
}

function endpointIdFromHash() {
  return new URLSearchParams(window.location.hash.replace(/^#/, "")).get("endpoint");
}

function updateEndpointHash(id) {
  if (!id) return;
  const nextHash = endpointHash(id);
  const currentHash = window.location.hash;
  if (currentHash.includes("figmacapture=")) {
    const captureParams = new URLSearchParams(currentHash.replace(/^#/, ""));
    captureParams.set("endpoint", id);
    const captureHash = `#${captureParams.toString()}`;
    if (currentHash !== captureHash) history.replaceState(null, "", captureHash);
    return;
  }
  if (currentHash !== nextHash) history.replaceState(null, "", nextHash);
}

function setButtonSelection(selector, predicate, attribute = "aria-pressed") {
  document.querySelectorAll(selector).forEach((button) => {
    const selected = Boolean(predicate(button));
    button.classList.toggle("active", selected);
    button.setAttribute(attribute, String(selected));
    if (attribute === "aria-selected") button.tabIndex = selected ? 0 : -1;
  });
}

function resetFilters() {
  state.filter = "all";
  state.providerFilter = "all";
  els.search.value = "";
  state.filtered = state.data.endpoints.slice();
  setButtonSelection(".filter", (button) => button.dataset.filter === "all");
  setButtonSelection(".provider-filter", (button) => button.dataset.providerFilter === "all");
}

function renderStats() {
  const { coverage, categories } = state.data;
  const providers = getRegistry().providers || [];
  const modelCount = providers.reduce((count, provider) => count + (provider.modelCatalog || []).length, 0);
  const stats = [
    ["接口", coverage.endpointCount, "Total"],
    ["Provider", providers.length, "Families"],
    ["模型种子", modelCount, "Catalog"],
    ["Sitemap", coverage.sitemapCount, "Mirror"],
  ];
  els.stats.innerHTML = stats
    .map(
      ([label, value, meta]) => `
        <div class="stat">
          <span>${escapeHtml(meta)}</span>
          <strong>${escapeHtml(value)}</strong>
          <small>${escapeHtml(label)}</small>
        </div>
      `,
    )
    .join("");
}

function filterEndpoints() {
  const q = els.search.value.trim().toLowerCase();
  state.filtered = state.data.endpoints.filter((endpoint) => {
    const methodOk = state.filter === "all" || endpoint.method.toLowerCase() === state.filter;
    const providerOk = state.providerFilter === "all" || endpointSupportsProvider(endpoint, state.providerFilter);
    const fields = endpoint.requestBody?.fields || [];
    const haystack = [
      endpoint.title,
      endpoint.path,
      endpoint.category,
      endpoint.operationId,
      endpoint.description,
      endpoint.requestMode,
      ...(endpoint.providerIds || []).map(providerLabel),
      ...(endpoint.protocols || []),
      ...endpoint.parameters.map((param) => `${param.name} ${param.description}`),
      ...fields.map((field) => `${field.name} ${field.description}`),
    ]
      .join(" ")
      .toLowerCase();
    return methodOk && providerOk && (!q || haystack.includes(q));
  });
  if (!state.filtered.some((endpoint) => endpoint.id === state.activeId)) {
    state.activeId = state.filtered[0]?.id || null;
  }
}

function groupByCategory(endpoints) {
  return endpoints.reduce((acc, endpoint) => {
    if (!acc[endpoint.category]) acc[endpoint.category] = [];
    acc[endpoint.category].push(endpoint);
    return acc;
  }, {});
}

function renderNav() {
  const groups = groupByCategory(state.filtered);
  els.resultCount.textContent = `${state.filtered.length} 个`;
  if (!state.filtered.length) {
    els.nav.innerHTML = `<div class="empty-state">没有匹配的接口。请调整搜索词或方法筛选。</div>`;
    return;
  }
  els.nav.innerHTML = Object.entries(groups)
    .map(
      ([category, endpoints]) => `
        <div class="nav-group">
          <div class="nav-group-title"><span>${escapeHtml(category)}</span><strong>${endpoints.length}</strong></div>
          ${endpoints
            .map(
              (endpoint) => `
                <button class="nav-link ${endpoint.id === state.activeId ? "active" : ""}" data-id="${escapeHtml(endpoint.id)}" type="button" ${endpoint.id === state.activeId ? 'aria-current="page"' : ""}>
                  <span class="nav-title">
                    <span class="method ${methodClass(endpoint.method)}">${escapeHtml(endpoint.method)}</span>
                    <span>${escapeHtml(endpoint.title)}</span>
                  </span>
                  <span class="nav-meta">
                    <span class="nav-path">${escapeHtml(endpoint.path)}</span>
                    ${endpoint.documentationOnly ? '<span class="nav-doc-only">仅文档</span>' : ""}
                    ${(endpoint.routeVariantIds || []).length > 1 ? `<span class="nav-variant-count" title="同路径文档变体">${endpoint.routeVariantIds.length} 变体</span>` : ""}
                  </span>
                </button>
              `,
            )
            .join("")}
        </div>
      `,
    )
    .join("");
}

function formatExample(value) {
  if (value === undefined || value === null || value === "") return "-";
  return typeof value === "object" ? prettyJson(value) : String(value);
}

function renderParamTable(params) {
  if (!params.length) return `<p class="empty">无参数。</p>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>名称</th><th>位置</th><th>类型</th><th>默认/示例</th><th>必填</th><th>说明</th></tr></thead>
        <tbody>
          ${params
            .map(
              (param) => `
                <tr>
                  <td><code>${escapeHtml(param.name)}</code></td>
                  <td><span class="table-chip">${escapeHtml(param.in)}</span></td>
                  <td><code>${escapeHtml(param.type)}${param.format ? ` · ${param.format}` : ""}</code></td>
                  <td><code>${escapeHtml(formatExample(param.default ?? param.example))}</code></td>
                  <td>${param.required ? '<span class="required">是</span>' : '<span class="optional">否</span>'}</td>
                  <td>${escapeHtml(param.description)}${param.enum?.length ? `<br><span class="enum-note">${escapeHtml(param.enum.join(" | "))}</span>` : ""}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSchemaRows(rows) {
  if (!rows || !rows.length) return `<p class="empty">无结构化 Schema。</p>`;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th><th>示例</th></tr></thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td><code>${escapeHtml(row.name)}</code></td>
                  <td><code>${escapeHtml(row.type)}</code>${row.enum?.length ? `<br><span class="enum-note">${escapeHtml(row.enum.join(" | "))}</span>` : ""}</td>
                  <td>${row.required ? '<span class="required">是</span>' : '<span class="optional">否</span>'}</td>
                  <td>${escapeHtml(row.description)}</td>
                  <td><code>${escapeHtml(formatExample(row.example))}</code></td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderResponses(endpoint) {
  if (!endpoint.responses.length) return `<p class="empty">无响应定义。</p>`;
  return endpoint.responses
    .map(
      (response) => `
        <section class="response-doc section">
          <div class="response-doc-head">
            <div>
              <h3>响应 ${escapeHtml(response.status)}</h3>
              <p class="description">${escapeHtml(response.description)}</p>
            </div>
            <div class="response-badges">
              <span class="response-kind ${kindClass(response.kind)}">${escapeHtml(kindLabel(response.kind))}</span>
              ${response.contentTypes?.length ? `<span class="table-chip">${escapeHtml(response.contentTypes.join(" / "))}</span>` : ""}
            </div>
          </div>
          ${renderSchemaRows(response.schemaRows)}
          ${response.example !== null && response.example !== undefined && response.kind !== "binary" ? `<h4 class="subheading">示例</h4><pre class="code">${escapeHtml(prettyJson(response.example))}</pre>` : ""}
        </section>
      `,
    )
    .join("");
}

function renderProviderSummary(endpoint) {
  const providerIds = endpoint.providerIds || [endpoint.providerId || "openai"];
  const providers = providerIds.map((providerId) => getProvider(providerId)).filter(Boolean);
  const operationIds = endpoint.operationIds || [];
  const operations = operationIds.map(getOperation).filter(Boolean);
  const modelIds = providers
    .flatMap((provider) => provider.modelCatalog || [])
    .slice(0, 8)
    .map((model) => model.id);
  return `
    <section class="provider-summary section">
      <div class="section-title-row"><h3>Provider 适配</h3><span class="section-count">${providers.length} 个 family</span></div>
      <div class="provider-summary-grid">
        <div><span class="summary-label">服务商</span><strong>${escapeHtml(providers.map((provider) => provider.name).join(" / ") || "OpenAI-compatible")}</strong></div>
        <div><span class="summary-label">协议</span><strong>${escapeHtml(operations.map((operation) => operation.protocol).join(" / ") || endpoint.protocols?.join(" / ") || "兼容协议")}</strong></div>
        <div><span class="summary-label">认证</span><strong>${escapeHtml((endpoint.authProfileIds || []).map((id) => getAuthProfile(id)?.label || id).join(" / ") || "Bearer")}</strong></div>
      </div>
      ${modelIds.length ? `<div class="model-tags"><span class="summary-label">手册模型种子</span>${modelIds.map((modelId) => `<code>${escapeHtml(modelId)}</code>`).join("")}</div>` : ""}
      <p class="field-hint provider-disclaimer">模型种子仅用于请求示例，显示为未验证；可在右侧同步预览后确认当前网关实际可用模型。</p>
    </section>
  `;
}

function renderRouteVariants(endpoint) {
  const ids = endpoint.routeVariantIds || [];
  if (ids.length < 2) return "";
  const variants = ids
    .map((id) => state.data.endpoints.find((item) => item.id === id))
    .filter(Boolean);
  return `
    <section class="route-variants section" aria-labelledby="routeVariantsTitle">
      <div class="section-title-row">
        <div>
          <h3 id="routeVariantsTitle">同路径文档变体</h3>
          <p class="section-note">这些文档共享 <code>${escapeHtml(endpoint.routeKey)}</code>，但保留各自的来源语义与 Schema。</p>
        </div>
        <span class="section-count">${variants.length} 个来源</span>
      </div>
      <div class="variant-list">
        ${variants.map((variant) => `
          <button class="variant-button ${variant.id === endpoint.id ? "active" : ""}" type="button" data-variant-id="${escapeHtml(variant.id)}" ${variant.id === endpoint.id ? 'aria-current="page"' : ""}>
            <span>${escapeHtml(variant.category)}</span>
            <strong>${escapeHtml(variant.title)}</strong>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderEndpoint() {
  const endpoint = getActiveEndpoint();
  if (!endpoint) {
    els.endpointView.innerHTML = `
      <section class="endpoint-empty" role="status">
        <span>NO MATCHES</span>
        <h2>没有匹配的接口</h2>
        <p>请调整搜索词或方法筛选。</p>
      </section>
    `;
    return;
  }
  const bodyInfo = endpoint.requestBody;
  const responseKinds = [...new Set((endpoint.responses || []).map((response) => response.kind).filter(Boolean))];
  els.endpointView.innerHTML = `
    <article class="endpoint-card selected" id="endpoint-${escapeHtml(endpoint.id)}">
      <header class="endpoint-head">
        <div class="endpoint-kicker">
          <span class="method ${methodClass(endpoint.method)}">${escapeHtml(endpoint.method)}</span>
          <span>${escapeHtml(endpoint.category)}</span>
          <span>${escapeHtml(modeLabel(endpoint.requestMode || bodyInfo?.requestMode || "none"))}</span>
          ${endpoint.supportsStreaming ? '<span class="stream-badge">支持流式</span>' : ""}
          <span>operationId: <code>${escapeHtml(endpoint.operationId || "-")}</code></span>
        </div>
        <div class="endpoint-heading">
          <div>
            <span class="endpoint-label">Selected endpoint</span>
            <h2>${escapeHtml(endpoint.title)}</h2>
          </div>
          <span class="endpoint-status ${endpoint.documentationOnly ? "documentation" : "runnable"}">${endpoint.documentationOnly ? "仅文档" : "可在线测试"}</span>
        </div>
        <div class="pathline">
          <span class="method ${methodClass(endpoint.method)}">${escapeHtml(endpoint.method)}</span>
          <code>${escapeHtml(endpoint.path)}</code>
        </div>
        <p class="description">${escapeHtml(endpoint.description)}</p>
        ${endpoint.documentationOnly ? `
          <div class="endpoint-notice" role="status">
            <strong>仅文档</strong>
            <span>源文档标记该端点尚未实现或仅声明 501。你仍可查看 Schema 与生成示例，但在线发送已停用。</span>
          </div>
        ` : ""}
        <div class="source-line">
          <a href="${escapeHtml(endpoint.sourceUrl)}" target="_blank" rel="noreferrer">源站页面</a>
          <span>${escapeHtml(endpoint.mdxPath)}</span>
          <span>${escapeHtml(endpoint.openapiPath)}</span>
          <button class="source-action" type="button" data-copy-endpoint-link>复制接口链接</button>
        </div>
      </header>
      ${renderRouteVariants(endpoint)}
      ${renderProviderSummary(endpoint)}
      <section class="section">
        <div class="section-title-row"><h3>请求参数</h3><span class="section-count">${endpoint.parameters.length} 项</span></div>
        ${renderParamTable(endpoint.parameters)}
      </section>
      <section class="section">
        <div class="section-title-row"><h3>请求体 ${bodyInfo?.contentType ? `· ${escapeHtml(bodyInfo.contentType)}` : ""}</h3><span class="section-count">${bodyInfo ? escapeHtml(modeLabel(bodyInfo.requestMode || endpoint.requestMode)) : "无 body"}</span></div>
        ${bodyInfo ? renderSchemaRows(bodyInfo.schemaRows) : '<p class="empty">无请求体。</p>'}
        ${bodyInfo?.example ? `<h4 class="subheading">请求示例</h4><pre class="code">${escapeHtml(prettyJson(bodyInfo.example))}</pre>` : ""}
      </section>
      <section class="section response-summary">
        <div class="section-title-row"><h3>响应定义</h3><span class="section-count">${endpoint.responses.length} 个状态 · ${escapeHtml(responseKinds.map(kindLabel).join(" / "))}</span></div>
      </section>
      ${renderResponses(endpoint)}
    </article>
  `;
}

function fieldId(location, name) {
  return `request-${location}-${String(name).replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

function inputTypeFor(parameter) {
  if (parameter.type?.includes("integer") || parameter.type?.includes("number")) return "number";
  return "text";
}

function getParameterEditorValue(location, name) {
  const key = location === "header" ? "headers" : location;
  return state.request?.[key]?.[name] ?? "";
}

function renderParameterInput(parameter, location) {
  const id = fieldId(location, parameter.name);
  const required = parameter.required ? '<span class="required-mark" aria-hidden="true">*</span>' : "";
  const hint = [parameter.description, parameter.format, parameter.enum?.length ? `可选：${parameter.enum.join(" | ")}` : ""].filter(Boolean).join(" · ");
  const currentValue = getParameterEditorValue(location, parameter.name);
  if (parameter.enum?.length) {
    return `
      <label class="request-field" for="${escapeHtml(id)}">
        <span class="request-field-label"><span>${escapeHtml(parameter.name)}</span>${required}</span>
        <select id="${escapeHtml(id)}" data-request-location="${escapeHtml(location)}" data-param-name="${escapeHtml(parameter.name)}" ${parameter.required ? 'aria-required="true"' : ""}>
          ${!parameter.required ? '<option value="">未设置</option>' : ""}
          ${parameter.enum.map((item) => `<option value="${escapeHtml(item)}" ${String(item) === String(currentValue) ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select>
        ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
      </label>
    `;
  }
  return `
    <label class="request-field" for="${escapeHtml(id)}">
      <span class="request-field-label"><span>${escapeHtml(parameter.name)}</span>${required}</span>
    <input id="${escapeHtml(id)}" type="${inputTypeFor(parameter)}" value="${escapeHtml(currentValue)}" placeholder="${escapeHtml(parameter.example ?? parameter.default ?? "")}" data-request-location="${escapeHtml(location)}" data-param-name="${escapeHtml(parameter.name)}" ${parameter.required ? 'aria-required="true"' : ""} />
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </label>
  `;
}

function renderParameterGroup(location, wrapper, list) {
  const endpoint = getActiveEndpoint();
  const parameters = requestUtils.parameterList(endpoint, location);
  wrapper.hidden = parameters.length === 0;
  list.innerHTML = parameters.map((parameter) => renderParameterInput(parameter, location)).join("");
  return parameters.length;
}

function renderMultipartFields(endpoint) {
  const fields = endpoint.requestBody?.fields || [];
  if (!fields.length) {
    els.multipartFieldList.innerHTML = '<p class="empty tester-empty">该接口没有可编辑的 multipart 字段。</p>';
    return;
  }
  els.multipartFieldList.innerHTML = fields
    .map((field) => {
      const current = state.request.multipart[field.name] || { value: "", file: null, curlPath: "" };
      const id = fieldId("multipart", field.name);
      const required = field.required ? '<span class="required-mark" aria-hidden="true">*</span>' : "";
      const hint = [field.description, field.format, field.type].filter(Boolean).join(" · ");
      const control = field.isBinary
        ? `<input id="${escapeHtml(id)}" type="file" data-multipart-name="${escapeHtml(field.name)}" ${field.required ? 'aria-required="true"' : ""} />`
        : field.enum?.length
          ? `<select id="${escapeHtml(id)}" data-multipart-name="${escapeHtml(field.name)}" ${field.required ? 'aria-required="true"' : ""}>
              ${!field.required ? '<option value="">未设置</option>' : ""}
              ${field.enum.map((item) => `<option value="${escapeHtml(item)}" ${String(item) === String(current.value) ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
            </select>`
          : `<input id="${escapeHtml(id)}" type="${field.type?.includes("number") || field.type?.includes("integer") ? "number" : "text"}" value="${escapeHtml(current.value)}" placeholder="${escapeHtml(field.example ?? field.default ?? "")}" data-multipart-name="${escapeHtml(field.name)}" ${field.required ? 'aria-required="true"' : ""} />`;
      return `
        <div class="multipart-field">
          <label class="request-field" for="${escapeHtml(id)}">
            <span class="request-field-label"><span>${escapeHtml(field.name)}</span>${required}</span>
            ${control}
            ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
          </label>
          ${field.isBinary ? `<label class="request-field curl-path-field" for="${escapeHtml(`${id}-curl`)}"><span class="request-field-label"><span>curl 文件路径</span></span><input id="${escapeHtml(`${id}-curl`)}" type="text" value="${escapeHtml(current.curlPath || `/path/to/${field.name}`)}" data-curl-path-name="${escapeHtml(field.name)}" placeholder="/path/to/file" /><small>仅用于生成终端命令</small></label>` : ""}
        </div>
      `;
    })
    .join("");
}

function getRequestModel(endpoint) {
  const binding = getCurrentOperation()?.modelBinding || endpoint?.modelBinding;
  if (!state.request || !binding) return "";
  if (binding.location === "path") return state.request.path?.[binding.name] || "";
  if (binding.location === "body") {
    try {
      return JSON.parse(state.request.jsonText || "{}")[binding.name] || "";
    } catch {
      return "";
    }
  }
  return "";
}

function providerModels(providerId) {
  const provider = getProvider(providerId);
  const seeded = provider?.modelCatalog || [];
  const synced = state.syncedModels[providerId] || [];
  const models = [...seeded, ...synced];
  const seen = new Set();
  return models.filter((model) => {
    if (!model?.id || seen.has(model.id)) return false;
    seen.add(model.id);
    return true;
  });
}

function operationsForProvider(providerId) {
  return (getRegistry().operations || []).filter((operation) => operation.providerId === providerId && operation.endpointIds?.length);
}

function endpointOperations(endpoint, providerId) {
  const operationIds = new Set(endpoint?.operationIds || []);
  return operationsForProvider(providerId).filter((operation) => operationIds.has(operation.id));
}

function renderModelSyncPreview() {
  const preview = state.modelSyncPreview;
  if (!preview) {
    els.modelSyncPreview.hidden = true;
    els.modelSyncPreview.innerHTML = "";
    return;
  }
  const modelNames = preview.models.slice(0, 16).map((model) => model.id).join("、");
  els.modelSyncPreview.hidden = false;
  els.modelSyncPreview.innerHTML = `
    <div class="sync-preview-head"><strong>发现 ${preview.models.length} 个模型</strong><span>${escapeHtml(providerLabel(preview.providerId))} · ${escapeHtml(preview.fetchedAt)}</span></div>
    <p>${escapeHtml(modelNames || "上游没有返回模型")}${preview.models.length > 16 ? " …" : ""}</p>
    <div class="sync-preview-actions"><button id="applySyncedModels" class="text-button" type="button">应用到当前会话</button><button id="dismissModelPreview" class="text-button" type="button">关闭预览</button></div>
  `;
}

function renderModelConsole() {
  const endpoint = getActiveEndpoint();
  if (!endpoint || !state.request) {
    els.modelConsole.hidden = true;
    els.modelSyncPreview.hidden = true;
    return;
  }
  els.modelConsole.hidden = false;
  const registry = getRegistry();
  const endpointProviderIds = endpoint.providerIds?.length ? endpoint.providerIds : [endpoint.providerId || "openai"];
  if (!endpointProviderIds.includes(state.request.providerId)) {
    state.request.providerId = endpointProviderIds[0];
  }
  const providerId = state.request.providerId;
  const provider = getProvider(providerId);
  const operations = operationsForProvider(providerId);
  const matchingOperations = endpointOperations(endpoint, providerId);
  if (matchingOperations.length && !matchingOperations.some((operation) => operation.id === state.request.operationId)) {
    state.request.operationId = matchingOperations[0].id;
  }
  if (!matchingOperations.length && !state.operationOverride) state.request.operationId = null;
  const operation = getCurrentOperation() || getOperation(state.request.operationId);
  const profiles = (registry.authProfiles || []).filter((profile) =>
    (profile.providerIds || []).includes(providerId) &&
    (!(endpoint.authProfileIds || []).length || endpoint.authProfileIds.includes(profile.id)),
  );
  if (!profiles.some((profile) => profile.id === state.request.authProfileId)) {
    state.request.authProfileId = operation?.authProfileIds?.[0] || provider?.defaultAuthProfile || profiles[0]?.id || null;
  }
  const currentModel = getRequestModel(endpoint);
  const models = providerModels(providerId);
  const modelInCatalog = models.some((model) => model.id === currentModel);
  els.providerSelect.innerHTML = endpointProviderIds
    .map((id) => `<option value="${escapeHtml(id)}" ${id === providerId ? "selected" : ""}>${escapeHtml(providerLabel(id))}</option>`)
    .join("");
  els.authProfileSelect.innerHTML = profiles
    .map((profile) => `<option value="${escapeHtml(profile.id)}" ${profile.id === state.request.authProfileId ? "selected" : ""}>${escapeHtml(profile.label)}</option>`)
    .join("");
  const operationOptions = matchingOperations.length ? matchingOperations : operations;
  const selectedOperationId = state.operationSelection || state.request.operationId || operation?.id || "";
  els.operationSelect.innerHTML = `${matchingOperations.length ? "" : '<option value="">当前接口：兼容协议</option>'}${operationOptions
    .map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === selectedOperationId ? "selected" : ""}>${escapeHtml(operationLabel(item))}</option>`)
    .join("")}`;
  const hasModelBinding = Boolean(operation?.modelBinding || endpoint.modelBinding);
  els.modelSelect.innerHTML = `${hasModelBinding ? models
    .map((model) => `<option value="${escapeHtml(model.id)}" ${model.id === currentModel ? "selected" : ""}>${escapeHtml(model.label || model.id)} · ${escapeHtml(model.source || "manual")}</option>`)
    .join("") : '<option value="">该 operation 不使用模型</option>'}${hasModelBinding ? `<option value="__custom__" ${currentModel && !modelInCatalog ? "selected" : ""}>自定义模型 ID</option>` : ""}`;
  els.modelSelect.disabled = !hasModelBinding;
  els.modelCustom.hidden = !hasModelBinding || modelInCatalog || !currentModel;
  els.modelCustom.disabled = !hasModelBinding;
  els.modelCustom.value = modelInCatalog ? "" : currentModel;
  const streamCapable = Boolean(endpoint.supportsStreaming || operation?.stream);
  els.streamToggle.disabled = !streamCapable;
  els.streamToggle.checked = Boolean(state.request.stream || (() => {
    try { return JSON.parse(state.request.jsonText || "{}").stream === true; } catch { return false; }
  })());
  els.modelStatus.textContent = `${provider?.family || providerId} · ${operation?.protocol || "兼容协议"} · ${getAuthProfile(state.request.authProfileId)?.label || "无认证"}`;
  els.modelSyncStatus.textContent = state.syncedModels[providerId]?.length
    ? `当前会话已应用 ${state.syncedModels[providerId].length} 个上游模型；手册模型仍标记为未验证。`
    : provider?.description || "模型列表来自手册种子，尚未验证。";
  renderModelSyncPreview();
}

function setRequestModel(model) {
  const endpoint = getActiveEndpoint();
  if (!endpoint || !state.request || requestUtils.isBlank(model)) return;
  state.request = requestUtils.applyModelToRequest(state.request, endpoint, model);
  renderRequestEditors();
  renderModelConsole();
  refreshRequestOutput();
}

function setStreamPreference(value) {
  const endpoint = getActiveEndpoint();
  if (!endpoint || !state.request) return;
  state.request.stream = Boolean(value);
  const operation = getCurrentOperation();
  const protocol = operation?.protocol || "";
  const streamInBody = protocol.startsWith("openai-") || protocol === "claude-messages";
  try {
    const body = JSON.parse(state.request.jsonText || "{}");
    if (streamInBody && body && typeof body === "object" && !Array.isArray(body)) {
      body.stream = Boolean(value);
      state.request.jsonText = prettyJson(body);
      els.requestBody.value = state.request.jsonText;
    }
  } catch {
    // Keep invalid JSON untouched; the existing validation message remains authoritative.
  }
  renderModelConsole();
  refreshRequestOutput();
}

function handleProviderChange(providerId) {
  const endpoint = getActiveEndpoint();
  const provider = getProvider(providerId);
  if (!endpoint || !state.request || !provider) return;
  const operation = endpointOperations(endpoint, providerId)[0] || null;
  invalidateRequestRun();
  state.operationOverride = operation;
  state.operationSelection = operation?.id || null;
  state.request = requestUtils.createRequestState(endpoint, {
    registry: getRegistry(),
    operation,
    authProfileId: operation?.authProfileIds?.[0] || provider.defaultAuthProfile || null,
  });
  state.request.providerId = providerId;
  state.request.operationId = operation?.id || null;
  if (provider.defaultModel && (operation?.modelBinding || endpoint.modelBinding)) {
    state.request = requestUtils.applyModelToRequest(state.request, endpoint, provider.defaultModel);
  }
  clearResponse();
  renderEndpoint();
  renderTester();
}

function loadOperation(operation) {
  if (!operation) return;
  const endpoint = state.data.endpoints.find((item) => operation.endpointIds?.includes(item.id));
  if (!endpoint) return;
  invalidateRequestRun();
  state.operationOverride = operation;
  state.operationSelection = operation.id;
  resetFilters();
  state.activeId = endpoint.id;
  state.request = requestUtils.createRequestState(endpoint, {
    registry: getRegistry(),
    operation,
    providerId: operation.providerId,
    authProfileId: operation.authProfileIds?.[0] || null,
  });
  state.request.operationId = operation.id;
  state.request.providerId = operation.providerId;
  state.request.authProfileId = operation.authProfileIds?.[0] || state.request.authProfileId;
  const provider = getProvider(operation.providerId);
  if (provider?.defaultModel && (operation.modelBinding || endpoint.modelBinding)) {
    state.request = requestUtils.applyModelToRequest(state.request, endpoint, provider.defaultModel);
  }
  clearResponse();
  updateEndpointHash(endpoint.id);
  renderNav();
  renderEndpoint();
  renderTester();
}

function handleOperationSelection(operationId) {
  const operation = getOperation(operationId);
  const endpoint = getActiveEndpoint();
  if (!endpoint) return;
  if (!operation) {
    setRequestForEndpoint(endpoint);
    renderEndpoint();
    renderTester();
    return;
  }
  state.operationSelection = operation.id;
  if (!operation.endpointIds?.includes(endpoint.id)) {
    loadOperation(operation);
    return;
  }
  const currentModel = getRequestModel(endpoint);
  invalidateRequestRun();
  state.operationOverride = operation;
  state.request = requestUtils.createRequestState(endpoint, {
    registry: getRegistry(),
    operation,
    authProfileId: operation.authProfileIds?.[0] || null,
  });
  state.request.providerId = operation.providerId;
  state.request.operationId = operation.id;
  if (currentModel) state.request = requestUtils.applyModelToRequest(state.request, endpoint, currentModel);
  clearResponse();
  renderEndpoint();
  renderTester();
}

function applySyncedModels() {
  const preview = state.modelSyncPreview;
  if (!preview) return;
  state.syncedModels[preview.providerId] = preview.models.slice();
  state.modelSyncPreview = null;
  els.modelSyncStatus.className = "field-hint valid";
  els.modelSyncStatus.textContent = `已应用 ${state.syncedModels[preview.providerId].length} 个上游模型到当前会话；未写入仓库或浏览器存储。`;
  renderModelConsole();
}

function dismissModelPreview() {
  state.modelSyncPreview = null;
  renderModelSyncPreview();
}

async function syncModels() {
  const provider = getCurrentProvider();
  const registry = getRegistry();
  const listOperation = provider && getOperation(provider.listOperationId);
  const endpoint = listOperation && state.data.endpoints.find((item) => listOperation.endpointIds?.includes(item.id));
  if (!provider || !listOperation || !endpoint) return;
  const base = normalizeBaseUrl();
  if (!base) {
    els.modelSyncStatus.textContent = "请先填写 Base URL。";
    els.modelSyncStatus.className = "field-hint invalid";
    return;
  }
  state.syncAbortController?.abort();
  const controller = new AbortController();
  state.syncAbortController = controller;
  const runId = ++state.syncRunId;
  els.syncModels.disabled = true;
  els.modelSyncStatus.className = "field-hint loading";
  els.modelSyncStatus.textContent = `正在从 ${provider.name} 同步模型预览...`;
  const syncRequest = requestUtils.createRequestState(endpoint, {
    registry,
    operation: listOperation,
    providerId: provider.id,
    authProfileId: state.request.authProfileId,
  });
  const plan = requestUtils.buildRequestPlan(endpoint, {
    registry,
    operation: listOperation,
    request: syncRequest,
    baseUrl: base,
    token: els.token.value.trim(),
    authProfileId: state.request.authProfileId,
  });
  if (!plan.ok) {
    els.modelSyncStatus.className = "field-hint invalid";
    els.modelSyncStatus.textContent = `无法同步模型：${plan.errors.slice(0, 2).join("；")}`;
    els.syncModels.disabled = false;
    if (state.syncAbortController === controller) state.syncAbortController = null;
    return;
  }
  state.modelSyncPreview = null;
  renderModelSyncPreview();
  try {
    const response = await fetch(plan.url, { method: plan.method, headers: plan.headers, signal: controller.signal });
    const raw = await response.text();
    if (runId !== state.syncRunId || state.syncAbortController !== controller) return;
    const payload = requestUtils.parseJson(raw);
    if (!response.ok) {
      const reason = response.status === 401
        ? "认证失败，请检查当前 profile 与 Token"
        : response.status === 429
          ? "请求过于频繁或已触发配额限制"
          : payload?.error?.message || payload?.message || "模型列表请求失败";
      throw new Error(`${response.status} ${reason}`);
    }
    const models = requestUtils.parseModelList(provider.id, payload);
    state.modelSyncPreview = { providerId: provider.id, models, fetchedAt: new Date().toLocaleTimeString("zh-CN") };
    els.modelSyncStatus.className = "field-hint valid";
    els.modelSyncStatus.textContent = `同步预览完成：${models.length} 个模型。确认应用后才会进入当前会话。`;
    renderModelSyncPreview();
  } catch (error) {
    if (error.name === "AbortError" || runId !== state.syncRunId || state.syncAbortController !== controller) return;
    els.modelSyncStatus.className = "field-hint invalid";
    els.modelSyncStatus.textContent = `模型同步失败：${requestUtils.redactSecrets(error.message || error, [els.token.value.trim()])}。若是 CORS 拦截，请复制上方 cURL 到终端。`;
  } finally {
    if (runId === state.syncRunId && state.syncAbortController === controller) {
      els.syncModels.disabled = false;
      state.syncAbortController = null;
    }
  }
}

function resetResponseObjectUrl() {
  if (state.responseObjectUrl) URL.revokeObjectURL(state.responseObjectUrl);
  state.responseObjectUrl = null;
}

function clearResponse() {
  resetResponseObjectUrl();
  state.lastDebug = null;
  els.responseMeta.textContent = "等待请求";
  els.responseMeta.className = "response-meta";
  els.responseHeaders.hidden = true;
  els.responseHeaders.innerHTML = "";
  els.responseMedia.hidden = true;
  els.responseMedia.innerHTML = "";
  els.responseBox.className = "code muted";
  els.responseBox.textContent = "运行请求后，响应会显示在这里。";
  els.responseDebug.hidden = true;
  els.responseDebug.innerHTML = "";
  setResponseView("raw");
}

function invalidateRequestRun() {
  state.requestRunId += 1;
  const controller = state.abortController;
  state.abortController = null;
  controller?.abort();
}

function setRequestForEndpoint(endpoint) {
  invalidateRequestRun();
  state.operationOverride = null;
  state.operationSelection = null;
  state.request = endpoint
    ? requestUtils.createRequestState(endpoint, {
        registry: getRegistry(),
        providerId: endpoint.providerId,
        operationId: endpoint.operationIds?.[0],
      })
    : null;
  const provider = endpoint && getProvider(state.request.providerId);
  if (endpoint && provider?.defaultModel) {
    state.request = requestUtils.applyModelToRequest(state.request, endpoint, provider.defaultModel);
  }
  els.sendRequest.disabled = !isEndpointRunnable(endpoint);
  els.cancelRequest.hidden = true;
  els.cancelRequest.textContent = "取消请求";
  clearResponse();
}

function buildCurrentPlan(allowPlaceholders = false) {
  const endpoint = getActiveEndpoint();
  if (!endpoint) {
    return {
      ok: false,
      errors: ["请先选择一个接口"],
      mode: "none",
      method: "GET",
      url: "",
      headers: {},
      body: undefined,
      bodyText: "",
      multipartFields: [],
      hasBody: false,
    };
  }
  return requestUtils.buildRequestPlan(endpoint, {
    registry: getRegistry(),
    operation: getCurrentOperation(),
    request: state.request,
    baseUrl: normalizeBaseUrl(),
    token: els.token.value.trim(),
    authProfileId: state.request.authProfileId,
    allowPlaceholders,
  });
}

function renderTesterTarget() {
  const endpoint = getActiveEndpoint();
  if (!endpoint) {
    els.testerMethod.textContent = "-";
    els.testerMethod.className = "method";
    els.testerPath.textContent = "没有选中的接口";
    els.testerMode.textContent = "请先清除筛选条件";
    els.testerAvailability.hidden = true;
    els.openTester.disabled = true;
    els.launcherMethod.className = "method";
    els.launcherMethod.textContent = "-";
    els.launcherLabel.textContent = "暂无可测试接口";
    els.launcherPath.textContent = "当前没有匹配项";
    els.testerHeaderContext.textContent = "尚未选择接口";
    return;
  }
  const plan = buildCurrentPlan(true);
  els.testerMethod.className = `method ${methodClass(plan.method)}`;
  els.testerMethod.textContent = plan.method;
  els.testerPath.textContent = plan.displayUrl || endpoint.path;
  els.testerMode.textContent = `${providerLabel(plan.providerId)} · ${plan.protocol} · ${modeLabel(plan.mode)}${plan.streamRequested ? " · 流式" : ""}`;
  els.testerAvailability.hidden = !endpoint.documentationOnly;
  els.openTester.disabled = false;
  els.launcherMethod.className = `method ${methodClass(plan.method)}`;
  els.launcherMethod.textContent = plan.method;
  els.launcherLabel.textContent = endpoint.documentationOnly ? "查看接口示例" : "测试此接口";
  els.launcherPath.textContent = plan.displayUrl || endpoint.path;
  els.testerHeaderContext.textContent = `${endpoint.title} · ${endpoint.method} ${endpoint.path}`;
}

function renderRequestEditors() {
  const endpoint = getActiveEndpoint();
  if (!endpoint || !state.request) {
    els.pathFields.hidden = true;
    els.queryFields.hidden = true;
    els.headerFields.hidden = true;
    els.pathFieldList.innerHTML = "";
    els.queryFieldList.innerHTML = "";
    els.headerFieldList.innerHTML = "";
    els.noParameterFields.hidden = false;
    els.noParameterFields.textContent = "没有选中的接口。请先清除筛选条件。";
    els.parameterSummary.textContent = "只读";
    els.jsonEditorSection.hidden = true;
    els.multipartEditorSection.hidden = true;
    els.multipartFieldList.innerHTML = "";
    els.requestBody.value = "";
    els.modelConsole.hidden = true;
    els.modelSyncPreview.hidden = true;
    els.modelSyncPreview.innerHTML = "";
    els.codeExampleBox.textContent = "请先选择一个接口。";
    els.formatJson.disabled = true;
    els.resetRequest.disabled = true;
    els.curlBox.textContent = "请先选择一个接口。";
    els.sendRequest.disabled = true;
    return;
  }
  els.sendRequest.disabled = !isEndpointRunnable(endpoint);
  els.sendRequest.textContent = endpoint.documentationOnly ? "仅文档，暂不可发送" : "发送请求";
  els.formatJson.disabled = false;
  els.resetRequest.disabled = false;
  els.noParameterFields.textContent = "该接口没有可编辑的路径、查询或自定义请求头参数。";
  const pathCount = renderParameterGroup("path", els.pathFields, els.pathFieldList);
  const queryCount = renderParameterGroup("query", els.queryFields, els.queryFieldList);
  const headerCount = renderParameterGroup("header", els.headerFields, els.headerFieldList);
  const total = pathCount + queryCount + headerCount;
  els.noParameterFields.hidden = total > 0;
  els.parameterSummary.textContent = total ? `${total} 项可编辑` : "只读";
  const mode = getCurrentOperation()?.requestMode || requestUtils.requestMode(endpoint);
  els.jsonEditorSection.hidden = mode !== "json" && mode !== "raw";
  els.multipartEditorSection.hidden = mode !== "multipart";
  els.requestBody.value = state.request.jsonText || "";
  els.requestBody.placeholder = mode === "json" ? '{\n  "model": "gpt-4o-mini"\n}' : "该接口不需要 JSON 请求体";
  if (mode === "multipart") renderMultipartFields(endpoint);
}

function renderBodyValidation() {
  const endpoint = getActiveEndpoint();
  if (!endpoint) {
    els.bodyValidation.textContent = "";
    els.bodyValidation.className = "field-hint";
    return;
  }
  const mode = getCurrentOperation()?.requestMode || requestUtils.requestMode(endpoint);
  if (mode !== "json" && mode !== "raw") {
    els.bodyValidation.textContent = "";
    els.bodyValidation.className = "field-hint";
    return;
  }
  const plan = buildCurrentPlan(false);
  const errors = plan.errors.filter((error) => error.includes("请求体") || error.includes("JSON"));
  if (!errors.length) {
    els.bodyValidation.textContent = plan.bodyText ? "请求体格式有效" : "可留空的请求体";
    els.bodyValidation.className = "field-hint valid";
    return;
  }
  els.bodyValidation.textContent = errors.slice(0, 2).join("；");
  els.bodyValidation.className = "field-hint invalid";
}

function renderCurl() {
  const endpoint = getActiveEndpoint();
  if (!endpoint || !state.request) {
    els.curlBox.textContent = "请先选择一个接口。";
    return;
  }
  els.curlBox.textContent = requestUtils.buildCurl(endpoint, {
    request: state.request,
    registry: getRegistry(),
    operation: getCurrentOperation(),
    authProfileId: state.request.authProfileId,
    baseUrl: normalizeBaseUrl() || "https://api.xi-ai.cn",
    token: els.token.value.trim(),
    curlMode: state.curlMode,
  });
}

function renderCodeExample() {
  const endpoint = getActiveEndpoint();
  if (!endpoint || !state.request) {
    els.codeExampleBox.textContent = "请先选择一个接口。";
    return;
  }
  const examples = requestUtils.buildCodeExamples(endpoint, {
    registry: getRegistry(),
    operation: getCurrentOperation(),
    request: state.request,
    authProfileId: state.request.authProfileId,
    baseUrl: normalizeBaseUrl() || "https://api.xi-ai.cn",
    token: els.token.value.trim(),
  });
  els.codeExampleBox.textContent = examples[state.codeMode] || examples.javascript;
}

function refreshRequestOutput() {
  renderTesterTarget();
  renderCurl();
  renderCodeExample();
  renderBodyValidation();
}

function renderTester() {
  const endpoint = getActiveEndpoint();
  const endpointId = endpoint?.id || null;
  if ((state.request?.endpointId || null) !== endpointId) setRequestForEndpoint(endpoint);
  renderRequestEditors();
  renderModelConsole();
  refreshRequestOutput();
}

function selectEndpoint(id, { ensureVisible = false, scroll = true } = {}) {
  if (ensureVisible && !state.filtered.some((item) => item.id === id)) resetFilters();
  const endpoint = state.filtered.find((item) => item.id === id);
  if (!endpoint) return;
  state.activeId = id;
  setRequestForEndpoint(endpoint);
  updateEndpointHash(id);
  renderNav();
  renderEndpoint();
  renderTester();
  if (scroll) {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    els.endpointView.scrollIntoView({ block: "start", behavior });
  }
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = value;
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

async function copyWithFeedback(button, value, successLabel = "已复制") {
  if (!button) return;
  const idleLabel = button.dataset.idleLabel || button.textContent;
  button.dataset.idleLabel = idleLabel;
  try {
    await copyText(value || "");
    button.textContent = successLabel;
  } catch {
    button.textContent = "复制失败";
  }
  setTimeout(() => {
    button.textContent = button.dataset.idleLabel || idleLabel;
  }, 1400);
}

function copyCurl() {
  return copyWithFeedback(els.copyCurl, els.curlBox.textContent, "cURL 已复制");
}

function copyCodeExample() {
  return copyWithFeedback(els.copyCode, els.codeExampleBox.textContent, "代码已复制");
}

function copyCurrentResponse() {
  const panel = state.responseView === "debug" ? els.responseDebug : els.responseBox;
  return copyWithFeedback(els.copyResponse, panel.textContent, "响应已复制");
}

function copyEndpointLink(button) {
  const endpoint = getActiveEndpoint();
  if (!endpoint) return;
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = endpointHash(endpoint.id);
  return copyWithFeedback(button, url.toString(), "链接已复制");
}

function showValidation(errors) {
  state.lastDebug = null;
  els.responseDebug.innerHTML = "";
  setResponseView("raw");
  const unique = [...new Set(errors)].filter(Boolean);
  els.responseMeta.textContent = unique.length ? unique.slice(0, 3).join("；") : "请检查请求配置";
  els.responseMeta.className = "response-meta error";
  els.responseBox.className = "code muted";
  els.responseBox.textContent = "请求尚未发送。填写必填参数后重试。";
}

function setResponseView(view) {
  state.responseView = view === "debug" ? "debug" : "raw";
  setButtonSelection("[data-response-view]", (button) => button.dataset.responseView === state.responseView, "aria-selected");
  els.responseBox.hidden = state.responseView === "debug";
  els.responseDebug.hidden = state.responseView !== "debug";
  if (state.responseView === "debug") renderCanonicalDebug();
}

function renderCanonicalDebug() {
  const debug = state.lastDebug;
  if (!debug) {
    els.responseDebug.innerHTML = '<p class="debug-empty">运行请求后，这里会显示统一调试结果。</p>';
    return;
  }
  const rows = [
    ["Provider", providerLabel(debug.providerId)],
    ["Protocol", debug.protocol || "-"],
    ["Operation", debug.operationId || "-"],
    ["状态", `${debug.status ?? "-"} ${debug.statusText || ""}`.trim()],
    ["耗时", debug.elapsedMs === null ? "-" : `${debug.elapsedMs}ms`],
    ["类型", `${debug.responseKind} · ${debug.contentType || "unknown"}`],
    ["文本聚合", debug.text || "-"],
    ["结束原因", debug.finishReason || "-"],
  ];
  els.responseDebug.innerHTML = `
    <div class="debug-grid">${rows.map(([label, value]) => `<div class="debug-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>
    ${debug.usage ? `<div class="debug-block"><span class="debug-label">Usage</span><pre class="code">${escapeHtml(prettyJson(debug.usage))}</pre></div>` : ""}
    ${debug.rawText ? `<div class="debug-block"><span class="debug-label">原始响应</span><pre class="code">${escapeHtml(debug.rawText)}</pre></div>` : ""}
    ${debug.error ? `<div class="debug-block debug-error"><span class="debug-label">Error</span><pre class="code">${escapeHtml(debug.error)}</pre></div>` : ""}
  `;
}

function renderResponseHeaders(headers, secrets = []) {
  const entries = [...headers.entries()];
  if (!entries.length) {
    els.responseHeaders.hidden = true;
    els.responseHeaders.innerHTML = "";
    return;
  }
  els.responseHeaders.hidden = false;
  els.responseHeaders.innerHTML = `<span class="response-header-title">响应头</span>${entries
    .slice(0, 12)
    .map(([name, value]) => {
      const safeValue = /^(authorization|x-api-key|x-goog-api-key)$/i.test(name)
        ? "[redacted]"
        : requestUtils.redactSecrets(value, secrets);
      return `<span class="response-header-chip"><code>${escapeHtml(name)}</code><span>${escapeHtml(safeValue)}</span></span>`;
    })
    .join("")}`;
}

function responseKindFor(endpoint, response, contentType, plan) {
  const declared = endpoint.responses?.find((item) => String(item.status) === String(response.status));
  return requestUtils.classifyResponse(response.status, contentType, plan?.responseKindHint || declared?.kind);
}

function setResponseMeta(response, elapsed, contentType, suffix = "") {
  els.responseMeta.textContent = `${response.status} ${response.statusText || ""} · ${elapsed}ms · ${contentType || "unknown"}${suffix ? ` · ${suffix}` : ""}`.trim();
  els.responseMeta.className = `response-meta ${response.ok ? "success" : "error"}`;
}

function renderBinaryResponse(blob, contentType, response) {
  resetResponseObjectUrl();
  state.responseObjectUrl = URL.createObjectURL(blob);
  els.responseMedia.hidden = false;
  els.responseMedia.innerHTML = "";
  if (contentType.startsWith("audio/")) {
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = state.responseObjectUrl;
    audio.setAttribute("aria-label", "音频响应预览");
    els.responseMedia.appendChild(audio);
  } else if (contentType.startsWith("video/")) {
    const video = document.createElement("video");
    video.controls = true;
    video.src = state.responseObjectUrl;
    video.setAttribute("aria-label", "视频响应预览");
    els.responseMedia.appendChild(video);
  }
  const link = document.createElement("a");
  link.href = state.responseObjectUrl;
  link.download = `new-api-response-${response.status}`;
  link.className = "download-link";
  link.textContent = `下载响应 · ${Math.round(blob.size / 1024)} KB`;
  els.responseMedia.appendChild(link);
  els.responseBox.className = "code muted";
  els.responseBox.textContent = `已收到二进制响应\n类型: ${contentType || "unknown"}\n大小: ${blob.size} bytes`;
}

async function readStreamResponse(response, started, contentType, isCurrentRequest, secrets = []) {
  if (!response.body?.getReader) {
    const text = await response.text();
    if (!isCurrentRequest()) return;
    els.responseBox.textContent = requestUtils.redactSecrets(text, secrets);
    return { rawText: text };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let rawOutput = "";
  els.responseBox.className = "code stream-output";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!isCurrentRequest()) return;
    rawOutput += decoder.decode(value, { stream: true });
    els.responseBox.textContent = requestUtils.redactSecrets(rawOutput, secrets);
    els.responseBox.scrollTop = els.responseBox.scrollHeight;
  }
  if (!isCurrentRequest()) return;
  rawOutput += decoder.decode();
  els.responseBox.textContent = requestUtils.redactSecrets(rawOutput, secrets) || "（流没有返回文本数据）";
  setResponseMeta(response, Math.round(performance.now() - started), contentType, "流式完成");
  return { rawText: rawOutput };
}

function renderTextResponse(text, contentType) {
  els.responseBox.className = "code";
  if (contentType.includes("json") || contentType.endsWith("+json")) {
    try {
      els.responseBox.textContent = JSON.stringify(JSON.parse(text), null, 2);
      return;
    } catch {
      // Some providers return a JSON error with an incorrect content type.
    }
  }
  try {
    const parsed = JSON.parse(text);
    els.responseBox.textContent = JSON.stringify(parsed, null, 2);
  } catch {
    els.responseBox.textContent = text || "（空响应）";
  }
}

async function sendRequest(event) {
  event?.preventDefault?.();
  const endpoint = getActiveEndpoint();
  if (!endpoint) return;
  if (!isEndpointRunnable(endpoint)) {
    clearResponse();
    els.responseMeta.textContent = "仅文档端点，未发送请求";
    els.responseMeta.className = "response-meta info";
    els.responseBox.textContent = "该源端点标记为未实现或仅声明 501。你可以继续查看并复制请求示例。";
    return;
  }
  const plan = buildCurrentPlan(false);
  const websocket = endpoint.responses?.some((response) => response.kind === "websocket") || plan.responseKindHint === "websocket";
  if (websocket) {
    clearResponse();
    els.responseMeta.textContent = "该接口需要 WebSocket 客户端，浏览器 fetch 不会建立协议升级。";
    els.responseMeta.className = "response-meta info";
    els.responseBox.textContent = `请使用 WebSocket 客户端连接：\n${buildWebSocketHint(endpoint)}`;
    return;
  }
  const base = normalizeBaseUrl();
  if (!base || base.includes("你的-new-api-域名")) {
    showValidation(["请先填写真实 Base URL"]);
    els.baseUrl.focus();
    return;
  }
  if (!plan.ok) {
    showValidation(plan.errors);
    return;
  }

  const headers = { ...plan.headers };
  const init = { method: plan.method, headers };
  if (plan.mode === "multipart") {
    const formData = new FormData();
    for (const item of plan.multipartFields) {
      if (item.file) formData.append(item.field.name, item.file, item.file.name);
      else formData.append(item.field.name, requestUtils.valueToString(item.value));
    }
    init.body = formData;
  } else if (plan.bodyText && !requestUtils.BODYLESS_METHODS.has(plan.method)) {
    init.body = plan.bodyText;
  }

  invalidateRequestRun();
  const controller = new AbortController();
  const run = {
    id: state.requestRunId,
    controller,
    endpointId: endpoint.id,
  };
  state.abortController = controller;
  const isCurrent = () =>
    state.requestRunId === run.id &&
    state.abortController === run.controller &&
    state.request?.endpointId === run.endpointId &&
    state.activeId === run.endpointId;
  init.signal = controller.signal;
  els.sendRequest.disabled = true;
  els.cancelRequest.hidden = false;
  els.responseMeta.textContent = "请求中...";
  els.responseMeta.className = "response-meta loading";
  els.responseHeaders.hidden = true;
  els.responseMedia.hidden = true;
  els.responseBox.className = "code muted";
  els.responseBox.textContent = "";
  resetResponseObjectUrl();
  state.lastDebug = null;
  if (state.responseView === "debug") renderCanonicalDebug();
  const started = performance.now();
  try {
    const response = await fetch(plan.url, init);
    if (!isCurrent()) return;
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const kind = responseKindFor(endpoint, response, contentType, plan);
    const secrets = [els.token.value.trim()];
    renderResponseHeaders(response.headers, secrets);
    let rawResponse = "";
    let elapsed = Math.round(performance.now() - started);
    if (kind === "websocket") {
      setResponseMeta(response, elapsed, contentType, "需要 WebSocket");
      els.responseBox.textContent = `服务端返回协议升级响应。\n${buildWebSocketHint(endpoint)}`;
    } else if (kind === "stream") {
      setResponseMeta(response, elapsed, contentType, "接收流式数据");
      const streamResult = await readStreamResponse(response, started, contentType, isCurrent, secrets);
      if (!isCurrent()) return;
      rawResponse = streamResult?.rawText || "";
      elapsed = Math.round(performance.now() - started);
    } else if (kind === "binary") {
      const blob = await response.blob();
      if (!isCurrent()) return;
      elapsed = Math.round(performance.now() - started);
      setResponseMeta(response, elapsed, contentType, `${Math.round(blob.size / 1024)} KB`);
      renderBinaryResponse(blob, contentType, response);
    } else {
      rawResponse = await response.text();
      if (!isCurrent()) return;
      elapsed = Math.round(performance.now() - started);
      setResponseMeta(response, Math.round(performance.now() - started), contentType);
      renderTextResponse(requestUtils.redactSecrets(rawResponse, secrets), contentType);
    }
    state.lastDebug = requestUtils.createCanonicalDebug({
      providerId: plan.providerId,
      protocol: plan.protocol,
      operationId: plan.operationId,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      elapsedMs: elapsed,
      contentType,
      headers: Object.fromEntries(response.headers.entries()),
      responseKind: kind,
      rawText: rawResponse,
      secrets,
    });
    renderCanonicalDebug();
  } catch (error) {
    if (!isCurrent()) return;
    if (error.name === "AbortError") {
      els.responseMeta.textContent = "请求已取消";
      els.responseMeta.className = "response-meta info";
      els.responseBox.textContent = "请求被用户取消。";
    } else {
      els.responseMeta.textContent = "请求失败";
      els.responseMeta.className = "response-meta error";
      const safeMessage = requestUtils.redactSecrets(error.message || error, [els.token.value.trim()]);
      els.responseBox.textContent = `${safeMessage}\n\n浏览器直接调用需要目标服务允许 CORS。若 CORS 被拦截，请复制上方 curl 到终端执行。`;
      state.lastDebug = requestUtils.createCanonicalDebug({
        providerId: plan.providerId,
        protocol: plan.protocol,
        operationId: plan.operationId,
        ok: false,
        responseKind: "text",
        rawText: error.message || String(error),
        error: error.message || String(error),
        secrets: [els.token.value.trim()],
      });
    }
    renderCanonicalDebug();
  } finally {
    if (!isCurrent()) return;
    els.sendRequest.disabled = !isEndpointRunnable(getActiveEndpoint());
    els.cancelRequest.hidden = true;
    state.abortController = null;
  }
}

function buildWebSocketHint(endpoint) {
  const base = normalizeBaseUrl().replace(/^http/i, "ws");
  const plan = buildCurrentPlan(true);
  return `${base}${(plan.displayUrl || plan.url).replace(normalizeBaseUrl(), "")}`;
}

function cancelRequest() {
  const controller = state.abortController;
  if (!controller) return;
  const runId = state.requestRunId;
  els.cancelRequest.textContent = "取消中...";
  controller.abort();
  setTimeout(() => {
    if (state.requestRunId === runId && state.abortController === controller) els.cancelRequest.textContent = "取消请求";
  }, 600);
}

function saveConfig() {
  try {
    localStorage.setItem("newapi-docs-base-url", els.baseUrl.value.trim());
    if (els.rememberToken.checked && els.token.value.trim()) {
      localStorage.setItem("newapi-docs-token", els.token.value.trim());
      els.configStatus.textContent = "调用环境和 Token 已保存到本机浏览器。";
    } else {
      localStorage.removeItem("newapi-docs-token");
      els.configStatus.textContent = "调用环境已保存；Token 仅保留在当前页面。";
    }
    els.saveConfig.textContent = "已保存";
  } catch {
    els.configStatus.textContent = "浏览器拒绝本地存储，配置仅在当前页面有效。";
    els.saveConfig.textContent = "保存失败";
  }
  refreshRequestOutput();
  setTimeout(() => {
    els.saveConfig.textContent = "保存环境";
  }, 1200);
}

function hydrateConfig() {
  try {
    const base = localStorage.getItem("newapi-docs-base-url");
    const token = localStorage.getItem("newapi-docs-token");
    if (base) els.baseUrl.value = base;
    if (token) {
      els.token.value = token;
      els.rememberToken.checked = true;
    }
  } catch {
    els.configStatus.textContent = "浏览器本地存储不可用，配置仅在当前页面有效。";
  }
}

function clearToken() {
  els.token.value = "";
  els.rememberToken.checked = false;
  try {
    localStorage.removeItem("newapi-docs-token");
  } catch {
    // The input is still cleared even when browser storage is unavailable.
  }
  els.configStatus.textContent = "Token 已从当前页面和本机浏览器清除。";
  refreshRequestOutput();
  els.token.focus();
}

function setCodeMode(mode) {
  state.codeMode = mode === "python" ? "python" : "javascript";
  setButtonSelection("[data-code-mode]", (button) => button.dataset.codeMode === state.codeMode, "aria-selected");
  const activeTab = document.querySelector(`[data-code-mode="${state.codeMode}"]`);
  if (activeTab) els.codeExampleBox.setAttribute("aria-labelledby", activeTab.id);
  renderCodeExample();
}

function handleTabKeydown(event, selector, dataKey, activate) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = [...document.querySelectorAll(selector)];
  const currentIndex = tabs.indexOf(event.currentTarget);
  if (currentIndex < 0 || !tabs.length) return;
  event.preventDefault();
  let nextIndex = currentIndex;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  const next = tabs[nextIndex];
  activate(next.dataset[dataKey]);
  next.focus();
}

function syncTesterDrawer() {
  const compact = testerMedia.matches;
  const open = compact && els.tester.classList.contains("is-open");
  if (!compact) {
    els.tester.classList.remove("is-open");
    els.testerBackdrop.classList.remove("is-open");
    document.body.classList.remove("tester-open");
    els.tester.inert = false;
    els.tester.removeAttribute("role");
    els.tester.removeAttribute("aria-modal");
    els.tester.removeAttribute("aria-hidden");
    els.openTester.setAttribute("aria-expanded", "false");
    els.testerBackdrop.setAttribute("aria-hidden", "true");
    return;
  }
  els.tester.setAttribute("role", "dialog");
  els.tester.setAttribute("aria-modal", "true");
  els.tester.setAttribute("aria-hidden", String(!open));
  els.tester.inert = !open;
  els.openTester.setAttribute("aria-expanded", String(open));
  els.testerBackdrop.setAttribute("aria-hidden", String(!open));
}

function openTesterDrawer() {
  if (!testerMedia.matches || els.openTester.disabled) return;
  state.testerTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : els.openTester;
  els.tester.classList.add("is-open");
  els.testerBackdrop.classList.add("is-open");
  document.body.classList.add("tester-open");
  syncTesterDrawer();
  els.closeTester.focus();
}

function closeTesterDrawer({ restoreFocus = true } = {}) {
  const wasOpen = els.tester.classList.contains("is-open");
  els.tester.classList.remove("is-open");
  els.testerBackdrop.classList.remove("is-open");
  document.body.classList.remove("tester-open");
  syncTesterDrawer();
  if (wasOpen && restoreFocus) (state.testerTrigger || els.openTester).focus?.();
  state.testerTrigger = null;
}

function maybeLoadFigmaCapture() {
  const value = new URLSearchParams(window.location.search).get("figmaCapture");
  if (!value || !["1", "true"].includes(value.toLowerCase())) return;
  const script = document.createElement("script");
  script.src = "https://mcp.figma.com/mcp/html-to-design/capture.js";
  script.async = true;
  script.dataset.figmaCapture = "enabled";
  document.head.appendChild(script);
}

function maybeOpenFigmaTester() {
  const params = new URLSearchParams(window.location.search);
  const captureEnabled = params.get("figmaCapture");
  if (!captureEnabled || !["1", "true"].includes(captureEnabled.toLowerCase())) return;
  if (params.get("figmaTester") !== "1" || !testerMedia.matches) return;
  requestAnimationFrame(() => openTesterDrawer());
}

function handleRequestInput(event) {
  const target = event.target;
  if (target.matches("[data-request-location]")) {
    const location = target.dataset.requestLocation;
    const key = location === "header" ? "headers" : location;
    state.request[key][target.dataset.paramName] = target.type === "checkbox" ? target.checked : target.value;
    refreshRequestOutput();
    return;
  }
  if (target.id === "requestBody") {
    state.request.jsonText = target.value;
    refreshRequestOutput();
    return;
  }
  if (target.matches("[data-multipart-name]")) {
    const name = target.dataset.multipartName;
    const current = state.request.multipart[name] || { value: "", file: null, curlPath: "" };
    if (target.type === "file") {
      current.file = target.files?.[0] || null;
      current.value = "";
      if (current.file && (!current.curlPath || current.curlPath.startsWith("/path/to/"))) current.curlPath = `/path/to/${current.file.name}`;
    } else {
      current.value = target.value;
      current.file = null;
    }
    state.request.multipart[name] = current;
    refreshRequestOutput();
    return;
  }
  if (target.matches("[data-curl-path-name]")) {
    const name = target.dataset.curlPathName;
    const current = state.request.multipart[name] || { value: "", file: null, curlPath: "" };
    current.curlPath = target.value;
    state.request.multipart[name] = current;
    refreshRequestOutput();
  }
}

function formatJson() {
  if (!state.request || !getActiveEndpoint()) return;
  try {
    const parsed = JSON.parse(els.requestBody.value);
    state.request.jsonText = prettyJson(parsed);
    els.requestBody.value = state.request.jsonText;
    renderBodyValidation();
  } catch {
    els.bodyValidation.textContent = "当前内容不是有效 JSON，无法格式化";
    els.bodyValidation.className = "field-hint invalid";
  }
}

function resetRequest() {
  setRequestForEndpoint(getActiveEndpoint());
  renderRequestEditors();
  refreshRequestOutput();
}

function refreshFilteredView() {
  filterEndpoints();
  if (state.activeId) updateEndpointHash(state.activeId);
  renderNav();
  renderEndpoint();
  renderTester();
}

function handleHashNavigation() {
  const id = endpointIdFromHash();
  if (!id || id === state.activeId || !state.data.endpoints.some((endpoint) => endpoint.id === id)) return;
  selectEndpoint(id, { ensureVisible: true });
}

function handleTesterKeyboard(event) {
  if (event.key === "Escape" && testerMedia.matches && els.tester.classList.contains("is-open")) {
    event.preventDefault();
    closeTesterDrawer();
    return;
  }
  if (event.key !== "Tab" || !testerMedia.matches || !els.tester.classList.contains("is-open")) return;
  const focusable = [...els.tester.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hidden && element.getClientRects().length > 0);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function bindEvents() {
  els.search.addEventListener("input", () => {
    refreshFilteredView();
  });
  document.querySelectorAll(".filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      setButtonSelection(".filter", (item) => item === button);
      refreshFilteredView();
    });
  });
  document.querySelectorAll(".provider-filter").forEach((button) => {
    button.addEventListener("click", () => {
      state.providerFilter = button.dataset.providerFilter || "all";
      setButtonSelection(".provider-filter", (item) => item === button);
      refreshFilteredView();
    });
  });
  els.nav.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (button) selectEndpoint(button.dataset.id);
  });
  els.endpointView.addEventListener("click", (event) => {
    const variant = event.target.closest("[data-variant-id]");
    if (variant) {
      selectEndpoint(variant.dataset.variantId, { ensureVisible: true });
      return;
    }
    const copyLink = event.target.closest("[data-copy-endpoint-link]");
    if (copyLink) copyEndpointLink(copyLink);
  });
  els.baseUrl.addEventListener("input", refreshRequestOutput);
  els.token.addEventListener("input", refreshRequestOutput);
  els.rememberToken.addEventListener("change", () => {
    if (els.rememberToken.checked) {
      els.configStatus.textContent = "点击“保存环境”后，Token 才会写入本机浏览器。";
      return;
    }
    try {
      localStorage.removeItem("newapi-docs-token");
    } catch {
      // The checkbox state remains authoritative when storage is unavailable.
    }
    els.configStatus.textContent = "Token 已停止本机保存，当前输入仅在本页面有效。";
  });
  els.requestForm.addEventListener("input", handleRequestInput);
  els.requestForm.addEventListener("change", handleRequestInput);
  els.requestForm.addEventListener("submit", sendRequest);
  els.copyCurl.addEventListener("click", copyCurl);
  els.copyCode.addEventListener("click", copyCodeExample);
  els.copyResponse.addEventListener("click", copyCurrentResponse);
  els.cancelRequest.addEventListener("click", cancelRequest);
  els.clearResponse.addEventListener("click", clearResponse);
  els.formatJson.addEventListener("click", formatJson);
  els.resetRequest.addEventListener("click", resetRequest);
  els.saveConfig.addEventListener("click", saveConfig);
  els.clearToken.addEventListener("click", clearToken);
  els.openTester.addEventListener("click", openTesterDrawer);
  els.closeTester.addEventListener("click", () => closeTesterDrawer());
  els.testerBackdrop.addEventListener("click", () => closeTesterDrawer());
  document.addEventListener("keydown", handleTesterKeyboard);
  window.addEventListener("hashchange", handleHashNavigation);
  if (testerMedia.addEventListener) testerMedia.addEventListener("change", syncTesterDrawer);
  else testerMedia.addListener(syncTesterDrawer);
  els.providerSelect.addEventListener("change", (event) => handleProviderChange(event.target.value));
  els.authProfileSelect.addEventListener("change", (event) => {
    if (!state.request) return;
    state.request.authProfileId = event.target.value;
    clearResponse();
    renderModelConsole();
    refreshRequestOutput();
  });
  els.modelSelect.addEventListener("change", (event) => {
    const endpoint = getActiveEndpoint();
    if (!endpoint || !state.request) return;
    if (event.target.value === "__custom__") {
      els.modelCustom.hidden = false;
      els.modelCustom.disabled = false;
      els.modelCustom.value = getRequestModel(endpoint);
      els.modelCustom.focus();
      return;
    }
    setRequestModel(event.target.value);
  });
  els.modelCustom.addEventListener("input", (event) => {
    if (event.target.value.trim()) setRequestModel(event.target.value.trim());
  });
  els.operationSelect.addEventListener("change", (event) => handleOperationSelection(event.target.value));
  els.syncModels.addEventListener("click", syncModels);
  els.streamToggle.addEventListener("change", (event) => setStreamPreference(event.target.checked));
  els.modelSyncPreview.addEventListener("click", (event) => {
    if (event.target.closest("#applySyncedModels")) applySyncedModels();
    if (event.target.closest("#dismissModelPreview")) dismissModelPreview();
  });
  document.querySelectorAll("[data-code-mode]").forEach((button) => {
    button.addEventListener("click", () => setCodeMode(button.dataset.codeMode));
    button.addEventListener("keydown", (event) => handleTabKeydown(event, "[data-code-mode]", "codeMode", setCodeMode));
  });
  document.querySelectorAll("[data-response-view]").forEach((button) => {
    button.addEventListener("click", () => setResponseView(button.dataset.responseView));
    button.addEventListener("keydown", (event) => handleTabKeydown(event, "[data-response-view]", "responseView", setResponseView));
  });
  document.querySelectorAll("[data-curl-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.curlMode = button.dataset.curlMode;
      setButtonSelection("[data-curl-mode]", (item) => item === button);
      renderCurl();
    });
  });
}

async function init() {
  if (!requestUtils) throw new Error("Request utility module failed to load");
  hydrateConfig();
  const response = await fetch("./data/api-data.json");
  if (!response.ok) throw new Error(`无法加载接口数据：${response.status}`);
  state.data = await response.json();
  const hashId = endpointIdFromHash();
  const hashEndpoint = state.data.endpoints.find((endpoint) => endpoint.id === hashId);
  state.activeId = hashEndpoint?.id || state.data.endpoints.find((endpoint) => endpoint.id === "createchatcompletion")?.id || state.data.endpoints[0]?.id || null;
  filterEndpoints();
  if (state.activeId) updateEndpointHash(state.activeId);
  setButtonSelection(".filter", (button) => button.dataset.filter === state.filter);
  setButtonSelection(".provider-filter", (button) => button.dataset.providerFilter === state.providerFilter);
  setButtonSelection("[data-curl-mode]", (button) => button.dataset.curlMode === state.curlMode);
  setButtonSelection("[data-code-mode]", (button) => button.dataset.codeMode === state.codeMode, "aria-selected");
  renderStats();
  renderNav();
  renderEndpoint();
  setRequestForEndpoint(getActiveEndpoint());
  renderTester();
  bindEvents();
  syncTesterDrawer();
  maybeLoadFigmaCapture();
  maybeOpenFigmaTester();
}

init().catch((error) => {
  document.body.innerHTML = `<pre class="fatal-error">${escapeHtml(error.stack || error.message)}</pre>`;
});
