# Logging Guidelines

## Applicability

The project has no long-running backend logger. Node tools use the standard
console for short-lived build/test output, and the browser should keep the UI
as the primary request diagnostic surface.

## Current Format

- Successful generators and tests print one concise line or a JSON coverage
  summary with `console.log`.
- Unhandled failures are reported through the process error output and a
  non-zero exit code.
- Browser request details belong in the response metadata, headers, raw body,
  and canonical debug tabs rather than unsolicited console logging.

Examples include the final coverage output in `tools/generate-site.js` and the
contract summaries in `tools/test-api-data.js` and
`tools/test-request-serialization.js`.

## What May Be Logged

Log deterministic diagnostics useful for local development: endpoint counts,
method/mode counts, assertion names, status codes, elapsed time, content type,
and sanitized error categories. Keep output stable enough for a developer to
scan in CI.

## What Must Not Be Logged

Never log API tokens, Authorization headers, provider API keys, request bodies
that may contain secrets, uploaded file contents, response bodies by default,
or full URLs containing credentials. Do not add token values to screenshots,
test fixtures, generated JSON, or exception messages.

If a debug view needs secret awareness, pass an explicit secret list to the
redaction helper in `request-utils.js`; do not duplicate ad hoc replacements.

## Common Mistakes

- Leaving a temporary `console.log(request)` in browser code.
- Printing a complete request plan because it is convenient during debugging.
- Treating verbose output as a substitute for a visible response-debug panel.

