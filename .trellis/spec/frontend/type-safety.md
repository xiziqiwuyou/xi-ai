# Type Safety

## Current Type System

The frontend is plain JavaScript. There is no TypeScript compiler, runtime
schema library, or generated type package. Type safety is provided by stable
normalized object shapes, small lookup helpers, and executable Node/browser
contract tests.

## Shape Ownership

- tools/generate-site.js owns the endpoint normalization shape.
- tools/provider-registry.js owns provider, auth profile, and operation
  metadata.
- public/assets/request-utils.js owns request plan, response classification,
  model list normalization, and canonical debug shapes.
- app.js consumes those contracts and should not redefine them locally.

When adding a field, search every producer and consumer first, then update
the relevant contract test.

## Runtime Validation

Validate at boundaries:

- Check arrays with Array.isArray before mapping or flattening.
- Use explicit defaults for missing optional OpenAPI fields.
- Validate required path, query, header, multipart, and JSON values in
  buildRequestPlan().
- Assert generated coverage and normalized fields in tools/test-api-data.js.
- Use operation/provider lookup helpers rather than indexing an unknown array.

~~~js
const provider = requestUtils.findProvider(registry, providerId);
const operation = requestUtils.findOperation(registry, operationId);
if (!provider || !operation) return null;
~~~

## Conventions

Prefer optional chaining for genuinely optional metadata and explicit
normalization for values that cross the source-to-browser boundary. Keep
IDs and enum-like strings stable. Use guard clauses for invalid state. Do not
silently coerce a missing required value into a plausible default.

## Forbidden Patterns

- Introducing any as if this were TypeScript does not solve validation.
- Duplicating OpenAPI parsing or provider protocol rules in app.js.
- Blindly trusting response JSON shape before classification and parsing.
- Using string replacement as a substitute for structured JSON parsing.
- Adding a type assertion or fallback that hides an unknown provider,
  operation, endpoint, or response kind.

## Examples

- Endpoint normalization: tools/generate-site.js, endpointFromMdx().
- Request shape and validation: public/assets/request-utils.js,
  createRequestState() and buildRequestPlan().
- Browser contract coverage: tools/test-request-serialization.js and
  tools/test-api-data.js.

