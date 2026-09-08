# Frontend Directory Structure

## Overview

This is a framework-free, single-page static application. There is no React
component tree, bundler, router package, or frontend build step. The browser
loads the HTML shell, CSS, generated JSON, and two JavaScript modules directly.

## Directory Layout

~~~text
public/
  index.html                 Semantic application shell and landmarks
  assets/
    app.js                   DOM rendering, state transitions, and events
    request-utils.js         Pure request plans, serialization, and debug data
    styles.css               Tokens, layout, responsive rules, and states
  data/api-data.json         Generated endpoint/provider catalog
tools/
  generate-site.js            Source adapter and normalized data generator
  provider-registry.js        Provider protocol and auth metadata
  test-request-lab.js         Browser regression and fixture server
  test-request-serialization.js
  test-api-data.js
  test-deployment-files.js
source-new-api-docs/          Read-only source snapshots
deploy/                       Nginx container configuration
~~~

## Ownership

- Keep semantic structure and stable element IDs in public/index.html.
- Keep browser orchestration in public/assets/app.js.
- Keep pure transformations in public/assets/request-utils.js. It must remain
  usable from Node contract tests.
- Keep visual tokens and responsive behavior in public/assets/styles.css.
- Keep generated catalog facts behind tools/generate-site.js.
- Keep provider operations and authentication profiles in
  tools/provider-registry.js.

Do not create a second page-specific copy of request serialization or provider
facts.

## Naming

Use camelCase for JavaScript functions, state keys, and local variables. Use
stable kebab-case or descriptive lowercase names for files. DOM hooks use
semantic IDs for singleton regions and data-* attributes for repeated,
metadata-driven controls. Test scripts use test-*.js.

## Examples

- Shell and landmarks: public/index.html
- Endpoint and Request Lab rendering: public/assets/app.js
- Shared request contract: public/assets/request-utils.js
- Source-to-runtime flow: tools/generate-site.js

