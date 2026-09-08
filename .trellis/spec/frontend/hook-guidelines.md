# Hook Guidelines

## Applicability

This project has no React hooks, custom hook library, or reactive framework.
Do not introduce a hook abstraction for a small state transition. Stateful
behavior is implemented with plain functions, one top-level state object, and
DOM event listeners in public/assets/app.js.

## Stateful Function Pattern

Use explicit names for transitions and keep side effects at the orchestration
boundary:

~~~js
function setRequestForEndpoint(endpoint) {
  invalidateRequestRun();
  state.request = endpoint
    ? requestUtils.createRequestState(endpoint, {
        registry: getRegistry(),
        operation: getOperation(endpoint.operationIds?.[0]),
      })
    : null;
  renderTester();
}
~~~

Pure calculations belong in request-utils.js. A function there should accept
data and options and return a value without depending on DOM globals.

## Data Fetching

- init() fetches the generated ./data/api-data.json once.
- sendRequest() creates a request plan, owns an AbortController, and fetches the
  configured Base URL.
- syncModels() uses a separate controller and run ID so a model preview cannot
  overwrite a newer endpoint or sync result.
- The browser calls the configured provider directly; it does not assume a
  same-origin API proxy.
- Always handle AbortError separately and make stale async completions no-ops.

## Naming

Use verb-led names for transitions and actions: selectEndpoint,
handleProviderChange, refreshRequestOutput, syncModels, cancelRequest. Use
get*/find* names for pure lookups and render* names for DOM projection.

## Common Mistakes

- Creating a hook-like helper that closes over mutable DOM state and cannot be
  tested from Node.
- Starting fetch before request-utils.js validates required fields.
- Sharing one AbortController between model sync and request execution.
- Letting an old promise update the currently selected endpoint.

