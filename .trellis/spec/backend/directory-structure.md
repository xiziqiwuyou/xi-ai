# Backend Directory Structure

## Applicability

This repository has no backend runtime. It is a static documentation site with
a Node.js build-time data generator and an Nginx container. Do not infer a
server, route layer, service layer, or database from the word "API" in the
product name.

## Current Layout

```text
source-new-api-docs/       Read-only MDX and OpenAPI facts
tools/
  generate-site.js         Build-time source adapter and JSON generator
  provider-registry.js     Provider, auth, operation, and model metadata
  static-server.js         Local fixture/static server used by tests
  test-*.js                Node-based contract and browser tests
public/
  index.html               Static application shell
  assets/app.js            Browser state, rendering, and event orchestration
  assets/request-utils.js  Pure request planning and response helpers
  assets/styles.css        CSS tokens and layout
  data/api-data.json       Generated runtime data
deploy/nginx.conf          Container web server configuration
Dockerfile                 Static image definition
docker-compose.yml         Local container wiring
```

The `source-new-api-docs/` tree is a fact source and is not a place for local
product overrides. Generated files under `public/data/` are outputs, not a
second source of truth.

## Boundaries

- Put source parsing, normalization, and coverage checks in `tools/`.
- Put provider protocol metadata in `tools/provider-registry.js`.
- Put browser behavior in `public/assets/`; keep pure serialization in
  `request-utils.js` and DOM/state orchestration in `app.js`.
- Put only browser-loadable assets in `public/`.
- Put container-only web server changes in `deploy/`, `Dockerfile`, or
  `docker-compose.yml`.
- Do not place a server under `public/`, and do not add runtime endpoints to a
  build-time script without a separate design and task.

## Naming

Use lowercase kebab-case for documentation and deployment filenames, camelCase
for JavaScript functions and state properties, and stable descriptive IDs for
provider operations and endpoints. Test files use the `test-*.js` convention.

## If a Backend Is Added

A future backend must be introduced as a separate task with an explicit data
and security boundary. Add its directory layout and contracts here before
writing routes. It must not silently change the static site into a proxy or
persist user tokens.

## Examples

- Source adapter: `tools/generate-site.js`
- Provider metadata: `tools/provider-registry.js`
- Static server fixture: `tools/static-server.js`
- Container entrypoint configuration: `deploy/nginx.conf`
