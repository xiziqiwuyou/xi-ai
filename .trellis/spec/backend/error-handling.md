# Error Handling

## Applicability

There is no backend request handler in this repository. Error behavior exists
at two boundaries: the build-time Node scripts and the browser request lab.
Keep those boundaries explicit instead of inventing a server error envelope.

## Build-Time Errors

Build and contract scripts fail fast. `tools/generate-site.js` throws when a
source operation or shell is missing; Node then exits non-zero. The test files
use `node:assert/strict` and let assertion failures terminate the process.
Successful commands print a short contract summary; failure details belong in
the exception stack or assertion message.

```powershell
node tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
```

Never catch a generator error merely to produce a partial `api-data.json`.
Partial catalogs hide source drift and are harder to diagnose than a failed
build.

## Browser Request Errors

`public/assets/request-utils.js` returns a request plan with `ok` and `errors`
before network I/O. `public/assets/app.js` renders those validation errors in
the Request Lab and does not call `fetch` when the plan is invalid.

After a request starts:

- Keep a run ID, endpoint identity, and `AbortController` together.
- Treat `AbortError` as a user cancellation, not an application failure.
- For HTTP errors, preserve status, headers, and response text for debugging;
  do not replace a useful upstream body with a generic message.
- For CORS or network failures, show the failure and explain that the browser
  calls the configured Base URL directly.
- Redact configured secrets before rendering canonical debug output.

## Static Server Errors

Nginx serves `/healthz` and static files. SPA fallback is configured in
`deploy/nginx.conf`; it is not an API error handler. Do not add a fabricated
JSON error response to the static container unless a deployment contract
requires it.

## Common Mistakes

- Updating the response panel from an old request after the user changed
  endpoints.
- Clearing the current request controller from an old request's `finally`.
- Logging or rendering an Authorization, API key, or raw secret.
- Swallowing a source-generation exception and claiming coverage is complete.

