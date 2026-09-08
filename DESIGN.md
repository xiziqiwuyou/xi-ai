# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-30
- Primary product surfaces: New API AI model reference, endpoint navigation, request configuration, curl generation, browser request testing.
- Evidence reviewed: `public/index.html`, `public/assets/app.js`, `public/assets/styles.css`, `public/data/api-data.json`, New API docs URL provided by the user, 2026 web design trend research.

## Brand
- Personality: Precise, modern, developer-focused, calm under dense technical content.
- Trust signals: Complete endpoint coverage, visible source links, method badges, stable request tester, explicit coverage metrics.
- Avoid: Marketing hero treatment, oversized decorative cards, single-hue purple/blue gradients, playful illustration, low-density content that slows reference work.

## Product goals
- Goals: Make the API reference feel current and premium while keeping endpoint scanning, parameter reading, and curl testing fast.
- Non-goals: Rewriting API content, replacing the static architecture, or turning the docs into a landing page.
- Success signals: Users can find an endpoint quickly, inspect schemas without visual fatigue, configure Base URL/token, copy curl, and run browser requests.

## Personas and jobs
- Primary personas: Backend engineers, AI application developers, platform operators integrating New API compatible model endpoints.
- User jobs: Find the right endpoint, compare methods and paths, understand request/response schemas, generate a working curl call, run a quick request test.
- Key contexts of use: Desktop development setup first, with usable mobile/tablet reference behavior.

## Information architecture
- Primary navigation: Left endpoint index grouped by category with search and method filters.
- Core routes/screens: Single-page API reference, endpoint detail, right-side call tester.
- Content hierarchy: Coverage/status -> environment config -> selected endpoint -> request parameters/body -> responses/examples -> curl/test result.

## Design principles
- Principle 1: Documentation is an instrument panel, not a brochure.
- Principle 2: Dense information should feel layered and scannable through surfaces, badges, and whitespace.
- Tradeoffs: Visual polish must not reduce table readability or hide curl/testing controls.

## Visual language
- Color: Warm neutral canvas, ink text, white translucent panels, teal/blue primary actions, amber highlights for attention, red only for destructive/error semantics.
- Typography: System sans for UI, system mono for paths/code. Tight hierarchy, no viewport-scaled type.
- Spacing/layout rhythm: Three-column desktop cockpit, 16px radius for major surfaces, compact 8px radius for small controls, consistent 12/16/20/24px rhythm.
- Shape/radius/elevation: Major components use 16px radius; small badges/buttons/inputs may remain 6-8px or pill-shaped for legibility. Use subtle border and shadow layers; no nested decorative cards.
- Blend treatment: Use Figma-style `exclusion` as a controlled ambient layer on page chrome and large surfaces, not directly on text-heavy content, to keep API documentation readable.
- Motion: Short hover/focus transitions only. Respect reduced motion.
- Imagery/iconography: No decorative hero imagery. Use interface-native badges, rails, chips, and status indicators.

## Components
- Existing components to reuse: Sidebar, search input, method filters, nav links, stats, environment toolbar, endpoint card, table, code block, tester panel.
- New/changed components: Coverage strip, refined search command field, active nav rail, endpoint meta cards, dark tester header, source chips.
- Variants and states: Method badges for GET/POST/DELETE, active/hover/focus filters, empty nav state, loading/error request states, saved/copied feedback.
- Token/component ownership: CSS custom properties in `public/assets/styles.css`.

## Accessibility
- Target standard: Practical WCAG AA contrast and keyboard-visible focus.
- Keyboard/focus behavior: Inputs and buttons keep visible focus rings; navigation buttons remain real buttons.
- Contrast/readability: Tables and code blocks use high contrast text; muted text remains readable.
- Screen-reader semantics: Existing landmarks and labels remain in place.
- Reduced motion and sensory considerations: Disable transitions for `prefers-reduced-motion`.

## Responsive behavior
- Supported breakpoints/devices: Desktop three-column, tablet two-column with tester below main, mobile stacked.
- Layout adaptations: Sidebar becomes a full-width top navigation/search area; tester becomes a normal section under endpoint content.
- Touch/hover differences: Tap targets remain at least 38px high where practical.

## Interaction states
- Loading: Initial data load uses browser default until JS renders; request panel shows "请求中..." during fetch.
- Empty: Filter/search empty state explains no matching endpoint.
- Error: Request failures show CORS guidance and error text in the response panel.
- Success: Save/copy buttons temporarily show success text.
- Disabled: No disabled flow currently required.
- Offline/slow network: Static docs continue to render once loaded; request tester surfaces fetch errors.

## Content voice
- Tone: Direct, technical, compact Chinese UI copy.
- Terminology: Use "接口", "分类", "路径", "请求体", "响应", "调用测试", "Base URL", "Token", "curl".
- Microcopy rules: Avoid onboarding prose inside the app; use labels and status text only where they support operation.

## Implementation constraints
- Framework/styling system: Static HTML/CSS/vanilla JS.
- Design-token constraints: Use CSS variables, no build step required.
- Performance constraints: Keep JS small; no external runtime dependencies for the docs UI.
- Compatibility constraints: Modern evergreen browsers; local static serving via Vite/simple HTTP server.
- Test/screenshot expectations: Validate 43 endpoint coverage, successful static data load, and inspect desktop/mobile screenshots after visual changes.

## Open questions
- [ ] Whether the final hosted page should proxy API calls to avoid browser CORS restrictions / owner: user / impact: direct in-browser testing reliability.
