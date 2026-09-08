const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const file = path.join(__dirname, "..", "public", "data", "api-data.json");
const data = JSON.parse(fs.readFileSync(file, "utf8"));
const endpoints = data.endpoints;
const registry = data.providerRegistry;

assert.equal(registry.version, 1);
assert.deepEqual(
  registry.providers.map((provider) => provider.id).sort(),
  ["claude", "gemini", "openai"],
  "OpenAI, Gemini and Claude providers must be present",
);
assert.ok(registry.authProfiles.some((profile) => profile.id === "xi-bearer"));
assert.ok(registry.authProfiles.some((profile) => profile.id === "gemini-header"));
assert.ok(registry.authProfiles.some((profile) => profile.id === "gemini-query"));
assert.ok(registry.authProfiles.some((profile) => profile.id === "claude-api-key"));
for (const provider of registry.providers) {
  assert.ok(provider.defaultBaseUrl, `${provider.id} has no default base URL`);
  assert.ok(provider.capabilities.length > 0, `${provider.id} has no capabilities`);
  assert.ok(provider.modelCatalog.length > 0, `${provider.id} has no model seeds`);
  for (const model of provider.modelCatalog) {
    assert.ok(model.id && model.source && model.verification, `${provider.id} model metadata is incomplete`);
    assert.ok(["manual", "fixture", "upstream"].includes(model.source), `${model.id} has an invalid source`);
    assert.ok(["unverified", "verified", "observed"].includes(model.verification), `${model.id} has an invalid verification state`);
  }
}

const operationById = new Map(registry.operations.map((operation) => [operation.id, operation]));
for (const operation of registry.operations) {
  assert.ok(operation.providerId && operation.protocol && operation.method && operation.path, `${operation.id} is incomplete`);
  assert.ok(operation.endpointIds?.length > 0, `${operation.id} is not bound to a source endpoint`);
  for (const endpointId of operation.endpointIds) {
    const endpoint = endpoints.find((item) => item.id === endpointId);
    assert.ok(endpoint, `${operation.id} points to a missing endpoint ${endpointId}`);
    assert.ok(endpoint.operationIds.includes(operation.id), `${endpointId} does not enrich ${operation.id}`);
  }
}

for (const endpoint of endpoints) {
  for (const operationId of endpoint.operationIds || []) assert.ok(operationById.has(operationId), `${endpoint.id} has an unknown operation`);
  for (const profileId of endpoint.authProfileIds || []) {
    assert.ok(registry.authProfiles.some((profile) => profile.id === profileId), `${endpoint.id} has an unknown auth profile`);
  }
}

const requiredOperations = [
  "openai.models",
  "openai.chat-completions",
  "openai.responses",
  "openai.completions",
  "gemini.models",
  "gemini.generate-content",
  "claude.models",
  "claude.messages",
];
for (const operationId of requiredOperations) assert.ok(operationById.has(operationId), `missing required operation ${operationId}`);
assert.equal(operationById.get("gemini.generate-content").streamVariant.query.alt, "sse");

assert.equal(data.coverage.sitemapCount, 43, "sitemap coverage changed");
assert.equal(data.coverage.endpointCount, 43, "endpoint count changed");
assert.deepEqual(data.coverage.missingFromSource, [], "source endpoints are missing");
assert.deepEqual(data.coverage.extraSource, [], "unexpected source endpoints were added");
assert.equal(endpoints.length, 43);
assert.equal(new Set(endpoints.map((endpoint) => endpoint.id)).size, endpoints.length, "endpoint IDs must be unique");
assert.equal(new Set(endpoints.map((endpoint) => endpoint.slug)).size, endpoints.length, "endpoint slugs must be unique");

const routeGroups = endpoints.reduce((groups, endpoint) => {
  assert.equal(endpoint.routeKey, `${endpoint.method} ${endpoint.path.replace(/\/+$/, "") || "/"}`, `${endpoint.id} has an invalid route key`);
  assert.equal(typeof endpoint.documentationOnly, "boolean", `${endpoint.id} has no documentation-only state`);
  assert.ok(endpoint.routeVariantIds.includes(endpoint.id), `${endpoint.id} route variants omit itself`);
  if (!groups[endpoint.routeKey]) groups[endpoint.routeKey] = [];
  groups[endpoint.routeKey].push(endpoint.id);
  return groups;
}, {});
for (const endpoint of endpoints) {
  assert.deepEqual(
    [...endpoint.routeVariantIds].sort(),
    [...routeGroups[endpoint.routeKey]].sort(),
    `${endpoint.id} route variants are not symmetric`,
  );
}
const documentationOnly = endpoints.filter((endpoint) => endpoint.documentationOnly);
assert.equal(documentationOnly.length, 10, "documentation-only endpoint count changed");
assert.ok(documentationOnly.every((endpoint) => endpoint.title.includes("未实现") || endpoint.responses.every((response) => response.status === "501")));
assert.equal(endpoints.find((endpoint) => endpoint.id === "createchatcompletion").documentationOnly, false);
assert.deepEqual(routeGroups["POST /v1/chat/completions"].sort(), ["createchatcompletion", "geminirelayv1beta-389846313"].sort());
assert.equal(routeGroups["POST /v1beta/models/{model}:generateContent"].length, 4);

const methods = endpoints.reduce((counts, endpoint) => {
  counts[endpoint.method] = (counts[endpoint.method] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(methods, { DELETE: 1, GET: 14, POST: 28 });

const modes = endpoints.reduce((counts, endpoint) => {
  counts[endpoint.requestMode] = (counts[endpoint.requestMode] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(modes, { json: 22, multipart: 5, none: 16 });

const locationCounts = endpoints.reduce((counts, endpoint) => {
  for (const parameter of endpoint.parameters || []) {
    counts[parameter.in] = (counts[parameter.in] || 0) + 1;
  }
  return counts;
}, {});
assert.deepEqual(locationCounts, { header: 5, path: 16, query: 4 });

const responseKinds = new Set(endpoints.flatMap((endpoint) => (endpoint.responses || []).map((response) => response.kind)));
assert.deepEqual([...responseKinds].sort(), ["binary", "json", "websocket"]);
assert.equal(endpoints.reduce((count, endpoint) => count + (endpoint.requestBody?.fields?.length || 0), 0) > 0, true);
assert.ok(endpoints.some((endpoint) => endpoint.requestBody?.fields?.some((field) => field.isBinary)));
assert.ok(endpoints.some((endpoint) => endpoint.responses?.some((response) => response.contentType === "audio/mpeg" && response.kind === "binary")));
assert.ok(endpoints.some((endpoint) => endpoint.responses?.some((response) => response.contentType === "video/mp4" && response.kind === "binary")));
assert.ok(endpoints.some((endpoint) => endpoint.responses?.some((response) => response.status === "101" && response.kind === "websocket")));

for (const endpoint of endpoints) {
  assert.ok(endpoint.path, `${endpoint.id} has no path`);
  assert.ok(endpoint.requestMode, `${endpoint.id} has no request mode`);
  for (const parameter of endpoint.parameters || []) {
    assert.ok(parameter.name && parameter.in, `${endpoint.id} has malformed parameter`);
    assert.ok("format" in parameter && "default" in parameter, `${endpoint.id} parameter metadata is incomplete`);
  }
  for (const field of endpoint.requestBody?.fields || []) {
    assert.ok(field.name && "isBinary" in field, `${endpoint.id} form field metadata is incomplete`);
  }
  for (const response of endpoint.responses || []) {
    assert.ok(response.kind, `${endpoint.id} response kind is missing`);
    assert.ok(Array.isArray(response.contentTypes), `${endpoint.id} response content types are missing`);
  }
}

console.log("api data contract passed", JSON.stringify({ endpoints: endpoints.length, methods, modes, locationCounts, responseKinds: [...responseKinds].sort() }));
