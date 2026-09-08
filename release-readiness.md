# Xi AI Release Readiness

Date: 2026-09-08
Scope: static documentation workbench and its Docker packaging

## Decision

**Reviewable, not production-certified.** The local application and release
tooling pass their fixture and contract checks. Docker runtime, `docs.xi-ai.cn`
DNS/TLS/host Nginx, and real provider credentials were not available in this
workspace, so those gates remain blocked or unverified.

## Git Evidence

- Target: `https://github.com/xiziqiwuyou/xi-ai`, default branch `main`.
- Remote parent inspected before integration:
  `0aac93e800ed5e8c0c4e416cf4efc277d88a8951`.
- Local workbench baseline: `d4becba` (`Prepare Xi AI API documentation workbench release`).
- GitHub REST authentication reported the intended account with repository
  `push` and `admin` permissions; the token value was never printed.
- Git smart-protocol access from this Windows environment resets or times out.
  Any published commit will therefore be created through the authenticated
  GitHub Git Data API and compared with `main` before the branch is updated.
- Review branch and resulting integration commit: **pending this release run**.

## Verification Matrix

| Area | Result | Evidence |
| --- | --- | --- |
| Generated catalog | PASS | `43/43` sitemap and endpoint coverage; no missing or extra source entries. |
| Request serialization | PASS | OpenAI, Gemini header/query, Claude headers, multipart, and redaction assertions. |
| Deployment contract | PASS | Docker, Compose, health endpoint, `docs.xi-ai.cn` boundary, and `api.xi-ai.cn` exclusion assertions. |
| Browser request lab | PASS | Playwright fixture regression; console errors `0`; no horizontal overflow at `1180`, `1024`, `768`, or `390` pixels. |
| Provider runner | PASS | Dry-run for all three families and local HTTP fixture success/error/redaction test. |
| Docker build/runtime | BLOCKED | `docker`/Compose is not installed in this environment; no image or container claim is made. |
| Host Nginx | BLOCKED | Host entrypoint is not available; `nginx -t` and reload were not run. |
| `docs.xi-ai.cn` DNS/TLS | BLOCKED | DNS currently returns no record; no DNS or certificate change was attempted. |
| Existing API domain | OBSERVED | `api.xi-ai.cn` resolved to `43.160.203.140` and HTTPS returned `200 OK`; no route was changed. |
| Real OpenAI/Gemini/Claude calls | BLOCKED | No temporary credentials were supplied; only dry-run and local fixture evidence exists. |
| Browser CORS against production | UNVERIFIED | Requires a deployed docs origin and authorized provider credentials. |

## Reproduction

```powershell
node tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-deployment-files.js
node tools\test-provider-smoke-test.mjs

# Start the static fixture server in another terminal before the browser test.
node tools\static-server.js 5173 public
$env:NODE_PATH='C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools\test-request-lab.js
```

For a real provider check, run `node tools\provider-smoke-test.mjs --dry-run`
first, then inject temporary environment variables in an operator-owned shell.
The runner intentionally prints no raw request or response content.

## Security Review

- `source-new-api-docs/openapi/NewAPI.apifox.json` is ignored because it
  contains captured token-shaped request history.
- No credential value, Authorization value, raw provider response, or
  secret-bearing URL is included in this report.
- The static container serves files only and does not proxy provider traffic.

## Rollback

1. GitHub: restore the previous reviewed `main` revision
   `0aac93e800ed5e8c0c4e416cf4efc277d88a8951`; do not force-push or delete
   unknown history.
2. Container: stop the new Compose project and restore the prior image tag or
   digest recorded by the deployment operator.
3. Host: restore the prior Nginx include and certificate configuration, then
   run `nginx -t` before reload.
4. DNS: restore the previous record and observe its TTL; no record was changed
   by this work.
5. Providers: remove local environment variables and revoke temporary keys.

## Open External Gates

An operator with Docker access, authoritative DNS/TLS and host Nginx access,
and temporary least-privilege provider credentials must complete the blocked
rows before calling this package production-ready.
