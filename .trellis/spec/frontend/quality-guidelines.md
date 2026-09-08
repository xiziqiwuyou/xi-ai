# Frontend Quality Guidelines

## Scope

The site must remain directly loadable by a modern evergreen browser with no
build step and no external runtime dependency. Changes should preserve the
existing static shell, CSS token system, and request-utils contract.

## Required Patterns

- Escape dynamic values before assembling HTML; prefer textContent for response
  and user input.
- Keep request validation and serialization in request-utils.js.
- Keep form markup accessible with labels, aria-required, status regions, and
  visible focus.
- Respect prefers-reduced-motion.
- Keep the Request Lab drawer's open, close, Escape, backdrop, focus restore,
  aria-hidden, and inert behavior intact.
- Keep the page free of horizontal overflow at desktop, tablet, and mobile
  widths.
- Use compact, stable dimensions for controls and do not scale typography with
  viewport width.

## Forbidden Patterns

- Raw response or user text inside innerHTML.
- Tokens in URLs, hashes, screenshots, generated fixtures, or logs.
- Provider-specific serialization duplicated in app.js or a component.
- Hardcoded endpoint facts that bypass generated data.
- Decorative layout changes that reduce table/code readability or create
  overlapping text.
- Claiming a real upstream call, Docker build, DNS/TLS deployment, or GitHub
  push without direct verification.

## Validation Commands

~~~powershell
node tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-deployment-files.js
node tools\test-request-lab.js
~~~

Also run node --check on every changed JavaScript file. When Docker is
available, parse Compose and build/run the image; otherwise report that the
external check remains pending.

The browser regression uses a local fixture server and must keep console
errors at zero. It covers the 43-endpoint catalog, OpenAI/Gemini/Claude
serialization, streaming, binary and multipart responses, cancellation,
model sync, deep links, and responsive Request Lab behavior.

## Review Checklist

1. Does the change preserve endpoint and sitemap coverage?
2. Does one request plan drive URL, headers, body, curl, and code examples?
3. Are stale asynchronous runs unable to overwrite current UI?
4. Are all dynamic values escaped and all controls keyboard accessible?
5. Are response errors, CORS failures, and binary/streaming states visible?
6. Is the layout verified at 1180, 1024, 768, and 390 pixels without overflow?
7. Are unavailable external validations labeled as unverified?

