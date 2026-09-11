# Interaction and Deployment Contracts

## 1. Scope / Trigger

Use this contract when changing generated endpoint metadata, endpoint/provider/operation navigation, credential persistence, copy actions, responsive Request Lab behavior, Figma capture, or the static Nginx container.

The read-only source corpus remains the documentation authority. The browser application may add interaction metadata and transient state, but it must not alter source coverage or introduce a server-side API proxy.

## 2. Signatures

Generated endpoint fields:

~~~js
{
  documentationOnly: boolean,
  routeKey: string,
  routeVariantIds: string[]
}
~~~

Frontend transition owners:

~~~js
isEndpointRunnable(endpoint) -> boolean
selectEndpoint(id, { ensureVisible, scroll }) -> void
handleOperationSelection(operationId) -> void
loadOperation(operation) -> void
endpointHash(id) -> string
openTesterDrawer() -> void
closeTesterDrawer({ restoreFocus }) -> void
~~~

Deployment surface:

~~~text
DOCS_PORT: optional host port, default 8080
GET /healthz -> 200 text/plain "ok"
server_name -> docs.xi-ai.cn
~~~

## 3. Contracts

### Generated route state

- routeKey is the upper-case method plus a path with trailing slashes removed; the root path remains /.
- routeVariantIds contains every source endpoint with the same routeKey, including the endpoint itself.
- documentationOnly is true when the source title/category contains 未实现 or every declared response status is 501.
- Route grouping is presentational only. It must not merge, delete, or renumber any of the 43 source documents.

### Selection and URL state

- Initial selection prefers a valid endpoint hash, then createchatcompletion, then the first source endpoint.
- The URL hash contains only endpoint=<encoded id>. Base URL, Token, payload, headers, and response data never enter the URL.
- Selecting an operation bound to the current endpoint rebuilds request state immediately.
- Selecting an operation bound to another endpoint clears filters and atomically switches endpoint, provider, operation, auth profile, model binding, request editors, generated examples, and hash.
- An unbound endpoint shows a compatibility placeholder. There is no second Load operation action.

### Runtime safety

- documentationOnly endpoints keep parameters, Schema, cURL, Node.js, and Python examples visible but never call fetch.
- Base URL may be stored locally. Token stays in page memory unless the user checks rememberToken and explicitly saves.
- Unchecking rememberToken or using clearToken removes the token storage key. clearToken also empties the input.
- Copy actions operate only on already-rendered, redacted text.
- Figma capture loads only when figmaCapture=1 or figmaCapture=true is present.

### Figma capture URL state

- The capture client is loaded only by the opt-in `figmaCapture` query flag;
  ordinary production loads must not fetch the remote capture script.
- A capture URL uses hash parameters such as `figmacapture` and
  `figmaendpoint` in addition to the normal endpoint selection. While that
  marker is present, `updateEndpointHash(id)` must update only `endpoint` and
  preserve the capture parameters until the capture has been submitted.
- `figmaTester=1` is a capture-only query opt-in. It may open the compact
  tester after initialization when the compact media query matches, but it
  must not alter ordinary navigation or desktop behavior.

~~~js
const currentHash = window.location.hash;
if (currentHash.includes("figmacapture=")) {
  const params = new URLSearchParams(currentHash.replace(/^#/, ""));
  params.set("endpoint", id);
  history.replaceState(null, "", `#${params.toString()}`);
  return;
}
history.replaceState(null, "", endpointHash(id));
~~~

This preservation is required because the capture client reads its submission
endpoint from the hash. Replacing the hash with only `endpoint` makes an
otherwise healthy Figma capture remain pending, while leaking capture
parameters into ordinary links would make the production URL contract noisy.

### Responsive Request Lab

- Above 1180px, Request Lab is the sticky third workspace column.
- At or below 1180px, Request Lab is an inert off-canvas dialog until the launcher opens it.
- Open sets dialog semantics, backdrop state, body scroll lock, and focus on closeTester.
- Escape, the backdrop, and closeTester close the drawer. Focus returns to the trigger.
- Keep the drawer semantics synchronized from both the `matchMedia` change and
  `resize` events so rapid viewport changes cannot leave stale `aria-hidden` or
  `inert` state behind.
- Response and code tabs expose tablist/tab/tabpanel semantics, selected state, roving tabindex, and arrow-key navigation.

### Deployment

- Docker copies only public/ and deploy/nginx.conf into nginx:1.27-alpine.
- The container serves docs.xi-ai.cn and /healthz; it does not proxy Provider traffic.
- CSP must not block user-selected Base URLs. Provider CORS remains an upstream responsibility.
- DNS, TLS, host Nginx reload, and replacement of api.xi-ai.cn are outside this repository boundary.

## 4. Validation and Error Matrix

| Condition | Required behavior |
|---|---|
| Invalid or absent endpoint hash | Fall back to Chat Completions and replace the hash with that endpoint id. |
| Hash points to a filtered endpoint | Clear filters and reveal the requested endpoint. |
| Operation targets another endpoint | Complete one atomic transition; never leave a mismatched select value and endpoint. |
| documentationOnly endpoint | Disable send and show a visible only-documentation explanation. |
| rememberToken is unchecked | Remove stored Token while retaining the current in-memory input until Clear is used. |
| No active endpoint | Disable send and launcher; do not reuse the previous request. |
| Drawer is closed on a compact viewport | Set aria-hidden=true and inert; backdrop cannot receive pointer input. |
| Viewport becomes desktop | Remove dialog/inert state and restore the sticky tester. |
| Docker unavailable | Run static deployment contract checks and report that image build was not verified. |

## 5. Good / Base / Bad Cases

- Good: From Speech, selecting OpenAI Chat Completions immediately navigates to createchatcompletion and updates the request target and hash.
- Base: A user browses an unimplemented file endpoint, edits example fields, and copies cURL without being able to send it.
- Bad: The operation select changes while the page and request state remain on the old endpoint.
- Good: At 390px the launcher opens a full-width tester, Escape closes it, and focus returns to the launcher.
- Bad: A static production script always loads the remote Figma capture client.
- Bad: A copied endpoint URL contains Token, Base URL, or payload state.

## 6. Tests Required

Run:

~~~powershell
node tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-deployment-files.js
node tools\test-request-lab.js
~~~

Assertion points:

- Coverage remains 43/43 with no missing or extra source slugs.
- Exactly 10 current source endpoints are documentation-only.
- Variant lists are symmetric and include the known Chat Completions and Gemini native route groups.
- Browser regression covers atomic operation switching, Token opt-in/remove/clear, deep-link restoration, copy actions, tab semantics, and zero console errors.
- Responsive checks cover 1180, 1024, 768, and 390px with no document-level horizontal overflow.
- Docker build and /healthz are checked when Docker is available; otherwise the limitation is recorded.

## 7. Wrong vs Correct

### Wrong

~~~js
localStorage.setItem("newapi-docs-token", token);
state.operationSelection = operationId;
return; // The selected operation and visible endpoint now disagree.
~~~

### Correct

~~~js
if (rememberToken.checked) {
  localStorage.setItem("newapi-docs-token", token);
} else {
  localStorage.removeItem("newapi-docs-token");
}

if (!operation.endpointIds.includes(endpoint.id)) {
  loadOperation(operation);
  return;
}
~~~

The correct path makes credential persistence explicit and gives one function ownership of the complete cross-endpoint transition.
