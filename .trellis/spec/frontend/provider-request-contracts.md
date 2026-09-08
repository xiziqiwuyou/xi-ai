# Provider and Request Contracts

> Executable contracts for the provider-aware Request Lab in this static documentation site.

## 1. Scope / Trigger

This contract applies when a change touches any of the following boundaries:

- `tools/provider-registry.js` provider, authentication, model, or operation metadata.
- `tools/generate-site.js` enrichment of source endpoints into `public/data/api-data.json`.
- `public/assets/request-utils.js` request planning, serialization, code examples, or debug extraction.
- `public/assets/app.js` provider selection, model sync, request execution, stream rendering, or response debug UI.

The site is a static browser application. It does not proxy provider traffic, persist secrets in generated files, or treat a model seed as proof of upstream availability.

## 2. Signatures

The following functions own the public cross-layer contracts:

```js
// tools/provider-registry.js
module.exports = {
  version,
  gateway,
  providers,
  authProfiles,
  operations,
};

// public/assets/request-utils.js
buildRequestPlan(endpoint, options) -> {
  ok, errors, providerId, protocol, operationId, authProfileId,
  method, url, displayUrl, curlUrl, headers, curlHeaders,
  body, bodyText, multipartFields, hasBody, streamRequested,
};

createCanonicalDebug(options) -> {
  providerId, protocol, operationId, status, statusText, ok,
  elapsedMs, contentType, headers, responseKind, rawText,
  parsedJson, streamText, usage, finishReason, text, error, source,
};
```

`public/assets/app.js` must call `buildRequestPlan` for browser fetch, cURL, JavaScript, and Python examples. UI code may collect values and render them, but must not independently rebuild provider URLs, authentication headers, or payload shapes.

## 3. Contracts

### Registry and generated data

- A provider has `id`, `name`, `family`, `defaultBaseUrl`, `defaultAuthProfile`, `modelCatalog`, and `listOperationId`.
- An authentication profile declares `id`, `providerIds`, `kind`, `envName`, and optional `headers`/`query`. `$TOKEN` is resolved only by the request planner.
- A model entry declares `id`, `source`, and `verification`. Manual seeds use `source: "manual"` and `verification: "unverified"`; user-triggered sync results use `source: "upstream"` and `verification: "observed"`.
- An operation declares `id`, `providerId`, `protocol`, `method`, `path`, `endpointIds`, `requestMode`, and `authProfileIds`. A stream variant is an operation overlay and must not increase source endpoint coverage.
- Generator enrichment is additive: endpoint `providerIds`, `protocols`, `operationIds`, `modelBinding`, and `authProfileIds` are derived from the registry and source metadata. `source-new-api-docs` remains read-only.

### Request plan

- `baseUrl` is trimmed and trailing slashes are removed before path joining.
- Path placeholders are resolved with `encodeURIComponent`; missing required values are errors for live requests and visible placeholders for generated examples.
- Operation query defaults are applied before endpoint query values; authentication query values have highest priority. Empty optional values are omitted.
- Header matching is case-insensitive. Explicit endpoint header values replace a profile header with the same name; duplicate header names are never emitted.
- Bearer profiles emit one `Authorization` header. Gemini profiles emit either `x-goog-api-key` or `key`, never both unless a future profile explicitly declares both. Claude profiles emit `x-api-key` and `anthropic-version`.
- JSON bodies remain editable JSON text. OpenAI and Claude stream intent is represented by the JSON `stream` field; Gemini streaming changes the operation path to `:streamGenerateContent` and adds `alt=sse`.
- Multipart requests use `FormData` in the browser and `-F` in cURL. The planner never writes a multipart boundary header. Bodyless methods never receive a body or content type.

### Sync preview

- Sync uses the provider list operation, current Base URL, and current auth profile.
- A successful response is parsed from OpenAI/Claude `{ data: [...] }` or Gemini `{ models: [...] }`.
- Sync stores models in a transient preview. Only an explicit Apply action updates the in-memory catalog; no generated file or `localStorage` entry is written.
- `401` must identify authentication/profile mismatch, `429` must identify rate/quota limits, and network/CORS failures must tell the user to use the generated cURL outside the browser.

### Canonical debug

- Every completed non-WebSocket request creates a result containing status, status text, elapsed time, content type, response headers, response kind, and raw response text where available.
- JSON parse failures and non-2xx responses retain raw text; an error response is never replaced by an empty success state.
- Stream readers consume the response body once, update the raw response view per chunk, and pass the accumulated SSE text to `createCanonicalDebug` after completion.
- `streamText`, `text`, `usage`, and `finishReason` are conservative provider projections. Missing fields are `null`/empty rather than guessed.
- Header secrets and token occurrences are redacted before rendering, copying, or storing a canonical result.

## 4. Validation and Error Matrix

| Condition | Required behavior |
|---|---|
| No active endpoint | Disable send, show an empty Request Lab, and do not fall back to the first source endpoint. |
| Missing required path/query/body value | Keep the request unsent and show the planner errors in the shared validation area. |
| Invalid JSON | Keep the user's text unchanged and show `请求体不是有效的 JSON`. |
| Missing real Base URL | Reject live send; example generation may use `https://api.xi-ai.cn` plus placeholders. |
| Gemini stream enabled | Use `:streamGenerateContent?alt=sse`; do not mutate source endpoint metadata. |
| Multipart send | Let the browser set the boundary; cURL uses `-F` and has no manual multipart content type. |
| `401` / `429` sync response | Preserve response text and show an actionable auth or quota message. |
| CORS or network failure | Preserve the sanitized error and point to the cURL fallback; never display the token. |
| Stream response | Render chunks as they arrive, retain the complete SSE text, then extract text/usage/finish reason. |
| Binary response | Preserve a downloadable object URL and show content type/size; do not attempt JSON parsing. |
| WebSocket/101 response | Explain that `fetch` cannot perform the upgrade and provide a `ws:` hint. |
| Endpoint switch during request | Abort and invalidate the old run; a stale response or `finally` block must not alter the new endpoint state. |

## 5. Good / Base / Bad Cases

- **Good**: Select Gemini, choose the native header profile, enable stream, and observe one encoded model path, one `x-goog-api-key` header, `alt=sse`, and the same values in cURL/fetch/Python.
- **Base**: Select an unverified manual model seed. It is available for examples but is labeled unverified until the user applies a sync preview.
- **Bad**: Add `Authorization` in `app.js` while the selected profile already supplies it. This creates protocol drift and can leak a secret into a duplicate header or generated example.
- **Good**: A delayed first stream chunk appears in the response box before the second chunk, and the final debug tab shows both raw SSE and aggregated text.
- **Bad**: Read `response.clone().text()` before the stream reader. This waits for the complete stream and makes the UI appear non-streaming.

## 6. Tests Required

Run the following checks after changing this contract:

```powershell
node tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-request-lab.js
node --check public\assets\app.js
node --check public\assets\request-utils.js
```

Assertion points:

- Generated data remains `sitemapCount=43`, `endpointCount=43`, with empty `missingFromSource` and `extraSource`.
- Serialization tests cover Xi Bearer, Gemini header/query key, and Claude `x-api-key` plus `anthropic-version`, including duplicate-header prevention.
- Browser fixtures assert OpenAI, Gemini native/stream, and Claude paths, query, headers, body, and response projections.
- Browser fixtures assert a first stream chunk renders before a delayed second chunk, and debug output contains raw SSE plus aggregated text.
- Sync fixtures cover success, `401`, `429`, and network/CORS-style failure; Apply is the only action that changes the in-memory catalog.
- Desktop and 390px browser checks report zero console errors and no document-level horizontal overflow.

## 7. Wrong vs Correct

### Wrong

```js
const url = `${baseUrl}/v1/models?key=${token}`;
const headers = { Authorization: `Bearer ${token}` };
const raw = await response.clone().text();
```

This bypasses profile selection, leaks a secret into a URL, may duplicate authentication, and blocks incremental stream rendering.

### Correct

```js
const plan = requestUtils.buildRequestPlan(endpoint, {
  registry,
  operation,
  request: state.request,
  baseUrl,
  token,
});

const response = await fetch(plan.url, {
  method: plan.method,
  headers: plan.headers,
  body: plan.bodyText || undefined,
  signal: controller.signal,
});

const streamResult = await readStreamResponse(response, started, contentType, isCurrent, [token]);
state.lastDebug = requestUtils.createCanonicalDebug({
  ...responseMetadata,
  rawText: streamResult.rawText,
  responseKind: "stream",
  secrets: [token],
});
```

The planner owns protocol serialization, the reader consumes a stream once, and the canonical result is built from the same response bytes shown to the user.
