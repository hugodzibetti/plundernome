# Plundernome UI — Sizing Charter

MUST follow. No exceptions.

## Fixed sizes
| Element | Size | How |
|---|---|---|
| Action button | 36×36 + 4px padding | CSS `.action-button` |
| Game cover | 200×128 | `set_size_request(200, 128)` |
| Game card | min-width 200px, natural height | CSS `.game-card` |
| Switch | 44×22 (global CSS, no override) | CSS `switch` |
| Dim label | min-width 80px | CSS `.dim-label` |

## Spacing defaults
| Context | Value |
|---|---|
| Box default | 6px |
| Siblings same container | 6px |
| Section gaps | 12px |
| View pad | 16px start/end, 12px top/bottom |

## Halign/Valign rules
| Widget type | halign | valign |
|---|---|---|
| Label | START | CENTER |
| Button | CENTER | CENTER |
| Box (container) | FILL | FILL |
| Action bar | START | CENTER |
| FlowBox child | START | START |
| ListBox child | FILL | CENTER |

## Forbidden patterns
| Pattern | Replace with |
|---|---|
| `new Gtk.ScrolledWindow()` in ui/ | `createScrollContent()` |
| `new Gtk.Window()` / `extends Adw.Window` for detail | `showDetailDialog()` |
| `set_size_request(-1, ...)` | Both dims |
| bare `new Gtk.Button()` | `createButton()` from factory |
| `Gtk.FlowBox` `set_homogeneous(true)` | `createGridContent()` |
| `as any` in UI | Proper narrowing |
| `.show()` on dialogs/pickers | `.present()` |
