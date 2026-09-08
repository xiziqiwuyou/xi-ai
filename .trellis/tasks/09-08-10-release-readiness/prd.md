# Release Readiness: GitHub, Docker, Domain, and Provider Validation

## Goal

Make the Xi AI API documentation workbench releasable with direct evidence for
source control, container behavior, the docs domain, and real provider calls.
The release must preserve the existing api.xi-ai.cn service and must not turn
the static documentation container into an unreviewed credential proxy.

## Background and Confirmed Facts

- The repository currently contains a static HTML/CSS/vanilla JavaScript
  workbench with generated endpoint data.
- The root checkout currently has no Git metadata or configured remote.
- Docker and Nginx command-line validation are not available in the current
  Windows environment; the existing Docker and Nginx files therefore have not
  been image- or host-verified here.
- Fixture browser tests cover OpenAI, Gemini, and Claude serialization and
  response handling. They do not prove real credentials, model access, quota,
  upstream CORS, DNS, TLS, or host Nginx behavior.
- The intended GitHub destination is xiziqiwuyou/xi-ai.
- The intended documentation hostname is docs.xi-ai.cn. The existing
  api.xi-ai.cn service is a protected boundary and must not be replaced.

## Requirements

### R1. Preserve and publish repository history safely

Create or obtain a clean Git checkout, inspect any existing local and remote
history, and integrate the current project without force-pushing or deleting
unknown commits. Configure the intended GitHub remote only after the target
repository and default branch are confirmed. Push a reviewed commit or branch
and capture the resulting commit and remote evidence.

### R2. Prove the Docker package

On a Docker-enabled host, build the image from the repository, start the
Compose service, and verify:

- GET /healthz returns 200 and the expected body.
- /, /assets/*, and /data/api-data.json are served successfully.
- The container is read-only as configured and exits cleanly.
- The Nginx configuration serves docs.xi-ai.cn and never declares
  api.xi-ai.cn.
- The published port and logs match the documented configuration.

### R3. Validate the docs domain without disrupting the API domain

Using the real DNS and host entrypoint, verify DNS resolution, TLS certificate
coverage, HTTPS access, host Nginx configuration in its actual include
context, and forwarding to the docs container. Preserve the existing
api.xi-ai.cn route and record before/after evidence. Do not make DNS, TLS, or
Nginx changes unless the operator has authorized access and a rollback path.

### R4. Run credential-safe real provider smoke tests

Using temporary, least-privileged credentials supplied through environment
variables or an equivalent secret mechanism, run at least one successful
request for each supported family:

- OpenAI-compatible chat/completions or models endpoint.
- Gemini native generateContent endpoint.
- Claude native messages endpoint.

Where the account and model permit it, cover one streaming request as well.
Record only sanitized status, content type, protocol, elapsed time, model
identifier category, and canonical response fields. Keep credentials out of
URLs, logs, screenshots, generated JSON, Git history, and the final report.

### R5. Produce a release evidence report

Document the exact commit, image tag/digest, container health result, domain
checks, provider smoke-test outcomes, unavailable checks, and rollback steps.
Distinguish fixture verification from real upstream verification. A blocked
external prerequisite is a reported blocker, not a successful release claim.

## In Scope

- Git checkout and remote/history safety for xiziqiwuyou/xi-ai.
- Dockerfile, Compose, Nginx container, and health/static asset verification.
- docs.xi-ai.cn DNS/TLS/host Nginx verification.
- Real OpenAI, Gemini, and Claude smoke tests using temporary credentials.
- Reproducible sanitized evidence and a release-readiness decision.

## Out of Scope

- Rewriting the existing documentation UI or endpoint catalog.
- Adding a backend proxy, database, user account system, or token vault.
- Changing or replacing api.xi-ai.cn.
- Force-pushing, deleting remote history, or merging unknown branches.
- Purchasing provider quota, changing provider account policy, or storing
  production credentials in the repository.
- Claiming DNS, TLS, Docker, GitHub, or provider success from local static
  checks alone.

## Acceptance Criteria

- [ ] A clean checkout and the target remote are identified, existing history
      is reviewed, and no unknown history is overwritten.
- [ ] A reviewed commit is pushed to xiziqiwuyou/xi-ai, or a concrete external
      blocker is recorded with the exact missing permission or credential.
- [ ] Docker Compose builds and starts on a Docker-enabled host, /healthz
      returns 200, static assets load, and the container logs show no startup
      error.
- [ ] The container and host configuration preserve api.xi-ai.cn and expose
      docs.xi-ai.cn only for documentation traffic.
- [ ] DNS, TLS, HTTPS, and actual host Nginx include-context validation are
      evidenced, or explicitly marked blocked.
- [ ] OpenAI, Gemini, and Claude real smoke tests have sanitized, reproducible
      results; any failed or unverified provider is named.
- [ ] The final evidence report contains no token, Authorization value,
      secret-bearing URL, raw request body, or raw provider response.
- [ ] Rollback instructions identify the prior Git revision, image/container
      version, and host configuration restore point.

## Risks and Deferred Prerequisites

- GitHub authentication and remote visibility may require user action.
- Docker and host Nginx may only be available on a deployment server.
- DNS/TLS changes require access to the authoritative DNS and certificate
  systems.
- Provider tests require temporary credentials, permitted model IDs, quota,
  and network access. No secret should be pasted into chat or committed.

