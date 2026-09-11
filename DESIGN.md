# Design Contract

## Source Of Truth

- Status: Active
- Last refreshed: 2026-09-11
- Product: Xi AI API documentation and request workbench
- Runtime: static HTML, CSS, and vanilla JavaScript; no build step or remote
  runtime dependency is required
- Data authority: `public/data/api-data.json`, generated from the read-only
  source corpus by `tools/generate-site.js`
- Protected behavior: provider serialization, request planning, credential
  handling, endpoint coverage, drawer state, and response normalization

## Product Intent

Xi AI API docs are a developer workbench rather than a marketing page. The
primary job is to find a compatible endpoint, understand its contract, copy a
safe request example, run a controlled browser request, and inspect the result.

Primary users are API integrators, AI application developers, and platform
operators working with OpenAI, Gemini, and Claude-compatible protocols.

Success means that a user can scan the catalog, identify the selected method
and path, configure `Base URL` and `Token`, generate cURL or language code, and
reach response/debug information without losing context.

## Information Architecture

The page follows this operational sequence:

```text
catalog and filters -> request environment -> endpoint identity ->
request setup -> generated examples -> editable request -> execute -> inspect
```

### Desktop shell

- **Sidebar:** brand/status, search, method and Provider filters, grouped
  endpoint catalog, active state, route-variant counts, and result count.
- **Main:** API context, coverage statistics, request environment, selected
  endpoint documentation, and the compact tester launcher when the tester is a
  drawer.
- **Request Lab:** a sticky third workspace column on wide screens, and an
  off-canvas dialog at compact widths.

The selected endpoint is the visual anchor. Coverage and environment controls
are supporting operational context, while the Request Lab is visually
connected to the endpoint rather than competing with it.

### Endpoint reading order

1. Method, category/Provider, title, path, and runnable/documentation-only
   status.
2. Short description, source links, and route variants.
3. Request parameters, payload/schema, and required/optional cues.
4. Response status definitions, examples, and media type information.

Generated facts remain complete and source-derived. Presentation grouping does
not merge, delete, or renumber endpoint documents.

### Request Lab sequence

1. **Target:** method, resolved display URL, request mode, and availability.
2. **Setup:** Provider, authentication profile, model, protocol template, and
   stream toggle.
3. **Examples:** Bash/PowerShell cURL and Node.js/Python code tabs.
4. **Request:** path/query/header editors, JSON or multipart payload, and
   validation/reset actions.
5. **Action:** send as the dominant command and cancel while a request is in
   flight.
6. **Inspect:** status, elapsed time, content type, headers, media/raw output,
   stream output, and unified debug.

Documentation-only endpoints keep their examples and editable fixtures, but
the send action is disabled with an explicit explanation.

## Visual System

- **Canvas:** warm neutral background with white documentation surfaces.
- **Ink:** dark green-black primary text, readable muted text, and restrained
  borders for dense content.
- **Actions:** teal primary actions, blue protocol/link cues, green success,
  amber attention, and red error/destructive states.
- **Code:** a dark, high-contrast surface shared by cURL, code examples, JSON,
  stream, binary, and debug output.
- **Geometry:** 4/8/12/16/20/24 spacing rhythm; compact control radii and
  consistent work-surface radii.
- **Typography:** system sans for UI and a system mono stack for paths and
  code. Typography uses fixed steps and never scales with viewport width.
- **Motion:** short focus/hover transitions only; `prefers-reduced-motion`
  removes meaningful transition duration and smooth scrolling.

CSS custom properties in `public/assets/styles.css` own colors, geometry,
focus rings, and shadows. Text-heavy sections remain unframed page bands where
that improves reading; cards frame only repeated items or genuinely bounded
tools. Decorative gradients, orbs, and marketing hero treatments are outside
the product language.

## Responsive Contract

| Width | Composition | Required behavior |
|---|---|---|
| Above 1180px | Three-column workbench | Sidebar, docs, and sticky Request Lab are visible together. |
| 861-1180px | Two-column docs plus drawer | Request Lab is closed and inert until launched; the launcher carries endpoint context. |
| 561-860px | Stacked reference plus compact navigation | Catalog/search remains first for endpoint discovery; the drawer remains reachable. |
| 320-560px | Mobile reference plus full-width drawer | Navigation has an internal scroll region; fields, tabs, code, and actions fit without document-level horizontal overflow. |

At compact widths, opening the tester sets dialog semantics, backdrop state,
body scroll lock, and focus on the close control. Escape, backdrop, and close
all restore focus to the launcher. Closing sets both `aria-hidden` and `inert`.

## State Language

State labels are direct and operational Chinese UI copy:

- **Empty:** no matching endpoint or no response yet.
- **Documentation-only:** examples remain available; sending is unavailable.
- **Loading:** request in progress with an explicit cancel command.
- **Success:** status, elapsed time, content type, and normalized output are
  visible.
- **Error:** status and actionable CORS/upstream guidance remain visible.
- **Streaming:** partial output and completion state are distinguishable.
- **Binary:** media preview and download action are available when supported.
- **WebSocket:** connection intent and endpoint form are presented without
  pretending that a normal fetch response exists.
- **Copied/saved:** controls provide short-lived confirmation while the
  underlying value remains unchanged.

Tokens stay in page memory unless the user explicitly opts into local storage.
They never enter hashes, generated links, screenshots, debug output, or Figma
captures.

## Accessibility Contract

- Use native landmarks, labels, buttons, selects, forms, tabs, and code blocks.
- Keep visible keyboard focus on light and dark surfaces.
- Use `aria-live` status regions for configuration, validation, and response
  state.
- Preserve tablist/tab/tabpanel semantics and arrow-key navigation.
- Keep long paths, schema values, and response text wrapped or scrollable in
  stable containers.
- Do not make required documentation visible only through hover.

## Figma Evidence

Existing file: [Xi AI Figma](https://www.figma.com/design/wO6N7uZoLiej61w8zzh8oD)

Verified nodes from the 2026-09-11 UI polish pass:

- `36:2` — `UI Polish · Desktop reference · 1440px`; captured from the local
  implementation with the desktop three-column composition.
- `35:2` — `UI Polish · Compact reference · 750px`; captured from the local
  implementation with the stacked compact composition.
- `40:2` — fresh `1024px` compact capture with the Request Lab dialog open;
  Target, Setup, Examples, Request, Inspect, and the send action were verified
  in its metadata.
- `39:2` — fresh `390px` mobile capture with the full-width Request Lab dialog
  open; the same flow groups and close control were verified in its metadata.
- `9:1315` — existing Request Lab reference retained for historical comparison;
  it is not the source of the current implementation.

The capture frames are raw HTML-to-Figma references. The Figma library search
found no reusable Button or Input component and no project color/spacing
variables, so the implementation remains owned by local CSS tokens. Figma
captures are visual evidence only; they do not replace browser or functional
tests.

## Implementation Ownership

- `public/index.html` owns stable landmarks, labels, and control relationships.
- `public/assets/app.js` owns endpoint selection, presentation state, drawer
  transitions, and focus restoration.
- `public/assets/request-utils.js` owns provider-aware request plans, URLs,
  headers, bodies, cURL, code examples, and canonical debug derivation.
- `public/assets/styles.css` owns the visual token map, layout, responsive
  behavior, focus, and state treatment.

The Figma capture hook is opt-in through `figmaCapture=1`. When capture hash
parameters are present, endpoint hash updates preserve them so the capture
script can complete; ordinary links still contain only `endpoint=<id>`.

## Verification Boundary

The local fixture suite proves endpoint coverage, serialization, drawer and
tab behavior, cancellation, streaming, binary/multipart handling, responsive
overflow, and zero unexpected browser console errors. It does not prove real
provider authorization/quota, upstream CORS, Docker image execution, DNS/TLS,
host Nginx state, or production deployment.

## Deferred Product Question

- Whether production browser requests should be proxied to avoid upstream CORS
  restrictions remains outside this UI polish task.
