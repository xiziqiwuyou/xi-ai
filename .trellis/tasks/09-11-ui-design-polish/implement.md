# UI/UX Design Polish Implementation Plan

This is the execution plan for the approved UI direction. It is intentionally
ordered so that visual changes are checked against behavior after each risky
boundary.

## Pre-Implementation Gate

- [x] User explicitly approved the latest `prd.md`, `design.md`, and this plan
      on 2026-09-11.
- [x] Active task `09-11-ui-design-polish` is `in_progress`; the approval gate
      was completed before implementation.
- [x] Clean baseline passed: data, serialization, deployment, and browser
      fixture checks; rollback reference is commit `6b56c5a` plus ignored
      `qa-*-current.png` screenshots.
- [x] Existing Figma file is accessible and the target Request Lab node
      `9:1315` was read successfully.
- [x] `figma-use` and `figma-generate-design` guidance is loaded; no new Figma
      file is required.

Rollback point: no product code or Figma nodes are changed before this gate.

## Phase 1: Baseline and Design Contract

- [x] Record current screenshots at 1440px, 1180px/1024px, 768px, and 390px,
      including the compact Request Lab drawer.
- [x] Verify the baseline commands and note fixture versus real-provider scope.
- [x] Update the root `DESIGN.md` only after approval so it describes the new
      hierarchy, Request Lab sequence, state language, Figma frame map, and
      responsive contract.
- [x] Create or refine the CSS token map in `public/assets/styles.css` without
      changing request behavior.

Validation gate: `git diff --check`, source immutability check, 43/43 data
contract, and baseline browser fixture pass.

## Phase 2: Figma P0 Direction

- [x] Inspect the existing Figma file and identify the current relevant frames.
- [x] Add the desktop workbench frame with endpoint identity as the anchor.
- [x] Add the compact/tablet composition showing the tester launcher and drawer
      context.
- [x] Add the 390px mobile reference frame and full-width drawer frame.
- [x] Add target/setup/examples/request/action/response grouping to the tester
      frame.
- [x] Read/screenshot the frames and record file/node links in the task notes
      or design contract.

Review gate: confirm the visual direction does not hide required controls,
introduce a marketing hero, or conflict with the existing behavior contract.

## Phase 3: P0 Product UI Implementation

### P0-A: Shell and hierarchy

- [x] Refine the semantic shell in `public/index.html` only where grouping or
      accessible labels are necessary.
- [x] Implement the approved three-column proportions, page bands, active
      endpoint anchor, coverage/status presentation, and environment hierarchy
      in `public/assets/styles.css`.
- [x] Consolidate duplicate layout and breakpoint rules so each major surface
      has one understandable owner.
- [x] Keep stable IDs and existing event hooks unless a deliberate, tested
      migration is required.

### P0-B: Navigation and endpoint context

- [x] Improve search/filter grouping, category headings, active rail/row state,
      method/provider badges, documentation-only label, and route-variant cue.
- [x] Make the selected endpoint's method/path/title and primary test action
      visually obvious without adding guessed metadata.
- [x] Preserve no-match behavior, hash navigation, keyboard focus, and result
      count semantics.

### P0-C: Request Lab sequence

- [x] Reorganize the tester visual hierarchy into target, setup, examples,
      request, action, and response groups.
- [x] Reduce dark-surface visual pressure through spacing, contrast, and accent
      restraint while keeping code readable.
- [x] Improve send/cancel prominence and documentation-only disabled messaging.
- [x] Strengthen the compact launcher context without including secrets.
- [x] Preserve drawer open/close, backdrop, Escape, focus restoration, body
      scroll lock, `aria-hidden`, and `inert` behavior.

P0 validation gate: run the browser fixture suite at desktop and compact widths;
confirm endpoint selection, deep link, tabs, copy actions, request cancellation,
and zero unexpected console errors.

## Phase 4: P1 Reading and State Polish

### P1-A: Documentation scanning

- [x] Refine parameter and schema tables for column priority, required/optional
      cues, long-value wrapping/scrolling, and section wayfinding.
- [x] If disclosure is used, implement accessible native or ARIA-equivalent
      controls and retain complete content.
- [x] Refine response documentation, examples, source chips, route variants,
      and empty states without changing generated facts.

### P1-B: Examples and response debugging

- [x] Clarify cURL Bash/PowerShell mode controls and copy feedback.
- [x] Clarify Node.js/Python tabs and code-panel boundaries.
- [x] Present status, elapsed time, content type, headers, media, raw output,
      stream output, and unified debug as one understandable inspection flow.
- [x] Ensure errors and CORS guidance remain visible and actionable.

### P1-C: Responsive and accessibility finish

- [x] Tune 1024px, 768px, and 390px spacing, touch targets, safe-area padding,
      scroll containment, line wrapping, and tab behavior.
- [x] Check light/dark surface contrast and visible keyboard focus.
- [x] Check `prefers-reduced-motion` behavior and avoid introducing layout-shift
      animations.

P1 validation gate: compare screenshots against the approved Figma frames and
run the complete functional and visual checks.

## Required Validation Commands

Run from the repository root after each implementation checkpoint as applicable:

```powershell
node tools\generate-site.js
node tools\test-api-data.js
node tools\test-request-serialization.js
node tools\test-deployment-files.js
node tools\test-request-lab.js
node --check public\assets\app.js
node --check public\assets\request-utils.js
git diff --check
```

For browser screenshots, start the local static server if needed:

```powershell
node tools\static-server.js 5173 public
```

Capture and inspect at minimum:

- 1440px desktop full page and viewport;
- 1180px and 1024px compact/drawer states;
- 768px tablet state;
- 390px mobile full page and open drawer.

Record:

- endpoint count and missing/extra source count;
- console error count;
- document `scrollWidth` versus client width;
- drawer `aria-hidden`, `inert`, focus return, and Escape behavior;
- tab semantics and copy/send/cancel outcomes;
- no secret-like values in screenshots, logs, hashes, or generated artifacts.

## Evidence

### Functional and visual checks

- `node tools\\generate-site.js` reported `sitemapCount=43`, `endpointCount=43`,
  `missingFromSource=[]`, and `extraSource=[]`.
- `node tools\\test-api-data.js` passed with 43 endpoints, 28 POST, 14 GET,
  1 DELETE, and the expected JSON/multipart/bodyless distribution.
- `node tools\\test-request-serialization.js`,
  `node tools\\test-deployment-files.js`, both JavaScript syntax checks, and
  `git diff --check` passed.
- The bundled-browser `node tools\\test-request-lab.js` passed at 1180, 1024,
  768, and 390px with `overflow=false` and `consoleErrors=0`; the complete
  suite passed in three consecutive reruns after the responsive assertion was
  made state-based.
- Final review restored the `.sr-only` accessibility utility and made drawer
  semantics synchronize on both viewport resize and media-query changes; the
  final standalone browser run passed after that fix.
- Existing ignored visual captures cover 1440px, 1180px, 1024px, 768px, and
  390px viewport/drawer states, including `visual-final-*.png` and
  `qa-*-current.png`.
- The local fixture proves behavior only. Real Provider authorization/quota,
  upstream CORS, Docker execution, DNS/TLS, host Nginx, and production
  deployment remain outside this task and are not claimed as verified.

### Figma evidence

- File: https://www.figma.com/design/wO6N7uZoLiej61w8zzh8oD
- `36:2` - `UI Polish - Desktop reference - 1440px`; screenshot and metadata
  read successfully.
- `35:2` - `UI Polish - Compact reference - 750px`; screenshot and metadata
  read successfully.
- `40:2` - fresh 1024px capture with an open `Dialog - 调用测试`; metadata
  contains Target, Setup, Examples, Request, Inspect, and `发送请求`.
- `39:2` - fresh 390px capture with a full-width open tester dialog; metadata
  contains the same flow groups and close control.
- The two older pending capture IDs (`9c3b4445-f078-453a-9d6a-b49a8c778a32`
  and `5d05b4af-8dad-4d81-9aba-4a8ae0b8b1ac`) are superseded by the fresh
  verified captures above and are not used as completion evidence.

### Source immutability

- `source-new-api-docs` and `public/data/api-data.json` remain unchanged from
  the rollback baseline. Running the generator refreshed only its timestamp;
  that validation-only change was restored before final review.

## Risky Files and Rollback Points

| File | Risk | Rollback/checkpoint |
|---|---|---|
| `public/assets/styles.css` | Cascade, breakpoint, contrast, and overflow regressions. | Revert the token/layout checkpoint; rerun all viewport screenshots. |
| `public/index.html` | Broken labels, IDs, tab relationships, or drawer semantics. | Keep structural edits isolated; rerun DOM/ARIA browser checks. |
| `public/assets/app.js` | Event ownership, request state, async identity, and focus regressions. | Prefer presentation-only changes; revert each behavior-adjacent commit independently. |
| `DESIGN.md` | Design contract drift. | Restore the previous contract text without touching product behavior. |
| Existing Figma file | Design artifact drift or accidental legacy-frame edits. | Add a dedicated section; do not delete existing frames; record node IDs. |

## Definition of Done

- [x] Approved P0 and P1 scope is implemented and traceable to the Figma/design
      contract.
- [x] All acceptance criteria in `prd.md` are evidenced.
- [x] The source corpus and 43/43 generated coverage are unchanged.
- [x] Provider/request/security behavior remains covered by existing tests.
- [x] Desktop, tablet, and mobile screenshots show no overlap or horizontal
      overflow, and the hierarchy is readable at a glance.
- [x] Figma frames are verified or the approved fallback is documented honestly.
- [x] `trellis-check` passes, the responsive contract update is recorded, and the
      final diff is ready for review before commit/archive.
