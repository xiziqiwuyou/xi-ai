# Release Readiness Implementation Plan

## Gate 0: Preconditions and Safety

- [x] Confirm the operator has authorized the GitHub integration; Docker host,
      DNS/TLS, and provider credentials remain external prerequisites.
- [ ] Create a backup/archive of the current workspace and a disposable clean
      checkout.
- [ ] Confirm temporary credentials can be supplied through environment
      variables without entering chat, files, URLs, screenshots, or logs.
- [ ] Define the evidence output location and secret-scan rule before live work.

Rollback point: stop before any remote push, DNS change, certificate change, or
provider call if a prerequisite is missing.

## Gate 1: Repository and GitHub

- [x] Inspect the clean checkout git status, remotes, branches, tags, and
      recent commit graph.
- [x] Inspect xiziqiwuyou/xi-ai remote history and default branch using
      read-only commands.
- [x] Compare the current workspace against the target checkout; preserve
      unrelated files and unknown remote commits.
- [x] Create a focused commit or branch containing the static project and
      Trellis artifacts.
- [x] Push only after reviewing the commit diff and branch target.
- [x] Capture remote URL, branch, commit hash, and push response.

Validation:
~~~powershell
git status --short
git remote -v
git log --oneline --decorate -n 20
git ls-remote <verified-remote>
~~~

Evidence: sanitized Git transcript and commit hash.

## Gate 2: Docker Runtime

- [x] Run the deployment file contract tests locally.
- [ ] On a Docker-enabled host, build and run the deployment package.
- [ ] Build a uniquely tagged image.
- [ ] Start Compose with an explicit DOCS_PORT.
- [ ] Check container status, health, logs, /healthz, /, and
      /data/api-data.json.
- [ ] Confirm a deep link loads and no host port collision is hiding the result.
- [ ] Stop the stack and verify clean restart behavior.

Validation:
~~~powershell
node tools\test-deployment-files.js
docker compose config
docker build -t xi-ai-docs:<commit> .
docker compose up -d
curl.exe -i http://127.0.0.1:<port>/healthz
curl.exe -i http://127.0.0.1:<port>/
curl.exe -i http://127.0.0.1:<port>/data/api-data.json
docker compose ps
docker compose logs --no-color
~~~

Evidence: image tag/digest, health response, compose status, and sanitized
logs.

## Gate 3: Domain and Host Nginx

- [ ] Back up the active host Nginx include and identify the existing
      api.xi-ai.cn server block.
- [ ] Add or review a docs.xi-ai.cn-only proxy entry with the correct upstream
      port and security headers.
- [ ] Run nginx -t against the actual configuration context.
- [ ] Reload only after the test and diff review pass.
- [ ] Verify DNS, certificate SAN/expiry, HTTP/HTTPS, /healthz, root, deep-link
      fallback, and generated data over the public hostname.
- [ ] Request api.xi-ai.cn before and after and compare status/route behavior.

Validation:
~~~powershell
nginx -t
Resolve-DnsName docs.xi-ai.cn
curl.exe -I https://docs.xi-ai.cn/
curl.exe -i https://docs.xi-ai.cn/healthz
curl.exe -i https://docs.xi-ai.cn/data/api-data.json
curl.exe -I https://api.xi-ai.cn/
~~~

Evidence: DNS answer, certificate summary, sanitized response headers, Nginx
test result, and before/after API-domain check.

## Gate 4: Real Provider Smoke Tests

- [x] Run a dry-run that prints request method/path/header names only.
- [x] Add and fixture-test a credential-safe provider smoke runner.
- [ ] Export temporary least-privilege keys in the operator shell.
- [ ] Probe OpenAI-compatible, Gemini native, and Claude native requests.
- [ ] Probe streaming where the model/account supports it.
- [x] Record only sanitized status, content type, elapsed time, and canonical
      debug projections.
- [ ] Remove variables and revoke temporary keys after testing.
- [ ] Separately test browser CORS using the deployed docs page, if authorized.

Validation:
~~~powershell
$env:XI_AI_BASE_URL='https://api.xi-ai.cn'
$env:OPENAI_API_KEY='(set outside captured logs)'
$env:GEMINI_API_KEY='(set outside captured logs)'
$env:ANTHROPIC_API_KEY='(set outside captured logs)'
node tools\provider-smoke-test.mjs --dry-run
node tools\provider-smoke-test.mjs --provider openai
node tools\provider-smoke-test.mjs --provider gemini
node tools\provider-smoke-test.mjs --provider claude
~~~

The exact runner may be added during implementation only if existing cURL
commands cannot provide reproducible redacted evidence. Do not commit live
credentials or raw responses.

## Gate 5: Release Decision and Handoff

- [x] Run the full local baseline again.
- [x] Scan release artifacts for token-like values and credential-bearing URLs.
- [x] Write a concise release report with pass, fail, blocked, and unverified
      labels.
- [x] List rollback commands and the owner of each external action.
- [ ] Archive the task only after all required acceptance criteria are met or
      the task is explicitly blocked with evidence.

## Final Verification Baseline

~~~powershell
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-deployment-files.js
$env:NODE_PATH='C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
& 'C:\Users\56252\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tools\test-request-lab.js
~~~

## Planned Artifacts

- Sanitized release evidence report.
- Optional local-only provider smoke runner or documented cURL transcript.
- Git commit and remote push evidence.
- Docker image tag/digest and Compose health evidence.
- Domain/TLS/Nginx validation evidence.
