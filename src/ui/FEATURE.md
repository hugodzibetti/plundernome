# Phase 3 — UI Layer (GTK4 + Libadwaita)

## Architecture
```
Adw.ApplicationWindow → Adw.NavigationSplitView
                         ├── Sidebar (Gtk.ListBox.navigation-sidebar)
                         │   └── Icon + Label rows
                         └── Content (Gtk.Stack — swaps views)
                               ├── CatalogView (Adw.Bin)
                               ├── DownloadsView (Adw.Bin)
                               ├── LibraryView (Adw.Bin)
                               └── SettingsView (Adw.Bin)
```

## Page definition pattern
Window configures pages via `PAGE_DEFS` array:
```typescript
type PageDef = {
  label: string
  id: string
  iconName: string
  factory: () => any
  headerSuffix?: (win: PlundernomeWindow) => any
}
```
Each page has symbolic icon in sidebar. Optional `headerSuffix` adds page-specific widgets (grid/list toggle, import button) to headerbar.

## Navigation structure
| Sidebar Item | Icon | View | Header suffix |
|---|---|---|---|
| Catalog | `package-x-generic-symbolic` | catalog-view.ts | Grid/list toggle |
| Downloads | `folder-download-symbolic` | downloads-view.ts | — |
| Library | `emblem-library-symbolic` | library-view.ts | Import button |
| Settings | `preferences-system-symbolic` | settings-view.ts | — |

## Files
```
src/ui/
├── index.ts           ← Barrel
├── ../main.ts         ← Adw.Application bootstrap (entry point)
├── window.ts          ← Adw.ApplicationWindow (sidebar + stack + header suffix)
├── FEATURE.md         ← This file
├── views/
│   ├── catalog-view.ts
│   ├── downloads-view.ts
│   ├── library-view.ts
│   └── settings-view.ts
├── widgets/
│   ├── game-card.ts
│   ├── progress-bar.ts
│   ├── compat-badge.ts
│   ├── download-row.ts
│   └── source-config.ts
└── style.css
```

## View contract
Every view extends `Adw.Bin`. Window swaps views in `Gtk.Stack`.

## GJS specifics
- Widgets extend `Adw.Bin`, `Gtk.Label`, or `Adw.ActionRow`
- Parent communication: callback setters + public methods
- Header suffix built by window.ts, swapped on page change

## Widget factory
Use `src/ui/factory.ts` (`createButton`, `createSwitchRow`, `createActionRow`, `createAlertDialog`, `createFilePicker`) for consistent widget creation. Reduces `.add_css_class('flat')`/`.connect('clicked', ...)` boilerplate.

## Switch convention
Use `Gtk.Switch` inside `Adw.ActionRow` (`add_suffix` + `set_activatable_widget`). Never extend `Adw.SwitchRow` (crashes GJS — segfault). CSS constrains switch sizing globally in `style.css`.

## Styling
- GTK4 CSS with Adwaita color variables (`@card_bg_color`, `@accent_*`, etc.)
- Game cards: `@card_bg_color` + `box-shadow` + hover lift
- Compat badges: capsule (`border-radius: 999px`)
- Progress bars: thin (`min-height: 6px`) with `@accent_bg_color`
- Switches: constrained by `switch { min-width: 44px; min-height: 22px }` in style.css
- Every custom widget needs ≥1 CSS class (kebab-case, component-prefixed)
- No manual status bars — use Adw.StatusPage for empty states
