# Implementation Plan

## Ordered Checklist

- [x] Read task artifacts and frontend/backend specs; record the change boundary before product edits.
- [x] Extend `tools/generate-site.js` to emit parameter defaults/formats, normalized request fields, request mode and response kind metadata without changing endpoint coverage.
- [x] Regenerate `public/data/api-data.json` and run structural coverage assertions for all 43 endpoints and all path/query/header/body/response classes.
- [x] Update `public/index.html` Request Lab markup with semantic target, parameter editor, curl mode controls, multipart file controls, response actions and accessible status regions.
- [x] Refactor `public/assets/app.js` around one request-state serializer: endpoint initialization, path/query/header editing, JSON validation, multipart `FormData`, Bash/PowerShell curl, copy/reset/send/cancel and response adapters.
- [x] Update `public/assets/styles.css` for the new controls and response states while preserving the existing 16px major-radius and controlled exclusion treatment at desktop/mobile breakpoints.
- [x] Add focused no-build tests/scripts for data coverage, URL/curl serialization and safe response classification; use a local mock HTTP server where browser-independent verification is useful.
- [x] Start or reuse a local static server and verify `/` and `/data/api-data.json` return 200.
- [x] Run browser interaction checks: search/filter/navigation, path/query/header edits, JSON/multipart/none request modes, copy mode switch, cancellation and response branches.
- [x] Capture desktop and 390px screenshots, inspect overflow/overlap/focus states, and compare the current Figma page nodes against the implemented layout.
- [x] Run final syntax/data checks, inspect the diff, update project specs only with conventions actually established by this implementation, then finish/archive the Trellis task without inventing a Git commit in this non-repository workspace.

## Completed Verification

- `node tools\\generate-site.js`: `sitemapCount=43`, `endpointCount=43`, `missingFromSource=[]`, `extraSource=[]`.
- Data contract: 43 endpoints; POST 28, GET 14, DELETE 1; JSON 22, multipart 5, none 16.
- Browser mock regression: JSON, SSE, audio, video, WebSocket guidance, multipart file/curl, required-field errors, cancellation, empty search state, stale endpoint isolation and stale response race passed; console errors 0.
- Screenshots: desktop and 390px mobile captured; mobile document width equals viewport width with no page-level horizontal overflow.
- Figma file `wO6N7uZoLiej61w8zzh8oD`: retained final design frames `2:2` (desktop), `2:124` (mobile), `8:2` and `9:2` (complete endpoint variants); major surface nodes were aligned to 16px and ambient nodes `32:2`, `32:3`, `8:3`, `9:3` use `EXCLUSION`. Temporary capture frame `17:2` was removed after verification.
- Real provider calls, CORS outside the fixture, and WebSocket handshake remain unverified without a user-supplied reachable Base URL and Token.

## Validation Commands

```powershell
node tools\generate-site.js
node --check public\assets\app.js
node --check tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
```

Browser/static checks:

```powershell
Invoke-WebRequest http://127.0.0.1:5173/ -UseBasicParsing
Invoke-WebRequest http://127.0.0.1:5173/data/api-data.json -UseBasicParsing
```

## Risky Files and Rollback Points

- `tools/generate-site.js`: rollback point after generator/data contract checks.
- `public/index.html`: rollback point after static DOM load.
- `public/assets/app.js`: highest behavioral risk; retain the prior file hash and validate each request mode before proceeding.
- `public/assets/styles.css`: visual risk; compare desktop/mobile screenshots before finalizing.
- `public/data/api-data.json`: generated artifact; regenerate from source instead of hand-editing.

## Deferred Verification

Real third-party API calls, CORS behavior, WebSocket handshake success and provider-specific binary payload semantics require a user-supplied reachable Base URL and token. The implementation will verify the client-side branches with local fixtures and clearly report this boundary.
