# Task 10 — Adaptive Layout (AdwBreakpoint + Responsive Navigation)

## Context
GNOME HIG requires apps to adapt to smaller window sizes. Current window has a fixed sidebar
that wastes space at narrow widths. Using `Adw.OverlaySplitView` + `Adw.Breakpoint` makes
the app collapse the sidebar into a hamburger menu at narrow widths — standard GNOME pattern
used by GNOME Music, Files, etc. This is the last step to make the app feel truly native.

## Files to read before starting
- `src/ui/window.ts` — PlundernomeWindow, current sidebar/navigation implementation
- `src/ui/window-css.ts` — CSS for window
- GNOME HIG on `Adw.OverlaySplitView` and `Adw.Breakpoint` (check GJS docs pattern)
- `src/ui/factory.ts` — createButton() for hamburger button

## What to implement

### Step 1 — Replace navigation with AdwNavigationSplitView
File: `src/ui/window.ts`

Current: likely uses `Adw.NavigationView` or `Gtk.Box` with sidebar + content.

Replace with `Adw.OverlaySplitView`:
```ts
const splitView = new Adw.OverlaySplitView({
  sidebar_position: Gtk.PackType.START,
  collapsed: false,
  show_sidebar: true,
})
splitView.set_sidebar(sidebarWidget)
splitView.set_content(contentStack)
```

### Step 2 — Add AdwBreakpoint for narrow widths
```ts
const breakpoint = new Adw.Breakpoint(
  Adw.BreakpointCondition.parse('max-width: 720px')
)
breakpoint.add_setter(splitView, 'collapsed', true)
// When collapsed, show hamburger button in header
breakpoint.add_setter(hamburgerBtn, 'visible', true)
breakpoint.add_setter(hamburgerBtn, 'visible', false)  // false at wide, true at narrow
// Use connect for dynamic:
breakpoint.connect('apply', () => { splitView.set_collapsed(true) })
breakpoint.connect('unapply', () => { splitView.set_collapsed(false) })
this.add_breakpoint(breakpoint)
```

### Step 3 — Hamburger button in header bar
When `splitView.collapsed = true`, show a hamburger button in the `Adw.HeaderBar`:
```ts
const hamburgerBtn = createButton('', { iconName: 'open-menu-symbolic', cssClasses: ['flat'] })
hamburgerBtn.connect('clicked', () => {
  splitView.set_show_sidebar(!splitView.show_sidebar)
})
headerBar.pack_start(hamburgerBtn)
```
At wide width: button hidden (`visible = false`)
At narrow: button visible

### Step 4 — Catalog grid: responsive columns
File: `src/ui/views/catalog-render.ts` (or wherever game card grid is built)

Current grid likely uses fixed column count. Switch to `Gtk.FlowBox`:
```ts
const flow = new Gtk.FlowBox({
  min_children_per_line: 2,
  max_children_per_line: 6,
  homogeneous: true,
  selection_mode: Gtk.SelectionMode.NONE,
  column_spacing: 12,
  row_spacing: 12,
})
```
`Gtk.FlowBox` auto-adjusts columns based on available width. Game cards need a minimum
width set: call `card.set_size_request(180, 260)` on each card (both dims).

### Step 5 — Clamp content width
Wrap main content areas in `Adw.Clamp` to prevent overly wide layouts on ultrawide:
```ts
const clamp = new Adw.Clamp({
  maximum_size: 1200,
  tightening_threshold: 800,
})
clamp.set_child(contentWidget)
```
Apply to: catalog view, library view, home view sections.

### Step 6 — Minimum window size
File: `src/ui/window.ts`

Set minimum: `this.set_default_size(900, 600)` if not already set.
Set minimum size: check if `set_size_request` is called anywhere, ensure `(720, 500)`.

## Acceptance criteria
- Window wider than 720px: sidebar always visible, no hamburger
- Window narrower than 720px: sidebar hidden, hamburger button appears in header
- Clicking hamburger toggles sidebar as overlay
- Game grid reflows: 2 cols at 400px, 4 cols at 800px, 6 cols at 1200px
- Content never wider than 1200px on ultrawide
- No layout breakage at any width between 400-2000px
- `npm run build` passes
- `npm run typecheck` passes

## GJS-specific notes
- `Adw.Breakpoint` requires Libadwaita ≥ 1.4 (GNOME 45). Confirm in gjs.d.ts.
- `Adw.OverlaySplitView` requires Libadwaita ≥ 1.4.
- If target is GNOME 44 (Libadwaita 1.3), use `Adw.Leaflet` instead (deprecated in 1.4 but works).
- Check `imports.gi.versions` in build banner to confirm Adw version target.
