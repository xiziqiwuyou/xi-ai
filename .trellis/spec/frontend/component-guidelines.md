# Component Guidelines

## Overview

Components are semantic HTML regions plus focused render functions. The
application does not use a component framework or a prop system. The stable
landmarks are the sidebar, main documentation view, and Request Lab aside.

## Rendering Pattern

Keep one owner for each DOM region. app.js uses functions such as
renderNav(), renderEndpoint(), renderTester(), renderRequestEditors(), and
renderResponseHeaders() to derive markup from normalized data and state.

~~~js
function renderNav() {
  const groups = groupByCategory(state.filtered);
  els.nav.innerHTML = groups.map((group) => renderGroup(group)).join("");
}
~~~

When markup must be assembled, dynamic values must go through escapeHtml().
Prefer textContent for user-controlled or upstream response text. Never insert
raw response bodies, header values, or request input into innerHTML.

## Data and Control Contracts

- Endpoint facts come from generated api-data.json.
- Provider and operation facts come from the provider registry included in that
  data.
- Request controls identify their location with data-request-location and
  data-param-name. Multipart controls use data-multipart-name.
- The request state is endpoint-scoped. A render function reads it; it must not
  silently mutate another endpoint's state.
- Request URL, headers, body, and curl are derived by request-utils.js rather
  than assembled independently in a view.

## Accessibility

- Use real button, input, select, form, nav, main, aside, section, and code
  elements.
- Every input has a visible label or an explicit accessible name.
- Status and validation regions use role=status or aria-live where appropriate.
- Toggle groups use aria-pressed. Tab groups use tab/tablist/tabpanel and
  roving tabindex.
- The compact Request Lab drawer uses both aria-hidden and inert while closed.
- Preserve visible focus and keyboard Escape behavior.

## Styling

Use CSS custom properties from styles.css. Keep documentation and tool
surfaces compact and readable. Do not add nested decorative cards, viewport-
scaled typography, or decorative radial blobs. Small controls use compact
radii; layout surfaces follow the existing design tokens.

## Common Mistakes

- Repainting a whole form on every keystroke and losing File objects.
- Using response text as HTML.
- Reusing path, header, or body state after endpoint switching.
- Adding a second provider-specific request builder in a component.

