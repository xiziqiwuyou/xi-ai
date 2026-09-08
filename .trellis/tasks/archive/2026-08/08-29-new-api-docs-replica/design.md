# Technical Design

## Design Boundary

本任务只改造静态文档站的数据适配层、请求实验室和响应展示层，并同步现有 Figma 设计说明。不会引入服务端代理，也不会替换现有三栏视觉语言。

## Architecture

```text
MDX + OpenAPI + sitemap snapshot
        │
        ▼
tools/generate-site.js
        │  normalized endpoint metadata
        ▼
public/data/api-data.json
        │
        ▼
public/assets/app.js
  ├─ endpoint index/search/filter
  ├─ request model + input state
  ├─ URL/header/body/curl serializers
  └─ fetch response adapters
        │
        ▼
public/index.html + public/assets/styles.css
```

## Data Contract

Keep the existing endpoint shape backward compatible and add normalized fields:

- `parameters[]`: `name`, `in`, `required`, `description`, `type`, `enum`, `example`, `default`, `format`.
- `requestBody`: existing content/schema/example fields plus `fields[]`, where each field has a stable dotted `name`, `required`, `type`, `format`, `enum`, `example`, `default`, and `description`.
- `responses[]`: existing schema data plus `kind` (`json`, `stream`, `binary`, `websocket`, `text`, `empty`) and `isBinary`.
- `requestMode`: derived from method/content type (`json`, `multipart`, `none`).

The generator remains the owner of OpenAPI interpretation. The browser only normalizes missing optional values and serializes user edits.

## Runtime State

```js
state = {
  data,
  filtered,
  activeId,
  filter,
  curlMode: "bash",
  request: {
    endpointId,
    path: {},
    query: {},
    headers: {},
    jsonText: "",
    multipart: {},
  },
  requestStatus: "idle | loading | cancelling | success | error",
  abortController,
  responseObjectUrl,
}
```

On endpoint switch, initialize only fields from the new endpoint and preserve environment config. Do not keep stale path/query/header values from a different endpoint. Local storage is limited to the existing Base URL and Token settings; uploaded `File` objects and response object URLs are never persisted.

## Request Serialization

1. Normalize Base URL by removing trailing slashes.
2. Replace `{parameter}` placeholders with `encodeURIComponent` values; reject missing required values and leave no unresolved braces.
3. Append non-empty query parameters with `URL`/`URLSearchParams`, preserving repeated values where the input supports arrays.
4. Build headers from the Authorization token plus edited endpoint headers. Do not duplicate authorization or set a multipart boundary.
5. For JSON, parse/validate the editor text before sending and pass the original JSON text as the body.
6. For multipart, append text values and selected files to `FormData`; serialize the same fields as `-F` in curl.
7. For GET/DELETE/none, omit `body` and body-specific headers.

The curl renderer has separate escaping functions for POSIX shell and PowerShell. It uses current values rather than the generated static `endpoint.curl` string, while preserving a placeholder for an empty token.

## Response Adapters

- `application/json` and `+json`: read text, parse when possible, otherwise show raw text.
- `text/event-stream`: read `response.body` with a `TextDecoder`, append chunks as they arrive, and finish with a complete stream status.
- `audio/*`, `video/*`, `application/octet-stream`, and OpenAPI binary schemas: call `response.blob()`, create an object URL, render an appropriate media element where possible, and expose a download link.
- status `101` or endpoint response metadata marked `websocket`: do not call ordinary body parsing; display protocol guidance.
- all other content types: choose text when readable and include content type in the meta line.

Always use `response.ok` only for status presentation, not as a reason to discard an error response body. On network/CORS errors show the original message and a concise curl fallback.

## UI Composition

Keep the existing document surface and add a structured Request Lab:

- request target summary with method/path and a curl mode segmented control;
- collapsible or stacked path/query/header editors;
- JSON editor or multipart field/file editor based on `requestMode`;
- action row with copy, send, cancel and reset states;
- response surface with status, headers, stream/binary preview and download action.

Use existing CSS custom properties and 16px major surface radius. Small field controls remain compact. No nested decorative cards are introduced.

## Compatibility and Rollback

- Existing data files remain readable because all new fields are optional and derived at load time when absent.
- If response handling causes regressions, revert only `app.js` and the additive CSS/HTML changes; `generate-site.js` and the original endpoint data remain independently usable.
- The generated JSON is reproducible from the local source snapshot; run the generator after any source refresh rather than hand-editing it.

## Security and Privacy

- Escape all endpoint metadata before HTML insertion.
- Use `textContent` for response payloads and code blocks; never inject response HTML.
- Treat Base URL, query, header and body values as user input when building URLs and commands.
- Do not log tokens, request bodies, selected file contents or response payloads to the console.
