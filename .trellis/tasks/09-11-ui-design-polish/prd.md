# UI/UX Design Polish for the Xi AI API Workbench

## Goal and User Value

Make the Xi AI API documentation workbench feel like a deliberate developer
tool: fast to scan, calm under high information density, and clear about the
path from an endpoint reference to a tested request. The work must improve the
visual hierarchy and operation logic without changing the API facts,
provider/request contracts, or credential boundary.

The primary user should be able to answer these questions immediately:

1. Where am I in the 43-endpoint catalog?
2. What protocol, authentication profile, model, and request body will be
   sent?
3. Where do I copy or run the request, and where do I inspect the result?

## Refined Prompt

Use the following as the reusable product/design brief for this task:

> Act as a senior frontend designer, developer-tool UX specialist, and
> product manager. Review the current Xi AI API documentation workbench using
> the repository, existing screenshots, DESIGN.md, browser regression evidence,
> and current interaction contracts. Separate confirmed defects from design
> hypotheses and deferred items.
>
> Redesign the experience as a professional, restrained, high-density API
> workbench. Improve the desktop three-column hierarchy, environment controls,
> endpoint navigation, endpoint metadata, parameter and schema scanning,
> generated cURL/code examples, Request Lab organization, response debugging,
> empty/loading/error/success states, and the 1024px, 768px, and 390px flows.
> Make the next useful action obvious without turning the page into a
> marketing landing page or hiding important documentation behind decoration.
>
> Preserve the static HTML/CSS/vanilla-JavaScript architecture, all 43 source
> endpoints, OpenAI/Gemini/Claude provider behavior, request-utils ownership,
> token safety, ARIA semantics, keyboard navigation, deep links, cancellation,
> streaming/binary/WebSocket messaging, and the direct browser-to-Base-URL
> request boundary. Do not add a backend proxy, authentication system, runtime
> framework, or guessed API metadata.
>
> Use the existing Figma file when accessible. Produce verified desktop,
> tablet, mobile, Request Lab drawer, and key state frames before translating
> the approved direction into code. Return a P0/P1 implementation plan,
> observable acceptance criteria, risks, rollback points, and a clear list of
> items intentionally left out.

## Confirmed Current State

The following are repository-backed facts, not visual assumptions:

| Evidence | Confirmed behavior | Design implication |
|---|---|---|
| `public/index.html:13-48` | The left rail owns search, method/provider filters, result count, and the endpoint catalog. | Navigation is a primary work surface and must remain discoverable. |
| `public/index.html:50-96` | The main column contains the title, coverage stats, Base URL/Token environment, endpoint view, and compact tester launcher. | The page currently exposes several competing entry points before the endpoint content. |
| `public/index.html:98-262` | Request Lab contains target, provider/model controls, cURL, code examples, request editors, send/cancel, and raw/debug response views. | The tester needs explicit grouping and action order, not feature removal. |
| `public/assets/styles.css:80-108` and `1138-1146` | The shell is a sticky three-column layout; later CSS overrides widen the tester and alter the original grid. | The visual contract is currently spread across multiple cascade layers and needs consolidation. |
| `public/assets/styles.css:977-1112` and `2428-2585` | The tester becomes an off-canvas drawer at or below 1180px, with a launcher, backdrop, Escape path, and mobile adjustments. | Responsive changes must preserve dialog behavior and focus restoration. |
| `public/assets/app.js:279-312`, `446-520`, and `1117-1160` | Navigation, endpoint detail, and tester rendering are owned by focused render functions. | Markup changes should keep one owner per semantic region. |
| `public/assets/app.js:1338-1500` and `1558-1620` | Request execution has run identity checks and the compact drawer has explicit open/close state. | UI polish must not reintroduce stale-request or focus bugs. |
| `public/assets/request-utils.js:421-550` and `664-696` | cURL/code generation and canonical response debug are shared pure contracts. | Presentation may change; provider serialization must not be duplicated in views. |
| `tools/test-api-data.js:62-102` and the browser fixture suite | The generated catalog is 43/43 with OpenAI, Gemini, Claude, streaming, binary, multipart, and WebSocket cases. | Coverage and protocol fixtures are hard regression gates. |
| `DESIGN.md:29-79` | The existing direction is a warm-neutral, developer-focused, non-marketing workbench with compact controls and responsive behavior. | The new design should refine the current language instead of replacing it with a new brand system. |

### Design findings

These are the current design problems to address, ordered by confidence:

- **High confidence:** The endpoint content, environment strip, stats, and
  dark Request Lab compete for first attention on desktop. The main task path
  is not visually distinct enough from supporting metadata.
- **High confidence:** Request Lab has the right capabilities but too many
  adjacent control groups. Provider/model selection, generated examples,
  editable request data, and response inspection need a stronger sequence.
- **High confidence:** Long parameter and schema tables create a large
  continuous scroll with limited visual wayfinding.
- **High confidence:** Mobile remains functionally usable but asks users to
  traverse a long page before the request action is obvious; the drawer
  launcher is the right mechanism but needs stronger context and hierarchy.
- **Medium confidence:** The CSS contains successive refinement blocks and
  repeated breakpoint rules. This increases the chance that future visual
  changes have surprising cascade effects.
- **Deferred product question:** Whether browser requests should be proxied is
  outside this UI task. The current direct-request boundary remains the
  decision for this plan.

## Personas and Jobs

- **API integrator:** Find a provider-compatible endpoint, inspect required
  fields, copy a safe cURL command, and adapt it in an application.
- **Platform operator:** Set a Base URL and authentication profile, compare
  provider/model options, run a controlled request, and diagnose status,
  headers, content type, and canonical fields.
- **Mobile reference user:** Look up a path or parameter quickly and open the
  tester only when a request needs to be configured.

## Requirements

### R1. Establish a single visual hierarchy

The first viewport must clearly prioritize endpoint identity and the next
useful operation. Coverage metrics and environment configuration remain
visible, but become supporting context rather than competing hero content.

### R2. Make endpoint navigation scannable

Keep search, method filters, Provider filters, category grouping, active state,
documentation-only state, route variants, deep links, and result counts. Improve
their grouping, density, and active indication without changing endpoint
selection semantics.

### R3. Give Request Lab an explicit task order

The tester must read as:

1. target and availability;
2. provider, authentication, model, protocol, and stream settings;
3. generated cURL/code;
4. editable parameters and body;
5. send/cancel;
6. response status, media/raw output, and unified debug.

The order may be expressed through layout and headings, but no existing
capability may be silently removed.

### R4. Improve dense documentation reading

Parameter tables, schema rows, response definitions, examples, path blocks,
and source links must support fast scanning, long values, copy/read actions,
and clear required/optional/type distinctions. Any progressive disclosure must
remain keyboard accessible and must not make required facts unreachable.

### R5. Make states observable and coherent

Use a consistent visual language for empty, documentation-only, invalid input,
loading, cancelled, successful, non-2xx, streaming, binary, WebSocket, copied,
and saved states. Error copy must remain actionable and must never reveal a
Token.

### R6. Preserve responsive operation logic

Support the current desktop, 1180px, 1024px, 768px, and 390px behavior. The
compact tester remains an inert off-canvas dialog until opened; backdrop, Escape,
focus restoration, body scroll lock, `aria-hidden`, and `inert` behavior remain
intact.

### R7. Use a restrained, maintainable visual system

Refine the existing warm-neutral canvas, ink text, teal/blue actions, amber
attention states, and dark code surface. Consolidate tokens and cascade rules
where needed. Avoid a marketing hero, decorative gradients/orbs, nested
decorative cards, viewport-scaled typography, and unnecessary runtime assets.

### R8. Validate the direction in Figma before code translation

Use the existing Figma file when accessible and add verified frames for the
desktop workbench, tablet transition, mobile reference, Request Lab drawer,
and key request states. A Figma frame is evidence only after it can be read or
screen-captured and its link/node identity is recorded.

## Priority Scope

### P0: Core operation path and hierarchy

- Endpoint identity, active selection, and primary test action.
- Desktop three-column proportions and visual weight.
- Environment controls and coverage/status grouping.
- Request Lab target/setup/editor/action/response sequence.
- Search/filter/active navigation clarity.
- Responsive drawer entry, context, and action visibility.
- Foundational tokens and focus/disabled/loading/error treatment needed by the
  above flows.

### P1: Reading efficiency and finish quality

- Parameter/schema/response table density, grouping, and long-value handling.
- cURL/code block toolbar hierarchy and copy feedback.
- Response metadata, headers, media, raw output, and unified debug layout.
- Empty and documentation-only presentation.
- Tablet/mobile spacing, touch targets, scroll containment, and safe-area
  details.
- CSS cascade cleanup and update of the root design contract.
- Verified Figma state variants and a small visual regression baseline.

## In Scope

- UI/UX review, information architecture refinement, and visual design.
- `public/index.html`, `public/assets/styles.css`, and only the minimal
  `public/assets/app.js` changes needed for presentation state or stable
  semantics.
- Root `DESIGN.md` contract updates after the direction is approved.
- Existing Figma file frames and design-token documentation.
- Desktop/tablet/mobile screenshots and browser regression updates required to
  prove the visual changes.

## Out of Scope

- Changing `source-new-api-docs` or generated endpoint facts.
- Adding or changing provider serialization, model discovery, auth profiles,
  request proxying, credential storage, or server-side behavior.
- Migrating to React, a CSS framework, a build pipeline, or a required remote
  runtime dependency.
- Redesigning the product as a marketing landing page.
- Creating a new Figma file unless the existing file is genuinely inaccessible
  and the user separately approves that change.
- DNS, Docker, Nginx, GitHub, real-provider, or production validation work.

## Observable Acceptance Criteria

- **AC-01:** At 1440px desktop, a first-time user can identify the selected
  endpoint, its method/path, and the Request Lab entry/action without visually
  competing surfaces obscuring one another.
- **AC-02:** Search, method/provider filters, category navigation, active state,
  route variants, and a valid deep link still select the same endpoint and keep
  the result count truthful.
- **AC-03:** The Request Lab presents the target, setup, generated command,
  editable request, send/cancel, and response/debug areas in the planned order;
  all existing controls remain operable by keyboard.
- **AC-04:** At 1180px, 1024px, 768px, and 390px, the tester drawer opens and
  closes through the launcher, close button, backdrop, and Escape; focus returns
  to the launcher; closed content is `aria-hidden` and inert; no document-level
  horizontal overflow exists.
- **AC-05:** Parameter/schema/response content remains complete, readable for
  long names and values, and usable without relying on hover-only behavior.
- **AC-06:** Copy/save/loading/invalid/cancelled/error/success/stream/binary/
  WebSocket/documentation-only states remain distinguishable and contain no
  rendered Token or credential-bearing URL.
- **AC-07:** `node tools\generate-site.js` and the data contract still report
  43/43 endpoints with no missing or extra source entries; source snapshots are
  unchanged.
- **AC-08:** Serialization, browser fixture, and request-lab regression checks
  pass with zero unexpected console errors after implementation.
- **AC-09:** Figma desktop, tablet, mobile, drawer, and state frames are
  readable or captured, linked to the existing file, and traceable to the
  implemented direction.
- **AC-10:** The final diff is limited to the approved UI/design surface, has a
  documented rollback point, and introduces no framework or remote runtime
  dependency.

## Risks and Deferred Items

- A polished dark Request Lab can still dominate the page if contrast and
  surface area are not tested at real viewport sizes; visual QA must compare
  hierarchy, not just isolated components.
- Progressive disclosure can hide useful schema facts; the implementation must
  keep content in the DOM and expose accessible names/states.
- Figma and the static HTML may drift. Each major frame must have a matching
  implementation checkpoint and screenshot.
- The existing CSS has layered overrides. Cleanup must be behavior-neutral and
  verified with the full browser suite.
- Direct browser requests may still fail because of upstream CORS or provider
  authorization. This task will improve the explanation and presentation only;
  it will not claim or create a proxy solution.

There are no blocking product questions for the proposed P0/P1 scope. Figma
accessibility and the exact final color values are implementation-time checks,
not reasons to alter the behavior boundary; the recommendation is to refine
the current DESIGN.md direction and use the existing Figma file.

## Approval Gate

This PRD is a planning artifact. Do not run `task.py start`, edit product code,
or claim implementation complete until the user explicitly approves the latest
P0/P1 plan and its Figma scope.
