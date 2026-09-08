# Technical Design

## Design Boundary

本任务只修改静态文档站的生成数据契约、请求序列化、Provider 工作台和响应调试层。`source-new-api-docs` 作为只读事实源；不增加后端代理，也不改变既有 43 个源端点的 coverage 语义。

## Data Flow

```text
MDX + OpenAPI + sitemap
        │
        ├── tools/generate-site.js ──► endpoint metadata (43)
        │
tools/provider-registry.js
        │
        └── provider / protocol / operation / model registry
                         │
                         ▼
              public/data/api-data.json
                         │
                         ▼
  app.js state ──► request-utils.js ──► URL/headers/body/code examples
       │                                      │
       ├── provider/model UI                 └── fetch / stream reader
       └── sync preview ──► canonical debug result
```

## Registry Contract

`tools/provider-registry.js` exports a serializable object with:

- `version`: registry schema version.
- `providers[]`: `{ id, name, family, description, defaultBaseUrl, authProfiles[], modelCatalog[], operationIds[] }`.
- `authProfiles[]`: `{ id, label, kind, headers, query, secretLabel, notes }`; header values use placeholders such as `$TOKEN` and are resolved only by the request planner.
- `operations[]`: `{ id, providerId, protocol, label, method, path, query, endpointId, stream, requestMode, modelBinding, authProfileIds, requestExample, responseKind }`.
- `modelCatalog[]`: `{ id, providerId, label, aliases[], capabilities[], source, verification, note }`.

`endpointId` points to one of the generated 43 endpoints when possible. A protocol variant that is not present in the source snapshot (Gemini `streamGenerateContent`) remains an operation overlay and is materialized as a transient endpoint/request override in the browser; it must not inflate source coverage counts.

## Endpoint Enrichment

The generator adds optional fields to each endpoint:

- `providerIds[]`: provider ids that can serve the operation.
- `protocols[]`: normalized protocol ids (`openai-chat-completions`, `openai-responses`, `gemini-native`, `claude-messages`, etc.).
- `operationIds[]`: registry operations bound to this endpoint.
- `modelBinding`: `json:model`, `path:model`, or `none`.
- `authProfileIds[]`: supported runtime auth profiles.

The generator owns matching by `operationId`, method/path, and explicit aliases. The browser only reads these fields.

## Request State and Planner

Extend the existing endpoint-scoped state with:

```js
{
  endpointId,
  operationId,
  providerId,
  authProfileId,
  path: {},
  query: {},
  headers: {},
  jsonText: "",
  multipart: {}
}
```

`request-utils.js` remains the sole owner of serialization. `buildRequestPlan(endpoint, options)` accepts an optional operation overlay and returns:

```js
{
  ok, errors, providerId, protocol, authProfileId,
  method, url, headers, body, bodyText, multipartFields,
  hasBody, streamRequested
}
```

Rules:

1. Normalize Base URL and resolve path placeholders with `encodeURIComponent`.
2. Apply operation query defaults, then omit empty optional query values.
3. Resolve exactly one auth profile. Bearer emits `Authorization`; Gemini native emits `x-goog-api-key` or `key`; Claude emits `x-api-key` and `anthropic-version`.
4. User-entered explicit header values override profile defaults for the same header, but the planner never emits duplicate case-insensitive names.
5. JSON body remains the exact editable text; stream intent is detected from the JSON `stream` boolean and operation metadata.
6. Gemini stream overlays append `alt=sse` and use `:streamGenerateContent` without mutating the source endpoint.
7. Multipart never sets a boundary manually; bodyless methods never send body/content-type.

The code example renderer consumes the same plan, so cURL, fetch, and Python cannot drift from the browser request.

## Model Catalog and Sync Preview

Seed models are static and explicitly unverified. The sync action chooses the provider's list operation and current auth profile, performs a normal fetch with `AbortController`, parses either OpenAI `{data:[...]}`, Gemini `{models:[...]}`, or Claude `{data:[...]}` shape, and stores the result in a transient preview object. An Apply action replaces only the in-memory provider catalog and marks entries `source: upstream`, `verification: observed`; it does not write generated files or localStorage.

## Canonical Debug Result

Every completed request creates an internal result:

```js
{
  providerId, protocol, operationId, status, statusText,
  ok, elapsedMs, contentType, headers,
  responseKind, rawText, parsedJson, streamText,
  usage, finishReason, text, error, source: "live"
}
```

`rawText` is retained for JSON parse failures and error statuses. `usage`, `finishReason`, and `text` are extracted through provider-specific projections with conservative field paths; missing fields remain `null`. Secrets are redacted before any result is rendered or copied.

## Compatibility and Rollback

- Existing `api-data.json` consumers continue to work because registry/enrichment fields are additive.
- If the provider UI regresses, disable the registry panel and continue rendering the 43 source endpoints using the existing endpoint fields.
- If provider serialization regresses, the old endpoint request shape remains available through the base planner path; tests cover both overlay and non-overlay plans.

## Security

- Never put secrets in registry files, generated data, screenshots, console logs, or canonical result text.
- Use `textContent` for response payloads and escaped HTML only for static metadata.
- Sync errors show status and a sanitized message, never request headers or URLs containing query secrets.
