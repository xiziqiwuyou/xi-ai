# Backend and Build Quality Guidelines

## Scope

There is no backend runtime. This guide covers the build-time Node scripts and
deployment artifacts that produce and serve the static site.

## Required Checks

Run the smallest relevant checks and then the full baseline before declaring a
cross-boundary change complete:

```powershell
node --check tools\generate-site.js
node --check tools\provider-registry.js
node tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-deployment-files.js
node tools\test-request-lab.js
```

Docker Compose parsing and image build require a Docker-enabled host. The
repository's local Windows environment may not have Docker; report that gap
instead of treating static inspection as a build proof.

## Source and Output Rules

- `source-new-api-docs/` is read-only.
- `tools/generate-site.js` is the source-to-output boundary.
- Provider protocol behavior belongs in the registry and shared request
  utilities, not in repeated test-specific fixtures.
- Coverage must remain complete: sitemap and endpoint counts, missing slugs,
  extra slugs, route variants, request modes, and response kinds are asserted.
- Deployment configuration must keep `docs.xi-ai.cn` separate from the existing
  `api.xi-ai.cn` service.

## Forbidden Patterns

- Catch-all error handling that returns a partial generated catalog.
- Hand-editing generated JSON as the only fix.
- Adding a runtime proxy or credential store without a planned security review.
- Claiming a real provider, DNS, TLS, Docker, or GitHub result without direct
  evidence from that environment.

## Review Checklist

1. Is the change placed at the correct source, transform, browser, or deploy
   boundary?
2. Does it preserve source coverage and normalized metadata?
3. Are secrets absent from logs, fixtures, URLs, screenshots, and artifacts?
4. Do focused tests and the full browser regression pass?
5. Are any unavailable external checks clearly reported as unverified?

## Provider Smoke Runner

The release-only provider smoke runner may call an upstream endpoint directly,
but it must remain a diagnostic client rather than a proxy. It must fail closed
when a required environment variable is missing, use a timeout, and print only
method/path metadata or a sanitized result summary. Tokens, Authorization
values, raw request bodies, raw response bodies, and secret-bearing query
parameters must never enter stdout, screenshots, fixtures, or committed
evidence. A local HTTP fixture test is required for the runner's success path;
it does not count as real provider verification.
