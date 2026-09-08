# Release Readiness Design

## Design Boundary

The release path has four independently verifiable boundaries:

~~~text
Git working tree
  -> reviewed commit and GitHub remote
  -> Docker image and Compose container
  -> host Nginx plus DNS/TLS
  -> docs.xi-ai.cn static workbench
  -> direct browser/provider calls for smoke validation
~~~

The documentation container serves static files only. Provider calls continue to
use the configured Base URL from the browser or an external cURL runner. No
credential or upstream response is routed through the docs container.

## Repository and History

1. Work from a fresh clone or a separately named clean checkout.
2. Inspect git remote -v, default branch, commit graph, and working-tree status
   before copying or merging current files.
3. Preserve any existing target history. If the current workspace is not a Git
   checkout, create a new commit on a reviewed branch from the clean checkout.
4. Never use force push, reset, mirror, or purge operations to make histories
   appear aligned.
5. Record the exact source commit, target remote, branch, and push result.

A backup archive of the current workspace should be retained before any
integration copy. The source directory remains untouched during history work.

## Container and Host Boundary

The repository package is:

~~~text
Dockerfile + public/ + deploy/nginx.conf
docker-compose.yml -> host port DOCS_PORT (default 8080) -> container port 80
GET /healthz -> static Nginx health response
~~~

Container verification has two levels:

- Static: tools/test-deployment-files.js checks image base, copy boundary,
  healthcheck, port, read-only mode, and the docs/api hostname boundary.
- Runtime: Docker Compose build/up/curl/log checks prove the image and process
  actually work.

Host verification is separate. The host Nginx configuration must be tested
with nginx -t in the real include context, then reloaded only after the
operator confirms the diff and rollback target. The existing api.xi-ai.cn
server block is inspected and preserved.

## Domain Rollout

The intended route is:

~~~text
client -> DNS docs.xi-ai.cn -> TLS at host entrypoint
       -> host Nginx proxy -> 127.0.0.1:<DOCS_PORT>
       -> container Nginx -> public/index.html and assets
~~~

Validate the route in that order. A successful local container response is not
evidence of DNS, certificate, or host proxy correctness. Verify:

- DNS A/AAAA/CNAME resolution and expected server address.
- Certificate SAN/hostname and certificate expiry.
- HTTP to HTTPS behavior and response headers.
- Host proxy headers and upstream status.
- /healthz, /, /data/api-data.json, and a deep link.
- Existing api.xi-ai.cn response before and after the change.

Do not share or store private certificate material in the repository.

## Provider Smoke-Test Boundary

Use a local-only command or an operator terminal with environment variables:

~~~text
OPENAI_API_KEY
GEMINI_API_KEY
ANTHROPIC_API_KEY
OPENAI_MODEL
GEMINI_MODEL
ANTHROPIC_MODEL
XI_AI_BASE_URL
~~~

The runner must:

- construct requests through the existing provider operation definitions where
  possible, or use the generated cURL as the canonical request;
- fail closed when a required variable is missing;
- redact values before printing;
- print status, protocol, content type, elapsed time, and sanitized provider
  error category;
- avoid saving raw response bodies or tokens;
- support a dry-run/request-plan mode before live calls.

The minimum live probes use the site's supported provider contracts:

~~~text
OpenAI:  POST /v1/chat/completions  (or GET /v1/models)
Gemini:  POST /v1beta/models/<model>:generateContent
Claude:  POST /v1/messages
~~~

A browser-side success additionally requires upstream CORS. If cURL succeeds
but the browser fails, record that as a CORS/deployment limitation rather than
changing the static container into a proxy.

## Evidence and Rollback

Each stage writes sanitized evidence outside the source tree or into an
explicit release report with secret scanning before commit. Evidence must
include timestamps, command names, status, and artifact identifiers, but never
secret values or raw payloads.

Rollback targets:

- Git: prior reviewed commit and remote branch.
- Container: prior image tag/digest and Compose revision.
- Host: prior Nginx include and certificate configuration.
- DNS: prior record values and TTL window.
- Provider: revoke temporary keys and remove local environment variables.

## Compatibility and Non-Goals

This design preserves the existing static architecture, 43 endpoint coverage,
Provider registry, Request Lab, and api.xi-ai.cn boundary. It does not add
authentication, persistence, runtime API routing, or a new frontend framework.

