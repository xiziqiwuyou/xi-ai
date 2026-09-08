# Database Guidelines

## Applicability

There is no database, ORM, migration system, or server-side persistence in
this project. The generated API catalog is a static JSON artifact. Browser
configuration is limited to memory plus explicit localStorage opt-in for the
Base URL and Token; it is not a database layer.

## Current Persistence Rules

- `public/data/api-data.json` is regenerated from read-only source material by
  `tools/generate-site.js`.
- The Token stays in page memory by default. It may be written to
  `localStorage` only after the user selects the explicit remember option.
- The URL hash may contain only an endpoint ID. It must never contain a token,
  request body, headers, or response data.
- Do not introduce IndexedDB, a hosted database, or a new localStorage schema
  as a shortcut for product features.

## Query and Migration Patterns

Not applicable. There are no queries, transactions, migrations, indexes, or
database naming conventions. Data selection is an in-memory filter over the
generated endpoint array (`filterEndpoints()` in `public/assets/app.js`).

## Generated Data Contract

When catalog data changes, change the source adapter or provider registry and
regenerate the artifact:

```powershell
node tools\generate-site.js
node tools\test-api-data.js
```

Do not hand-edit `public/data/api-data.json` to fix a persistent problem. The
generator must preserve the source coverage counts and report missing or extra
slugs.

## Common Mistakes

- Treating localStorage as a secure secret store.
- Adding a database to support a feature that can remain build-time metadata.
- Editing generated JSON without updating its source adapter.
- Persisting request payloads or response bodies without an approved privacy
  design.

If server-side persistence becomes necessary, create a new task that defines
retention, encryption, authentication, migration ownership, and rollback
before adding dependencies or schema files.

