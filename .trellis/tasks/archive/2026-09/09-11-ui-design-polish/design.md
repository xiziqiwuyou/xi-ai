# UI/UX Design and Technical Boundary

## Design Objective

Turn the current static API page into a focused developer workbench with a
clear visual grammar:

```text
catalog and context -> endpoint identity -> request setup -> execute -> inspect
```

The design is a refinement of the existing warm-neutral and dark-code language.
It is not a new brand, a marketing page, or a provider implementation.

## Page Architecture

### Desktop shell

Keep the semantic landmarks in `public/index.html`:

- **Sidebar:** brand/status, search, method/provider filters, grouped endpoint
  navigation, result count.
- **Main:** compact product/context header, coverage strip, environment
  controls, selected endpoint documentation, and the responsive tester launcher.
- **Request Lab:** sticky third workspace column on wide screens; off-canvas
  dialog at or below the existing 1180px threshold.

The target layout should make the selected endpoint header the visual anchor.
Stats and environment controls should read as operational context. The Request
Lab should feel like a connected work surface rather than an unrelated dark
sidebar.

### Endpoint detail sequence

Retain the generated endpoint content and reorder or group only its presentation:

1. method, category/provider, title, path, availability/source context;
2. concise provider/protocol/auth summary;
3. request parameters and body/schema documentation;
4. response status definitions and examples;
5. route variants and source links where present.

Any collapsible treatment must use native accessible semantics or equivalent
`aria-expanded`/`aria-controls` behavior. It must not remove data from the
generated catalog or make a required field visible only after a pointer hover.

### Request Lab sequence

The existing DOM regions remain the ownership boundary. The visual grouping is:

1. **Target bar:** method, resolved display URL, request mode, and
   documentation-only notice.
2. **Setup:** Provider, auth profile, model, protocol template, stream toggle,
   and model-sync preview.
3. **Examples:** cURL mode/copy and Node.js/Python tabs/copy.
4. **Request:** path/query/header fields, JSON editor or multipart fields,
   validation, and reset/format actions.
5. **Action bar:** send as the dominant action and cancel as the explicit
   in-flight alternative.
6. **Response:** status/elapsed/content type, headers/media, raw output, and
   unified debug tabs.

On compact screens, the drawer header and target bar stay visible while the
internal content scrolls. The launcher should include the current method and a
short endpoint context, without exposing a token or full unredacted URL.

## Visual System

### Tokens

Use CSS custom properties in `public/assets/styles.css` as the only source for
colors, spacing, borders, radii, focus rings, and shadows. Consolidate duplicate
late overrides into named sections with one responsive rule per breakpoint where
practical.

Recommended token families:

- canvas: warm neutral background and elevated white surface;
- ink: primary text, muted text, subtle text, line, and strong line;
- action: teal primary, blue protocol/link, green success, amber attention, red
  error/destructive;
- code: code background, code panel, code text, code muted text;
- geometry: 4/8/12/16/20/24 spacing rhythm and compact versus major radii;
- focus: one high-contrast keyboard ring usable on light and dark surfaces.

Do not introduce a second competing palette or a large decorative gradient.
Contrast must be checked against real rendered text, especially in the tester.

### Typography and density

- Keep system sans for UI and the existing mono stack for paths/code.
- Use fixed responsive steps, not viewport-scaled type.
- Reserve the strongest type weight for endpoint identity, primary action, and
  status; use small uppercase labels only for secondary metadata.
- Let long paths, schema values, and provider labels wrap or scroll within
  stable containers instead of shrinking the whole layout.

### Surfaces and controls

- Use unframed page bands for context and documentation sections.
- Use framed surfaces for the endpoint detail, Request Lab, response output, and
  repeated variants only where a frame improves orientation.
- Keep control radii compact and major work surfaces consistent with the
  approved existing direction.
- Maintain visible focus, stable control heights, and touch targets of at least
  approximately 38px where practical.
- Keep copy/save/close controls explicit and accessible; do not replace a clear
  command with an unfamiliar icon-only control.

## Responsive Contract

The implementation must preserve the current behavioral contract:

| Width | Composition | Required behavior |
|---|---|---|
| Above 1180px | Three-column workbench | Request Lab is sticky and visible. |
| 861-1180px | Two-column page plus drawer | Request Lab is closed/inert until launched. |
| 561-860px | Stacked reference with compact navigation | The launcher remains reachable and the drawer is full-width or near full-width. |
| 390px target | Mobile reference plus full-width drawer | No horizontal overflow; fields, tabs, code, and action controls remain usable. |

The exact grid widths may be tuned from screenshots, but the breakpoint and
behavioral semantics are not to be changed casually.

## Data and Interaction Boundaries

### Allowed presentation changes

- Add or adjust semantic wrappers, headings, status labels, class names, and
  `data-*` hooks needed for layout and test selectors.
- Add presentation-only state such as an expanded section or a visible copy
  confirmation, provided it does not alter request state.
- Move existing controls within their owning semantic region while preserving
  IDs and event ownership, or update event selectors deliberately and test them.

### Protected contracts

- `tools/generate-site.js` and `public/data/api-data.json` remain the source
  mapping boundary; `source-new-api-docs` remains read-only.
- `public/assets/request-utils.js` remains the sole owner of provider URL,
  headers, body, cURL, code examples, and canonical debug derivation.
- `public/assets/app.js` retains endpoint selection, hash state, request-run
  identity, abort/cancel behavior, sync preview behavior, response redaction,
  drawer focus, and tab semantics.
- Tokens never enter hashes, screenshots, generated artifacts, or logs.

## Figma Plan

Use the existing Figma file:

`https://www.figma.com/design/wO6N7uZoLiej61w8zzh8oD`

After implementation approval:

1. Verify that the file is accessible and inspect its current pages/frames.
2. Load the required Figma skills before any plugin/MCP write.
3. Add a clearly named design section for this task rather than creating a new
   file by default.
4. Create high-fidelity frames at approximately 1440x900, 1024x800, and
   390x844, plus a focused Request Lab drawer frame.
5. Add state variants for empty navigation, documentation-only endpoint,
   loading request, successful JSON response, error/CORS guidance, and binary
   response.
6. Read or screenshot each frame, record node IDs and the file link, then map
   frame sections to implementation checkpoints.

If Figma cannot be accessed, pause the Figma write, record the concrete access
failure, and use repository screenshots plus a local design-spec artifact only
after the user accepts that fallback. Do not silently claim a Figma delivery.

## Compatibility and Rollback

The safest rollout is additive and staged:

1. capture the current baseline and preserve the current commit;
2. update the design contract and token map;
3. implement P0 shell/Request Lab hierarchy;
4. run behavior checks before P1 content refinements;
5. implement P1 reading/state polish;
6. run full regression and compare screenshots;
7. keep each P0/P1 checkpoint revertible.

If a visual change breaks a behavior contract, revert the smallest checkpoint or
disable the new presentation branch. Do not repair a visual regression by
changing provider or endpoint facts.

## Trade-offs

- A fixed high-density layout preserves developer efficiency but requires
  intentional whitespace and grouping to avoid visual fatigue.
- A darker tester improves code contrast but can dominate the page; its surface
  area and accent usage must be restrained.
- Progressive disclosure reduces scroll but risks hiding documentation; native
  accessible disclosure and complete DOM content are required.
- Reusing the current Figma file maintains continuity but may require organizing
  legacy frames before adding new ones.
