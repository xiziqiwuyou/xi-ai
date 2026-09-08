# State Management

## Overview

State is managed by the top-level state object in public/assets/app.js. There is
no external store. The generated catalog is immutable input; filtered lists,
the active endpoint, request editors, and response views are derived or
endpoint-scoped state.

## State Categories

- Catalog state: state.data, loaded once from api-data.json.
- Navigation state: filter, providerFilter, filtered, activeId, and the URL
  hash containing only the endpoint ID.
- Request editor state: state.request with endpointId, path, query, headers,
  jsonText, multipart, stream, providerId, authProfileId, and operationId.
- Environment state: Base URL and Token are held in the page; only explicit
  remember-token opt-in writes the token to localStorage.
- Async state: requestRunId, abortController, syncRunId, syncAbortController,
  response object URLs, and the last canonical debug object.
- Presentation state: curlMode, codeMode, responseView, drawer visibility, and
  modelSyncPreview.

## Transition Rules

Switching endpoints or making a filter empty must:

1. Abort and invalidate the old request run.
2. Rebuild endpoint-scoped request state.
3. Clear stale response/object URLs.
4. Render the empty or new endpoint state.
5. Update the endpoint hash without adding credentials or payload data.

Use getActiveEndpoint() as the only active-endpoint accessor. Do not fall back
to the first catalog item when the filter has no match.

~~~js
function getActiveEndpoint() {
  return state.filtered.find((endpoint) => endpoint.id === state.activeId) || null;
}
~~~

## Async Identity

Every request captures its endpoint ID, incremented run ID, and controller.
Only a run that still owns all three may write response UI or clear shared
controller state. The same rule applies to model synchronization with its own
run ID and controller.

## Derived State

URL, headers, body, validation errors, curl, Node.js, and Python examples all
come from one request plan. Keep optional empty query/header values out of the
serialized request. A documentation-only endpoint may still render examples,
but the send button remains unavailable.

## Persistence and Privacy

- Base URL may be saved as environment configuration.
- Token is memory-only unless the user explicitly selects local persistence.
- Never put secrets in hashes, query strings used for links, screenshots, or
  debug output.
- Revoke object URLs when replacing binary responses.

## Required Regression Cases

The browser test must cover no-result filtering, stale-request protection,
cancellation, drawer focus/escape behavior, stream and binary responses, and
no horizontal overflow at the supported compact widths.

