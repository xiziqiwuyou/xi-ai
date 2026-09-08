(function attachRequestUtils(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.NewApiRequestUtils = factory();
  }
})(typeof globalThis === "object" ? globalThis : this, function createRequestUtils() {
  const BODYLESS_METHODS = new Set(["GET", "DELETE", "HEAD", "OPTIONS"]);
  const SECRET_HEADER_NAMES = new Set(["authorization", "x-api-key", "x-goog-api-key"]);

  function prettyJson(value) {
    if (value === undefined || value === null) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  function isBlank(value) {
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  }

  function valueToString(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (Array.isArray(value)) return value.join(",");
    return String(value);
  }

  function firstDefined(...values) {
    return values.find((value) => !isBlank(value));
  }

  function initialValue(item) {
    return firstDefined(item?.default, item?.example, item?.enum?.[0], "") ?? "";
  }

  function initialEditableValue(item) {
    if (item?.required) return initialValue(item);
    if (item && item.default !== undefined && item.default !== null) return item.default;
    return "";
  }

  function requestMode(endpoint) {
    if (!endpoint || BODYLESS_METHODS.has(String(endpoint.method || "").toUpperCase())) return "none";
    return endpoint.requestMode || endpoint.requestBody?.requestMode ||
      (endpoint.requestBody?.contentType === "multipart/form-data" ? "multipart" : endpoint.requestBody ? "json" : "none");
  }

  function parameterList(endpoint, location) {
    return (endpoint?.parameters || []).filter((parameter) => parameter.in === location);
  }

  function findProvider(registry, providerId) {
    return registry?.providers?.find((provider) => provider.id === providerId) || null;
  }

  function findOperation(registry, operationId) {
    return registry?.operations?.find((operation) => operation.id === operationId) || null;
  }

  function findAuthProfile(registry, profileId) {
    return registry?.authProfiles?.find((profile) => profile.id === profileId) || null;
  }

  function providerForEndpoint(endpoint, operation, registry) {
    const providerId = operation?.providerId || endpoint?.providerId || endpoint?.providerIds?.[0] || "openai";
    return {
      id: providerId,
      definition: findProvider(registry, providerId),
    };
  }

  function operationForRequest(endpoint, options = {}) {
    if (options.operation) return options.operation;
    if (options.registry && options.operationId) return findOperation(options.registry, options.operationId);
    if (options.registry && endpoint?.operationIds?.length) return findOperation(options.registry, endpoint.operationIds[0]);
    return null;
  }

  function createRequestState(endpoint, options = {}) {
    const operation = operationForRequest(endpoint, options);
    const provider = providerForEndpoint(endpoint, operation, options.registry);
    const request = {
      endpointId: endpoint?.id || null,
      operationId: operation?.id || options.operationId || endpoint?.operationIds?.[0] || null,
      providerId: provider.id,
      authProfileId: options.authProfileId || operation?.authProfileIds?.[0] || endpoint?.authProfileIds?.[0] || provider.definition?.defaultAuthProfile || null,
      path: {},
      query: {},
      headers: {},
      jsonText: endpoint?.requestBody?.example ? prettyJson(endpoint.requestBody.example) : "",
      multipart: {},
      stream: false,
    };
    for (const parameter of endpoint?.parameters || []) {
      if (parameter.in === "path") request.path[parameter.name] = initialEditableValue(parameter);
      if (parameter.in === "query") request.query[parameter.name] = initialEditableValue(parameter);
      if (parameter.in === "header" && parameter.name.toLowerCase() !== "authorization") {
        request.headers[parameter.name] = initialEditableValue(parameter);
      }
    }
    for (const field of endpoint?.requestBody?.fields || []) {
      request.multipart[field.name] = {
        value: field.isBinary ? "" : valueToString(initialEditableValue(field)),
        file: null,
        curlPath: field.isBinary ? `/path/to/${field.name.replace(/[^a-zA-Z0-9._-]+/g, "-")}` : "",
      };
    }
    return request;
  }

  function parameterValue(request, parameter) {
    const key = parameter.in === "header" ? "headers" : parameter.in;
    const values = request?.[key] || {};
    return values[parameter.name];
  }

  function fieldState(request, field) {
    const value = request?.multipart?.[field.name];
    if (value && typeof value === "object") return value;
    return { value: valueToString(value), file: null, curlPath: `/path/to/${field.name}` };
  }

  function missingParameterError(parameter) {
    return `${parameter.in} 参数 ${parameter.name} 为必填项`;
  }

  function operationVariant(operation, streamRequested) {
    if (!operation || !streamRequested || !operation.streamVariant) return operation;
    return {
      ...operation,
      method: operation.streamVariant.method || operation.method,
      path: operation.streamVariant.path || operation.path,
      query: { ...(operation.query || {}), ...(operation.streamVariant.query || {}) },
      responseKind: "stream",
      variantOf: operation.id,
    };
  }

  function buildPath(pathTemplate, endpoint, request, allowPlaceholders, options = {}) {
    const errors = [];
    const path = String(pathTemplate || endpoint?.path || "").replace(/\{([^}]+)\}/g, (match, name) => {
      const parameter = parameterList(endpoint, "path").find((item) => item.name === name);
      const requestValue = parameter ? parameterValue(request, parameter) : request?.path?.[name];
      const value = !isBlank(requestValue) ? requestValue : options.model && name === "model" ? options.model : requestValue;
      if (isBlank(value)) {
        if (!allowPlaceholders) errors.push(parameter ? missingParameterError(parameter) : `路径参数 ${name} 缺少定义`);
        return `<${name}>`;
      }
      return encodeURIComponent(valueToString(value));
    });
    return { path, errors };
  }

  function addQueryValue(values, name, value, priority) {
    if (isBlank(value)) return;
    const key = String(name);
    const current = values.get(key);
    const items = Array.isArray(value) ? value : [value];
    if (!current || priority >= current.priority) values.set(key, { items, priority });
  }

  function buildQuery(endpoint, request, allowPlaceholders, operationQuery = {}, authQuery = {}) {
    const errors = [];
    const values = new Map();
    for (const [name, value] of Object.entries(operationQuery || {})) addQueryValue(values, name, value, 1);
    for (const parameter of parameterList(endpoint, "query")) {
      let value = parameterValue(request, parameter);
      if (isBlank(value) && allowPlaceholders && parameter.required) value = `<${parameter.name}>`;
      if (isBlank(value)) {
        if (parameter.required && !allowPlaceholders) errors.push(missingParameterError(parameter));
        continue;
      }
      addQueryValue(values, parameter.name, value, 2);
    }
    for (const [name, value] of Object.entries(authQuery || {})) addQueryValue(values, name, value, 3);
    const pairs = [];
    for (const [name, entry] of values.entries()) {
      for (const item of entry.items) {
        if (!isBlank(item)) pairs.push([name, valueToString(item)]);
      }
    }
    const query = pairs.length
      ? `?${pairs.map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("&")}`
      : "";
    return { query, errors, pairs };
  }

  function envPlaceholder(envName) {
    return `{{ENV:${envName || "API_TOKEN"}}}`;
  }

  function replaceToken(value, token, allowPlaceholders, envName) {
    if (value === "$TOKEN") {
      if (!isBlank(token)) return valueToString(token);
      return allowPlaceholders ? envPlaceholder(envName) : "";
    }
    return valueToString(value).replace(/\$TOKEN/g, !isBlank(token) ? valueToString(token) : allowPlaceholders ? envPlaceholder(envName) : "");
  }

  function resolveAuth(endpoint, operation, request, options = {}) {
    const registry = options.registry;
    const provider = providerForEndpoint(endpoint, operation, registry);
    const profileId = options.authProfileId || request?.authProfileId || operation?.authProfileIds?.[0] || endpoint?.authProfileIds?.[0] || provider.definition?.defaultAuthProfile || null;
    const profile = findAuthProfile(registry, profileId);
    const token = options.token;
    const headers = {};
    const query = {};
    const curlHeaders = {};
    const curlQuery = {};
    const envName = profile?.envName || options.tokenEnvName || "NEW_API_TOKEN";
    if (profile) {
      for (const [name, value] of Object.entries(profile.headers || {})) {
        const resolved = replaceToken(value, token, Boolean(options.allowPlaceholders), envName);
        if (!isBlank(resolved)) {
          headers[name] = resolved;
          curlHeaders[name] = replaceToken(value, "", true, envName);
        }
      }
      for (const [name, value] of Object.entries(profile.query || {})) {
        const resolved = replaceToken(value, token, Boolean(options.allowPlaceholders), envName);
        if (!isBlank(resolved)) {
          query[name] = resolved;
          curlQuery[name] = replaceToken(value, "", true, envName);
        }
      }
    } else if (!isBlank(token) || options.allowPlaceholders) {
      const resolved = !isBlank(token) ? `Bearer ${valueToString(token)}` : `Bearer ${envPlaceholder(envName)}`;
      headers.Authorization = resolved;
      curlHeaders.Authorization = `Bearer ${envPlaceholder(envName)}`;
    }
    return {
      profileId,
      profile,
      providerId: provider.id,
      envName,
      headers,
      query,
      curlHeaders,
      curlQuery,
      sensitiveQueryNames: Object.keys(profile?.query || {}),
      hasSecret: !isBlank(token),
    };
  }

  function setHeaderCaseInsensitive(headers, name, value) {
    const existing = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
    if (existing) delete headers[existing];
    headers[name] = value;
  }

  function buildHeaders(endpoint, request, auth, mode, bodyText, contentType, authHeaders) {
    const headers = { ...(authHeaders || auth?.headers || {}) };
    const errors = [];
    for (const parameter of parameterList(endpoint, "header")) {
      if (parameter.name.toLowerCase() === "authorization") continue;
      const value = parameterValue(request, parameter);
      if (isBlank(value)) {
        if (parameter.required && !Object.keys(headers).some((key) => key.toLowerCase() === parameter.name.toLowerCase())) {
          errors.push(missingParameterError(parameter));
        }
        continue;
      }
      setHeaderCaseInsensitive(headers, parameter.name, valueToString(value));
    }
    if (mode === "json" && bodyText) setHeaderCaseInsensitive(headers, "Content-Type", contentType || "application/json");
    if (mode === "raw" && bodyText && contentType) setHeaderCaseInsensitive(headers, "Content-Type", contentType);
    return { headers, errors };
  }

  function requiredJsonFields(schema, value, prefix = "") {
    if (!schema || typeof schema !== "object" || !value || typeof value !== "object" || Array.isArray(value)) return [];
    const errors = [];
    for (const key of schema.required || []) {
      if (!(key in value) || isBlank(value[key])) errors.push(`请求体字段 ${prefix ? `${prefix}.` : ""}${key} 为必填项`);
    }
    if (schema.properties) {
      for (const [key, child] of Object.entries(schema.properties)) {
        if (value[key] && child?.properties) errors.push(...requiredJsonFields(child, value[key], prefix ? `${prefix}.${key}` : key));
      }
    }
    return errors;
  }

  function buildMultipartFields(endpoint, request, allowPlaceholders) {
    const errors = [];
    const fields = [];
    for (const field of endpoint?.requestBody?.fields || []) {
      const current = fieldState(request, field);
      const hasFile = Boolean(current.file);
      const rawValue = current.value;
      const value = hasFile ? current.file : rawValue;
      if (isBlank(value) && field.required) {
        if (allowPlaceholders) {
          fields.push({ field, value: field.isBinary ? null : `<${field.name}>`, file: null, curlPath: current.curlPath || `/path/to/${field.name}` });
          continue;
        }
        errors.push(`请求体字段 ${field.name} 为必填项${field.isBinary ? "，请选择文件" : ""}`);
        continue;
      }
      if (isBlank(value)) continue;
      fields.push({ field, value: hasFile ? current.file : valueToString(value), file: current.file, curlPath: current.curlPath || `/path/to/${field.name}` });
    }
    return { fields, errors };
  }

  function redactUrl(url, sensitiveNames = []) {
    try {
      const parsed = new URL(url);
      for (const name of sensitiveNames) {
        if (parsed.searchParams.has(name)) parsed.searchParams.set(name, "[redacted]");
      }
      return parsed.toString();
    } catch {
      return String(url).replace(/(key|token|api[_-]?key)=([^&]+)/gi, "$1=[redacted]");
    }
  }

  function buildRequestPlan(endpoint, options = {}) {
    const request = options.request || createRequestState(endpoint, options);
    const operation = operationForRequest(endpoint, options) || findOperation(options.registry, request.operationId);
    const provider = providerForEndpoint(endpoint, operation, options.registry);
    const mode = operation?.requestMode || requestMode(endpoint);
    let bodyText = "";
    let body;
    const errors = [];
    if (mode === "json" || mode === "raw") {
      bodyText = String(request.jsonText || "").trim();
      if (bodyText) {
        if (mode === "json") {
          try {
            body = JSON.parse(bodyText);
            errors.push(...requiredJsonFields(endpoint?.requestBody?.schema, body));
          } catch {
            errors.push("请求体不是有效的 JSON");
          }
        } else {
          body = bodyText;
        }
      } else if (endpoint?.requestBody?.required && !options.allowPlaceholders) {
        errors.push("请求体为必填项");
      }
    }
    const streamRequested = options.stream !== undefined
      ? Boolean(options.stream)
      : Boolean(request.stream || body?.stream === true);
    const variant = operationVariant(operation, streamRequested);
    const auth = resolveAuth(endpoint, variant || operation, request, options);
    const pathResult = buildPath(variant?.path || operation?.path || endpoint?.path, endpoint, request, Boolean(options.allowPlaceholders), options);
    const queryResult = buildQuery(endpoint, request, Boolean(options.allowPlaceholders), variant?.query || operation?.query || {}, auth.query);
    errors.push(...pathResult.errors, ...queryResult.errors);
    const headerResult = buildHeaders(endpoint, request, auth, mode, bodyText, endpoint?.requestBody?.contentType);
    errors.push(...headerResult.errors);
    const baseUrl = String(options.baseUrl || "").trim().replace(/\/+$/, "");
    const url = `${baseUrl}${pathResult.path}${queryResult.query}`;
    const curlAuth = resolveAuth(endpoint, variant || operation, request, { ...options, allowPlaceholders: true });
    const curlQuery = buildQuery(endpoint, request, true, variant?.query || operation?.query || {}, curlAuth.curlQuery);
    const curlPath = buildPath(variant?.path || operation?.path || endpoint?.path, endpoint, request, true, options);
    const curlUrl = `${baseUrl || "https://api.xi-ai.cn"}${curlPath.path}${curlQuery.query}`;
    const curlHeaderResult = buildHeaders(
      endpoint,
      request,
      curlAuth,
      mode,
      bodyText,
      endpoint?.requestBody?.contentType,
      curlAuth.curlHeaders,
    );
    for (const [name, value] of Object.entries(curlHeaderResult.headers)) {
      curlHeaderResult.headers[name] = redactSecrets(value, [options.token]).replace(/\[redacted\]/g, envPlaceholder(curlAuth.envName));
    }
    const multipart = mode === "multipart" ? buildMultipartFields(endpoint, request, Boolean(options.allowPlaceholders)) : { fields: [], errors: [] };
    errors.push(...multipart.errors);
    return {
      ok: errors.length === 0,
      errors,
      providerId: provider.id,
      protocol: variant?.protocol || operation?.protocol || endpoint?.protocols?.[0] || "openai-compatible",
      operationId: operation?.id || request.operationId || null,
      authProfileId: auth.profileId,
      auth,
      operation: variant || operation,
      mode,
      method: String(variant?.method || operation?.method || endpoint?.method || "GET").toUpperCase(),
      url,
      displayUrl: redactUrl(url, auth.sensitiveQueryNames),
      curlUrl,
      headers: headerResult.headers,
      curlHeaders: curlHeaderResult.headers,
      body,
      bodyText,
      multipartFields: multipart.fields,
      hasBody: mode === "multipart" ? multipart.fields.length > 0 : bodyText.length > 0,
      streamRequested,
      responseKindHint: variant?.responseKind || operation?.responseKind || null,
    };
  }

  function templateValue(value, mode) {
    return String(value).replace(/\{\{ENV:([A-Z0-9_]+)\}\}/g, (_, name) => mode === "powershell" ? `$env:${name}` : "$" + "{" + name + "}");
  }

  function quoteBash(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
  }

  function quotePowerShell(value) {
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  function quoteTemplate(value, mode) {
    const stringValue = String(value);
    if (!stringValue.includes("{{ENV:")) return mode === "powershell" ? quotePowerShell(stringValue) : quoteBash(stringValue);
    const rendered = templateValue(stringValue, mode);
    if (mode === "powershell") return `"${rendered.replace(/"/g, '`"')}"`;
    return `"${rendered.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  function buildCurl(endpoint, options = {}) {
    const mode = options.curlMode === "powershell" ? "powershell" : "bash";
    const plan = buildRequestPlan(endpoint, {
      ...options,
      request: options.request || createRequestState(endpoint, options),
      baseUrl: options.baseUrl || "https://api.xi-ai.cn",
      allowPlaceholders: true,
    });
    const lines = [`curl${mode === "powershell" ? ".exe" : ""} -X ${plan.method} ${quoteTemplate(plan.curlUrl, mode)}`];
    for (const [name, value] of Object.entries(plan.curlHeaders || {})) {
      lines.push(`  -H ${quoteTemplate(`${name}: ${value}`, mode)}`);
    }
    if (plan.mode === "multipart") {
      for (const item of plan.multipartFields) {
        const value = item.field.isBinary ? `@${item.curlPath || `/path/to/${item.field.name}`}` : valueToString(item.value);
        lines.push(`  -F ${quoteTemplate(`${item.field.name}=${value}`, mode)}`);
      }
    } else if (plan.bodyText && !BODYLESS_METHODS.has(plan.method)) {
      lines.push(`  --data-raw ${quoteTemplate(plan.bodyText, mode)}`);
    }
    const continuation = mode === "powershell" ? " `" : ` ${String.fromCharCode(92)}`;
    return lines.join(`${continuation}\n`);
  }

  function codeValueExpression(value, mode) {
    const source = String(value ?? "");
    const parts = [];
    let cursor = 0;
    const pattern = /\{\{ENV:([A-Z0-9_]+)\}\}/g;
    let match;
    while ((match = pattern.exec(source))) {
      if (match.index > cursor) parts.push({ type: "text", value: source.slice(cursor, match.index) });
      parts.push({ type: "env", value: match[1] });
      cursor = match.index + match[0].length;
    }
    if (cursor < source.length) parts.push({ type: "text", value: source.slice(cursor) });
    if (!parts.some((part) => part.type === "env")) return JSON.stringify(source);
    if (mode === "python") {
      const rendered = parts
        .map((part) => part.type === "env"
          ? `{os.environ.get('${part.value}', '')}`
          : String(part.value).replace(/\\/g, "\\\\").replace(/"/g, '\\"'))
        .join("");
      return `f"${rendered}"`;
    }
    const rendered = parts
      .map((part) => part.type === "env"
        ? `\${process.env.${part.value} || ""}`
        : String(part.value).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "\\${"))
      .join("");
    return `\`${rendered}\``;
  }

  function codeHeaderObject(headers, mode) {
    return Object.entries(headers || {})
      .map(([name, value]) => `  ${JSON.stringify(name)}: ${codeValueExpression(value, mode)}`)
      .join(",\n");
  }

  function buildCodeExamples(endpoint, options = {}) {
    const plan = buildRequestPlan(endpoint, { ...options, allowPlaceholders: true });
    const headers = { ...(plan.curlHeaders || {}) };
    const jsHeaders = codeHeaderObject(headers, "javascript");
    const pythonHeaders = Object.entries(headers || {})
      .map(([name, value]) => `    ${JSON.stringify(name)}: ${codeValueExpression(value, "python")}`)
      .join(",\n");
    const urlJavaScript = codeValueExpression(plan.curlUrl, "javascript");
    const urlPython = codeValueExpression(plan.curlUrl, "python");
    const body = plan.mode === "multipart" ? null : plan.bodyText || null;
    let js;
    let python;
    if (plan.mode === "multipart") {
      const jsFields = plan.multipartFields
        .map((item) => item.field.isBinary
          ? `formData.append(${JSON.stringify(item.field.name)}, document.querySelector('[data-multipart-name="${item.field.name}"]').files[0]);`
          : `formData.append(${JSON.stringify(item.field.name)}, ${JSON.stringify(valueToString(item.value))});`)
        .join("\n");
      const pythonData = plan.multipartFields
        .filter((item) => !item.field.isBinary)
        .map((item) => `    ${JSON.stringify(item.field.name)}: ${JSON.stringify(valueToString(item.value))}`)
        .join(",\n");
      const pythonFiles = plan.multipartFields
        .filter((item) => item.field.isBinary)
        .map((item) => `    ${JSON.stringify(item.field.name)}: open(${JSON.stringify(item.curlPath || `/path/to/${item.field.name}`)}, "rb")`)
        .join(",\n");
      js = [
        "const formData = new FormData();",
        jsFields || "// Add multipart fields here.",
        `const response = await fetch(${urlJavaScript}, {`,
        `  method: ${JSON.stringify(plan.method)},`,
        `  headers: {\n${jsHeaders}\n  },`,
        "  body: formData,",
        "});",
        "console.log(response.status, await response.text());",
      ].join("\n");
      python = [
        "import os",
        "import requests",
        "",
        "response = requests.request(",
        `    ${JSON.stringify(plan.method)},`,
        `    ${urlPython},`,
        `    headers={\n${pythonHeaders}\n    },`,
        `    data={\n${pythonData}\n    },`,
        `    files={\n${pythonFiles}\n    },`,
        ")",
        "print(response.status_code, response.text)",
      ].join("\n");
    } else {
      js = [
        `const response = await fetch(${urlJavaScript}, {`,
        `  method: ${JSON.stringify(plan.method)},`,
        `  headers: {\n${jsHeaders}\n  }${body ? `,\n  body: ${JSON.stringify(body)}` : ""}`,
        `});`,
        "console.log(response.status, await response.text());",
      ].join("\n");
      python = [
        "import os",
        "import requests",
        "",
        "response = requests.request(",
        `    ${JSON.stringify(plan.method)},`,
        `    ${urlPython},`,
        `    headers={\n${pythonHeaders}\n    }${body ? `,\n    data=${JSON.stringify(body)}` : ""}`,
        ")",
        "print(response.status_code, response.text)",
      ].join("\n");
    }
    return { javascript: js, python, curl: buildCurl(endpoint, options) };
  }

  function classifyResponse(status, contentType, schemaKind) {
    const normalized = String(contentType || "").toLowerCase();
    if (String(status) === "101" || schemaKind === "websocket" || normalized.includes("websocket")) return "websocket";
    if (schemaKind === "stream" || normalized === "text/event-stream" || normalized.includes("stream")) return "stream";
    if (schemaKind === "binary" || normalized.startsWith("audio/") || normalized.startsWith("video/") || normalized.includes("octet-stream") || normalized.includes("application/pdf")) return "binary";
    if (normalized.includes("json") || normalized.endsWith("+json") || schemaKind === "json") return "json";
    if (!normalized && !schemaKind) return "empty";
    return schemaKind || "text";
  }

  function parseJson(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  function parseModelList(providerId, payload) {
    const values = providerId === "gemini" ? payload?.models : payload?.data;
    if (!Array.isArray(values)) return [];
    const seen = new Set();
    return values
      .map((item) => {
        const rawId = item?.id || item?.name || "";
        const id = String(rawId).replace(/^models\//, "").trim();
        if (!id) return null;
        return {
          id,
          label: item?.displayName || item?.label || id,
          capabilities: Array.isArray(item?.supportedGenerationMethods) ? item.supportedGenerationMethods : [],
          source: "upstream",
          verification: "observed",
          note: "Observed from a user-triggered model sync preview.",
        };
      })
      .filter((model) => model && !seen.has(model.id) && seen.add(model.id));
  }

  function firstText(value) {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map(firstText).filter(Boolean).join("");
    if (!value || typeof value !== "object") return "";
    if (typeof value.text === "string") return value.text;
    if (typeof value.output_text === "string") return value.output_text;
    if (value.content) return firstText(value.content);
    if (value.parts) return firstText(value.parts);
    return "";
  }

  function extractProviderText(providerId, parsed) {
    if (!parsed || typeof parsed !== "object") return "";
    if (providerId === "openai") {
      if (typeof parsed.output_text === "string") return parsed.output_text;
      if (typeof parsed.delta === "string") return parsed.delta;
      const choice = parsed.choices?.[0];
      if (choice) return firstText(choice.message?.content || choice.delta?.content || choice.text || "");
      return firstText(parsed.output);
    }
    if (providerId === "gemini") return firstText(parsed.candidates?.[0]?.content?.parts || parsed.candidates?.[0]?.content || "");
    if (providerId === "claude") return firstText(parsed.content || parsed.delta || parsed.message?.content || parsed.completion || "");
    return firstText(parsed.output_text || parsed.content || parsed.text || parsed.output || "");
  }

  function extractProviderUsage(providerId, parsed) {
    if (!parsed || typeof parsed !== "object") return null;
    if (providerId === "gemini") return parsed.usageMetadata || parsed.candidates?.[0]?.usageMetadata || null;
    return parsed.usage || null;
  }

  function extractProviderFinishReason(providerId, parsed) {
    if (!parsed || typeof parsed !== "object") return null;
    if (providerId === "openai") return parsed.choices?.[0]?.finish_reason || parsed.response?.status || parsed.status || null;
    if (providerId === "gemini") return parsed.candidates?.[0]?.finishReason || null;
    if (providerId === "claude") return parsed.stop_reason || parsed.delta?.stop_reason || parsed.message?.stop_reason || parsed.stop_sequence || null;
    return parsed.finish_reason || parsed.finishReason || parsed.stop_reason || parsed.status || null;
  }

  function streamEvents(rawText) {
    return String(rawText || "")
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== "[DONE]")
      .map(parseJson)
      .filter(Boolean);
  }

  function redactSecrets(value, secrets = []) {
    let result = String(value ?? "");
    for (const secret of secrets) {
      if (!isBlank(secret)) result = result.split(String(secret)).join("[redacted]");
    }
    return result;
  }

  function redactStructured(value, secrets = []) {
    if (typeof value === "string") return redactSecrets(value, secrets);
    if (Array.isArray(value)) return value.map((item) => redactStructured(item, secrets));
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactStructured(item, secrets)]));
  }

  function sanitizeHeaders(headers, secrets = []) {
    const output = {};
    for (const [name, value] of Object.entries(headers || {})) {
      output[name] = SECRET_HEADER_NAMES.has(name.toLowerCase()) ? "[redacted]" : redactSecrets(value, secrets);
    }
    return output;
  }

  function createCanonicalDebug(options = {}) {
    const providerId = options.providerId || "openai";
    const rawText = redactSecrets(String(options.rawText || ""), options.secrets);
    const events = options.responseKind === "stream" ? streamEvents(rawText) : [];
    const parsedJson = options.parsedJson ? redactStructured(options.parsedJson, options.secrets) : parseJson(rawText);
    const lastEvent = events.length ? events[events.length - 1] : null;
    const source = lastEvent || parsedJson;
    const streamText = events.map((event) => extractProviderText(providerId, event)).filter(Boolean).join("");
    const text = streamText || extractProviderText(providerId, source);
    const errorValue = source?.error?.message || (!options.ok && (source?.message || source?.error || rawText)) || null;
    const usage = extractProviderUsage(providerId, source) || [...events].reverse().map((event) => extractProviderUsage(providerId, event)).find(Boolean) || null;
    const finishReason = extractProviderFinishReason(providerId, source) || [...events].reverse().map((event) => extractProviderFinishReason(providerId, event)).find(Boolean) || null;
    return {
      providerId,
      protocol: options.protocol || null,
      operationId: options.operationId || null,
      status: options.status ?? null,
      statusText: options.statusText || "",
      ok: Boolean(options.ok),
      elapsedMs: options.elapsedMs ?? null,
      contentType: options.contentType || "",
      headers: sanitizeHeaders(options.headers, options.secrets),
      responseKind: options.responseKind || "text",
      rawText,
      parsedJson,
      streamText,
      usage,
      finishReason,
      text,
      error: errorValue ? redactSecrets(typeof errorValue === "string" ? errorValue : prettyJson(errorValue), options.secrets) : null,
      source: options.source || "live",
    };
  }

  function applyModelToRequest(request, endpoint, model) {
    if (!request || isBlank(model)) return request;
    const next = { ...request, path: { ...(request.path || {}) }, query: { ...(request.query || {}) } };
    const binding = endpoint?.modelBinding;
    if (binding?.location === "path" || (!binding && endpoint?.parameters?.some((item) => item.in === "path" && item.name === "model"))) {
      next.path.model = model;
    }
    if (binding?.location === "body" || (!binding && endpoint?.requestBody?.schema?.properties?.model)) {
      try {
        const body = JSON.parse(next.jsonText || "{}");
        body.model = model;
        next.jsonText = prettyJson(body);
      } catch {
        // Keep invalid user text untouched; validation owns the error message.
      }
    }
    return next;
  }

  return {
    BODYLESS_METHODS,
    prettyJson,
    isBlank,
    valueToString,
    requestMode,
    parameterList,
    findProvider,
    findOperation,
    findAuthProfile,
    createRequestState,
    applyModelToRequest,
    operationVariant,
    buildRequestPlan,
    buildCurl,
    buildCodeExamples,
    classifyResponse,
    parseJson,
    parseModelList,
    createCanonicalDebug,
    redactSecrets,
  };
});
