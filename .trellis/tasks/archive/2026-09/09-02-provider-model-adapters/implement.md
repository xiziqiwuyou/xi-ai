# Implementation Plan

## Ordered Checklist

- [x] Add `tools/provider-registry.js` with OpenAI/Gemini/Claude providers, auth profiles, operations, model seeds, and endpoint aliases.
- [x] Enrich `tools/generate-site.js` output with provider/protocol/operation/model/auth metadata and embed the registry without changing 43/43 coverage.
- [x] Extend `public/assets/request-utils.js` with auth-profile resolution, operation overlays, stream intent, code examples, canonical extraction, and regression-safe defaults.
- [x] Add Provider Console markup to `public/index.html`: provider/protocol/model controls, sync preview, operation loader, and debug tabs/actions.
- [x] Update `public/assets/app.js` to load registry data, maintain provider-scoped state, load operation variants, run sync previews, generate all examples, and render canonical debug details.
- [x] Update `public/assets/styles.css` for the new controls at desktop/tablet/390px widths without nested decorative cards or overflow.
- [x] Extend `tools/test-api-data.js` and `tools/test-request-serialization.js` for registry coverage and three authentication protocols.
- [x] Extend `tools/test-request-lab.js` with local provider fixtures for OpenAI, Gemini native/stream, Claude, sync preview, canonical debug output, and stale-run behavior.
- [x] Run generator, syntax/data/serialization/browser checks and inspect desktop/mobile screenshots.
- [x] Update applicable frontend code-spec with provider/request contracts and record verification boundaries in the task journal.

## Validation Commands

```powershell
node tools\generate-site.js
node --check tools\provider-registry.js
node --check tools\generate-site.js
node --check public\assets\request-utils.js
node --check public\assets\app.js
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-request-lab.js
```

## Risky Files and Rollback Points

- `tools/provider-registry.js`: source of provider contract; test independently before generation.
- `tools/generate-site.js` / `public/data/api-data.json`: generated boundary; regenerate rather than hand-edit.
- `public/assets/request-utils.js`: highest protocol correctness risk; preserve old planner behavior for unbound endpoints.
- `public/assets/app.js` and `public/index.html`: workflow/state risk; verify endpoint switching and sync cancellation.
- `public/assets/styles.css`: responsive risk; inspect both screenshot widths.

## Verification Boundary

Local fixtures prove serialization, UI state, and response branches only. Real provider availability, CORS, model authorization, quota, and live model lists remain unverified unless the user supplies a reachable Base URL and token during a separate validation run.

## Verification Record

Date: 2026-09-02

- `node tools\generate-site.js` completed with `sitemapCount=43`, `endpointCount=43`, `missingFromSource=[]`, and `extraSource=[]`.
- Node syntax checks passed for the registry, generator, request utility, app, and all three test scripts.
- Data contract and request serialization tests passed.
- Browser regression passed against local fixtures for OpenAI, Gemini native/stream, Claude, model sync success/401/429/network failure, stale requests, binary responses, WebSocket hints, multipart, and required-field validation.
- Stream regression now verifies that the first SSE chunk renders before a delayed second chunk; the primary response reader is consumed only once.
- Desktop and 390px screenshots were generated as `qa-desktop-current.png` and `qa-mobile-current.png`; Playwright reported zero console errors and no page-level horizontal overflow.
- No real provider Base URL/token was used. Upstream CORS, authorization, quota, model availability, and provider response compatibility remain unverified.
- The workspace has no `.git` directory, so no commit or GitHub push was performed.
