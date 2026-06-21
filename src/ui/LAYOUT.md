# Plundernome UI — Sizing Charter

MUST follow. No exceptions.

## Fixed sizes

| Element       | Size                            | How                          |
| ------------- | ------------------------------- | ---------------------------- |
| Action button | 36×36 + 4px padding             | CSS `.action-button`         |
| Game cover    | 200×128                         | CSS `.sizing-cover` / `.sizing-cover-pic` |
| Row cover     | 48×48                           | CSS `.sizing-row-cover`      |
| Game card     | min-width 200px, natural height | CSS `.game-card`             |
| Editor        | 500×150                         | CSS `.sizing-editor`         |
| Switch        | 44×22 (global CSS, no override) | CSS `switch`                 |
| Dim label     | min-width 80px                  | CSS `.dim-label`             |

## Spacing defaults

| Context                 | Value                           |
| ----------------------- | ------------------------------- |
| Box default             | 6px                             |
| Siblings same container | 6px                             |
| Section gaps            | 12px                            |
| View pad                | 16px start/end, 12px top/bottom |

## Halign/Valign rules

| Widget type     | halign | valign |
| --------------- | ------ | ------ |
| Label           | START  | CENTER |
| Button          | CENTER | CENTER |
| Box (container) | FILL   | FILL   |
| Action bar      | START  | CENTER |
| FlowBox child   | START  | START  |
| ListBox child   | FILL   | CENTER |

## Forbidden patterns

| Pattern                                              | Replace with                  |
| ---------------------------------------------------- | ----------------------------- |
| `new Gtk.ScrolledWindow()` in ui/                    | `createScrollContent()`       |
| `new Gtk.Window()` / `extends Adw.Window` for detail | `showDetailDialog()`          |
| `set_size_request(...)` in views/widgets             | CSS sizing class              |
| bare `new Gtk.Button()`                              | `createButton()` from factory |
| `Gtk.FlowBox` `set_homogeneous(true)`                | `createGridContent()`         |
| `as any` in UI                                       | Proper narrowing              |
| `.show()` on dialogs/pickers                         | `.present()`                  |

## Height constraint rule

Every `createScrollContent()` call MUST specify one of:

- `{ expand: true }` — view should fill window (catalog, library, downloads)
- `{ maxHeight: N }` — view has bounded height (settings, wizard)
- OMIT both only if child content is naturally short (< 400px)

Reason: `Adw.ClampScrollable` has no height ceiling. Omission causes window to auto-grow to fit all content.
