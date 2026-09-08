const fs = require("fs");
const path = require("path");
const PROVIDER_REGISTRY = require("./provider-registry.js");

const ROOT = process.cwd();
const SOURCE_ROOT = path.join(ROOT, "source-new-api-docs");
const MDX_ROOT = path.join(SOURCE_ROOT, "content", "docs", "zh", "api", "ai-model");
const OPENAPI_ROOT = path.join(SOURCE_ROOT, "openapi");
const OUT_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(OUT_DIR, "data");
const ASSET_DIR = path.join(OUT_DIR, "assets");

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function walk(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, acc);
    else if (!predicate || predicate(full)) acc.push(full);
  }
  return acc;
}

function slugFromSourcePath(file) {
  return path
    .relative(MDX_ROOT, file)
    .replace(/\\/g, "/")
    .replace(/\.mdx$/, "");
}

function routeFromSlug(slug) {
  return `https://www.newapi.ai/zh/docs/api/ai-model/${slug}`;
}

function extractFrontMatter(text) {
  if (!text.startsWith("---")) return {};
  const end = text.indexOf("\n---", 3);
  if (end === -1) return {};
  const raw = text.slice(4, end).trimEnd();
  const meta = {};
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value === "true") value = true;
      else if (value === "false") value = false;
      meta[match[1]] = value;
    }
  }
  return meta;
}

function extractApiPage(text) {
  const docMatch = text.match(/<APIPage\s+document=\{"([^"]+)"\}/);
  const opMatch = text.match(/operations=\{(\[[\s\S]*?\])\}/);
  if (!docMatch || !opMatch) {
    throw new Error("Missing APIPage metadata");
  }
  return {
    document: docMatch[1],
    operations: JSON.parse(opMatch[1]),
  };
}

function getSchemaType(schema) {
  if (!schema) return "unknown";
  if (schema.$ref) return schema.$ref.split("/").pop();
  if (schema.type) return Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  if (schema.oneOf) return `oneOf(${schema.oneOf.map(getSchemaType).join(" | ")})`;
  if (schema.anyOf) return `anyOf(${schema.anyOf.map(getSchemaType).join(" | ")})`;
  if (schema.allOf) return `allOf(${schema.allOf.map(getSchemaType).join(" + ")})`;
  if (schema.enum) return schema.enum.map(String).join(" | ");
  return "object";
}

function schemaFormat(schema) {
  return schema && typeof schema === "object" ? schema.format || "" : "";
}

function schemaDefault(schema) {
  return schema && typeof schema === "object" && schema.default !== undefined ? schema.default : null;
}

function schemaIsBinary(schema) {
  return schemaFormat(schema) === "binary" || schema?.contentEncoding === "base64";
}

function schemaExample(schema, depth = 0) {
  if (!schema || depth > 5) return null;
  if (schema.example !== undefined) return schema.example;
  if (Array.isArray(schema.examples) && schema.examples.length) return schema.examples[0];
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length) return schema.enum[0];
  if (schema.oneOf && schema.oneOf.length) return schemaExample(schema.oneOf[0], depth + 1);
  if (schema.anyOf && schema.anyOf.length) return schemaExample(schema.anyOf[0], depth + 1);
  if (schema.allOf && schema.allOf.length) {
    return schema.allOf.reduce((acc, part) => {
      const value = schemaExample(part, depth + 1);
      if (value && typeof value === "object" && !Array.isArray(value)) return { ...acc, ...value };
      return acc;
    }, {});
  }
  const type = getSchemaType(schema);
  if (type.includes("array")) return [schemaExample(schema.items, depth + 1)];
  if (type.includes("integer") || type.includes("number")) return schema.minimum ?? 0;
  if (type.includes("boolean")) return false;
  if (type.includes("string")) {
    if (schema.format === "binary") return "@file";
    if (schema.format === "uri") return "https://example.com/resource";
    return schema.description?.includes("模型") ? "gpt-4" : "string";
  }
  if (schema.properties) {
    const out = {};
    const keys = schema["x-apifox-orders"] || Object.keys(schema.properties);
    for (const key of keys) {
      if (!schema.properties[key]) continue;
      const required = Array.isArray(schema.required) && schema.required.includes(key);
      if (required || Object.keys(out).length < 8) {
        out[key] = schemaExample(schema.properties[key], depth + 1);
      }
    }
    return out;
  }
  return {};
}

function flattenSchema(schema, prefix = "", required = [], depth = 0, seen = new Set()) {
  if (!schema || depth > 4) return [];
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const variants = schema.oneOf || schema.anyOf || schema.allOf;
    const own = {
      name: prefix || "(root)",
      required: false,
      type: getSchemaType(schema),
      description: schema.description || "",
      enum: schema.enum || [],
    };
    const rows = variants.flatMap((part, index) =>
      flattenSchema(part, `${prefix || "variant"}#${index + 1}`, required, depth + 1, seen),
    );
    return [own, ...rows];
  }
  const rows = [];
  const type = getSchemaType(schema);
  if (schema.properties) {
    const keys = schema["x-apifox-orders"] || Object.keys(schema.properties);
    for (const key of keys) {
      const child = schema.properties[key];
      if (!child) continue;
      const name = prefix ? `${prefix}.${key}` : key;
      rows.push({
        name,
        required: required.includes(key),
        type: getSchemaType(child),
        description: child.description || "",
        enum: child.enum || [],
        example: schemaExample(child),
      });
      const id = `${name}:${getSchemaType(child)}`;
      if (!seen.has(id) && (child.properties || child.items?.properties || child.oneOf || child.anyOf)) {
        seen.add(id);
        const childRequired = child.required || child.items?.required || [];
        rows.push(...flattenSchema(child.items || child, name, childRequired, depth + 1, seen));
      }
    }
    return rows;
  }
  rows.push({
    name: prefix || "(root)",
    required: false,
    type,
    description: schema.description || "",
    enum: schema.enum || [],
    example: schemaExample(schema),
  });
  return rows;
}

function flattenFormFields(schema, prefix = "", required = [], depth = 0, seen = new Set()) {
  if (!schema || typeof schema !== "object" || depth > 6) return [];
  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const variants = schema.oneOf || schema.anyOf || schema.allOf;
    return variants.flatMap((part, index) =>
      flattenFormFields(part, `${prefix || "variant"}#${index + 1}`, required, depth + 1, seen),
    );
  }
  if (schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)) {
    const keys = Array.isArray(schema["x-apifox-orders"])
      ? schema["x-apifox-orders"]
      : Object.keys(schema.properties);
    return keys.flatMap((key) => {
      const child = schema.properties[key];
      if (!child || typeof child !== "object") {
        return [
          {
            name: prefix ? `${prefix}.${key}` : key,
            required: required.includes(key),
            type: getSchemaType(child),
            format: schemaFormat(child),
            enum: [],
            description: "",
            example: schemaExample(child),
            default: schemaDefault(child),
            isBinary: schemaIsBinary(child),
          },
        ];
      }
      const name = prefix ? `${prefix}.${key}` : key;
      const field = {
        name,
        required: required.includes(key),
        type: getSchemaType(child),
        format: schemaFormat(child),
        enum: child.enum || [],
        description: child.description || "",
        example: schemaExample(child),
        default: schemaDefault(child),
        isBinary: schemaIsBinary(child),
      };
      const id = `${name}:${field.type}`;
      const nested =
        !seen.has(id) && child.properties
          ? (() => {
              seen.add(id);
              return flattenFormFields(child, name, child.required || [], depth + 1, seen);
            })()
          : [];
      return [field, ...nested];
    });
  }
  return [
    {
      name: prefix || "(root)",
      required: false,
      type: getSchemaType(schema),
      format: schemaFormat(schema),
      enum: schema.enum || [],
      description: schema.description || "",
      example: schemaExample(schema),
      default: schemaDefault(schema),
      isBinary: schemaIsBinary(schema),
    },
  ];
}

function pickContent(content) {
  if (!content) return null;
  const preferred = ["application/json", "multipart/form-data", "application/octet-stream", "text/event-stream"];
  const type = preferred.find((item) => content[item]) || Object.keys(content)[0];
  return type ? { contentType: type, ...content[type] } : null;
}

function responseKind(status, contentType, schema) {
  const normalized = String(contentType || "").toLowerCase();
  if (String(status) === "101" || normalized.includes("websocket")) return "websocket";
  if (normalized === "text/event-stream" || normalized.includes("stream")) return "stream";
  if (
    normalized.startsWith("audio/") ||
    normalized.startsWith("video/") ||
    normalized.includes("octet-stream") ||
    normalized.includes("application/pdf") ||
    schemaIsBinary(schema)
  ) {
    return "binary";
  }
  if (normalized.includes("json") || normalized.endsWith("+json")) return "json";
  if (!normalized && !schema) return "empty";
  return "text";
}

function schemaHasField(schema, fieldName) {
  if (!schema || typeof schema !== "object") return false;
  if (schema.properties && typeof schema.properties === "object" && schema.properties[fieldName]) return true;
  const nested = [schema.items, ...(schema.oneOf || []), ...(schema.anyOf || []), ...(schema.allOf || [])];
  return nested.some((part) => schemaHasField(part, fieldName));
}

function collectResponseSchemas(responses) {
  return Object.entries(responses || {}).map(([status, response]) => {
    const content = pickContent(response.content);
    const schema = content?.schema || null;
    const contentTypes = Object.keys(response.content || {});
    return {
      status,
      description: response.description || "",
      contentType: content?.contentType || "",
      contentTypes,
      kind: responseKind(status, content?.contentType, schema),
      isBinary: responseKind(status, content?.contentType, schema) === "binary",
      schema,
      schemaRows: schema ? flattenSchema(schema, "", schema.required || []) : [],
      example: schema ? schemaExample(schema) : null,
    };
  });
}

function requestBodyInfo(requestBody) {
  if (!requestBody) return null;
  const content = pickContent(requestBody.content);
  if (!content) {
    return {
      required: Boolean(requestBody.required),
      contentType: "",
      schema: null,
      schemaRows: [],
      example: null,
      fields: [],
      requestMode: "none",
    };
  }
  const requestMode = content.contentType === "multipart/form-data" ? "multipart" : "json";
  return {
    required: Boolean(requestBody.required),
    contentType: content.contentType,
    schema: content.schema || null,
    schemaRows: content.schema ? flattenSchema(content.schema, "", content.schema.required || []) : [],
    example: content.schema ? schemaExample(content.schema) : null,
    fields: content.schema ? flattenFormFields(content.schema, "", content.schema.required || []) : [],
    requestMode,
  };
}

function operationMatchesEndpoint(endpoint, operation) {
  if (operation.endpointIds?.includes(endpoint.id)) return true;
  return operation.method?.toUpperCase() === endpoint.method && operation.path === endpoint.path && !operation.endpointIds?.length;
}

function inferModelBinding(endpoint) {
  if (endpoint.parameters?.some((parameter) => parameter.in === "path" && parameter.name === "model")) {
    return { location: "path", name: "model" };
  }
  if (endpoint.requestBody?.schema?.properties?.model) {
    return { location: "body", name: "model" };
  }
  return null;
}

function fallbackProviderIds(endpoint) {
  if (endpoint.path.startsWith("/v1beta/") || endpoint.path.startsWith("/v1/engines/")) return ["gemini"];
  if (endpoint.path === "/v1/messages") return ["claude"];
  return ["openai"];
}

function enrichEndpoint(endpoint) {
  const matchedOperations = PROVIDER_REGISTRY.operations.filter((operation) => operationMatchesEndpoint(endpoint, operation));
  const providerIds = [...new Set(
    (matchedOperations.length ? matchedOperations.map((operation) => operation.providerId) : fallbackProviderIds(endpoint)),
  )];
  const operationIds = matchedOperations.map((operation) => operation.id);
  const protocols = [...new Set(matchedOperations.map((operation) => operation.protocol))];
  const authProfileIds = [...new Set([
    ...matchedOperations.flatMap((operation) => operation.authProfileIds || []),
    ...providerIds
      .map((providerId) => PROVIDER_REGISTRY.providers.find((provider) => provider.id === providerId)?.defaultAuthProfile)
      .filter(Boolean),
  ])];
  const modelBinding = matchedOperations.find((operation) => operation.modelBinding)?.modelBinding || inferModelBinding(endpoint);
  return {
    ...endpoint,
    providerId: providerIds[0] || "openai",
    providerIds,
    protocols,
    operationIds,
    authProfileIds,
    modelBinding,
    supportsStreaming: endpoint.supportsStreaming || matchedOperations.some((operation) => operation.stream),
  };
}

function normalizeRoutePath(routePath) {
  const normalized = String(routePath || "/").replace(/\/+$/, "");
  return normalized || "/";
}

function isDocumentationOnly(endpoint) {
  const sourceLabel = `${endpoint.title || ""} ${endpoint.category || ""}`;
  const statuses = (endpoint.responses || []).map((response) => String(response.status));
  return sourceLabel.includes("未实现") || (statuses.length > 0 && statuses.every((status) => status === "501"));
}

function annotateEndpointRoutes(endpoints) {
  const routeGroups = new Map();
  for (const endpoint of endpoints) {
    endpoint.routeKey = `${String(endpoint.method || "GET").toUpperCase()} ${normalizeRoutePath(endpoint.path)}`;
    endpoint.documentationOnly = isDocumentationOnly(endpoint);
    if (!routeGroups.has(endpoint.routeKey)) routeGroups.set(endpoint.routeKey, []);
    routeGroups.get(endpoint.routeKey).push(endpoint.id);
  }
  for (const endpoint of endpoints) {
    endpoint.routeVariantIds = routeGroups.get(endpoint.routeKey).slice();
  }
  return endpoints;
}

function staticValue(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function staticShellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function curlFor(endpoint) {
  const base = "${BASE_URL:-https://api.xi-ai.cn}";
  const path = endpoint.path.replace(/\{([^}]+)\}/g, (_, name) => `<${name}>`);
  const query = endpoint.parameters
    .filter((param) => param.in === "query")
    .map((param) => `${encodeURIComponent(param.name)}=${encodeURIComponent(staticValue(param.example, `<${param.name}>`))}`)
    .join("&");
  const url = `${base}${path}${query ? `?${query}` : ""}`;
  const lines = [`curl -X ${endpoint.method.toUpperCase()} ${staticShellQuote(url)}`];
  lines.push("  -H 'Authorization: Bearer ${XI_AI_TOKEN}'");
  const headers = endpoint.parameters.filter((param) => param.in === "header");
  for (const param of headers) {
    if (param.name.toLowerCase() === "authorization") continue;
    lines.push(`  -H ${staticShellQuote(`${param.name}: ${staticValue(param.example, `<${param.name}>`)}`)}`);
  }
  if (endpoint.requestBody?.contentType && endpoint.requestBody.contentType !== "multipart/form-data") {
    lines.push(`  -H 'Content-Type: ${endpoint.requestBody.contentType}'`);
  }
  if (endpoint.requestBody?.contentType === "multipart/form-data") {
    for (const field of endpoint.requestBody.fields || []) {
      const value = field.isBinary ? `@/path/to/${field.name}` : staticValue(field.example, `<${field.name}>`);
      lines.push(`  -F ${staticShellQuote(`${field.name}=${value}`)}`);
    }
  } else if (endpoint.requestBody?.example && !["GET", "DELETE"].includes(endpoint.method)) {
    lines.push(`  -d ${staticShellQuote(JSON.stringify(endpoint.requestBody.example, null, 2))}`);
  }
  return lines.join(" \\\n");
}

function cleanCategory(tag) {
  return (tag || "AI 模型接口")
    .replace(/[（）]/g, (m) => (m === "（" ? " (" : ")"))
    .replace(/\s+/g, " ")
    .trim();
}

function getOperation(openapi, pathName, method) {
  const methodKey = method.toLowerCase();
  const operation = openapi.paths?.[pathName]?.[methodKey];
  if (!operation) {
    throw new Error(`Operation not found: ${method.toUpperCase()} ${pathName}`);
  }
  return operation;
}

function endpointFromMdx(file) {
  const text = readText(file);
  const frontMatter = extractFrontMatter(text);
  const apiPage = extractApiPage(text);
  const docPath = path.join(SOURCE_ROOT, apiPage.document.replace(/\//g, path.sep));
  const openapi = readJson(docPath);
  const opRef = apiPage.operations[0];
  const operation = getOperation(openapi, opRef.path, opRef.method);
  const slug = slugFromSourcePath(file);
  const category = cleanCategory(operation.tags?.[0] || openapi.tags?.[0]?.name);
  const requestBody = requestBodyInfo(operation.requestBody);
  const endpoint = {
    id: operation.operationId || slug.replace(/[^a-zA-Z0-9]+/g, "-"),
    slug,
    title: frontMatter.title || operation.summary || openapi.info?.title || slug.split("/").pop(),
    method: opRef.method.toUpperCase(),
    path: opRef.path,
    category,
      description: operation.description || openapi.info?.description || "",
      summary: operation.summary || "",
      operationId: operation.operationId || "",
      parameters: (operation.parameters || []).map((param) => ({
      name: param.name,
      in: param.in,
      required: Boolean(param.required),
      description: param.description || "",
        type: getSchemaType(param.schema),
        enum: param.schema?.enum || [],
        example: schemaExample(param.schema),
        default: schemaDefault(param.schema),
        format: schemaFormat(param.schema),
      })),
      requestBody,
      requestMode: requestBody?.requestMode || "none",
      supportsStreaming: schemaHasField(requestBody?.schema, "stream"),
      responses: collectResponseSchemas(operation.responses),
    security: operation.security || openapi.security || [],
    sourceUrl: routeFromSlug(slug),
    mdxPath: path.relative(ROOT, file).replace(/\\/g, "/"),
    openapiPath: path.relative(ROOT, docPath).replace(/\\/g, "/"),
  };
  const enriched = enrichEndpoint(endpoint);
  enriched.curl = curlFor(enriched);
  return enriched;
}

function sitemapSlugs() {
  const sitemapFile = path.join(ROOT, "ai-model-sitemap-urls.txt");
  return readText(sitemapFile)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((url) => url.replace("https://www.newapi.ai/zh/docs/api/ai-model/", ""));
}

function buildData() {
  const mdxFiles = walk(MDX_ROOT, (file) => file.endsWith(".mdx")).sort();
  const endpoints = annotateEndpointRoutes(mdxFiles.map(endpointFromMdx));
  const sitemap = sitemapSlugs();
  const endpointSlugs = new Set(endpoints.map((item) => item.slug));
  const missingFromSource = sitemap.filter((slug) => !endpointSlugs.has(slug));
  const extraSource = endpoints.map((item) => item.slug).filter((slug) => !sitemap.includes(slug));
  const categories = [...new Set(endpoints.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "zh-CN"));
  return {
    generatedAt: new Date().toISOString(),
    source: {
      site: "https://www.newapi.ai/zh/docs/api",
      sitemap: "https://www.newapi.ai/sitemap.xml",
      repository: "https://github.com/QuantumNous/new-api-docs-v1",
      localSourceRoot: path.relative(ROOT, SOURCE_ROOT).replace(/\\/g, "/"),
      targetBaseUrl: PROVIDER_REGISTRY.gateway.defaultBaseUrl,
    },
    coverage: {
      sitemapCount: sitemap.length,
      endpointCount: endpoints.length,
      missingFromSource,
      extraSource,
    },
    categories,
    providerRegistry: PROVIDER_REGISTRY,
    endpoints,
  };
}

function writeSite(data) {
  ensureDir(DATA_DIR);
  ensureDir(ASSET_DIR);
  fs.writeFileSync(path.join(DATA_DIR, "api-data.json"), JSON.stringify(data, null, 2), "utf8");
  const indexPath = path.join(OUT_DIR, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error("Missing public/index.html shell. Restore the static shell before generating API data.");
  }
}

const data = buildData();
writeSite(data);
console.log(JSON.stringify(data.coverage, null, 2));
