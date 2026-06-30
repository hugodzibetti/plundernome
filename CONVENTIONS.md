# Plundernome — Conventions

## File limits

- Max 150 lines/file. Split if exceeded.
- Interface/type files: max 50 lines. Exception: `gjs.d.ts` (ambient decls).

## Naming

- Interfaces: `I` prefix — `ICatalogSource`, `IDownloadBackend`
- Pure fns: camelCase, verb-first — `parseGame()`, `detectCompat()`
- Types: PascalCase — `Game`, `PipelineState`, `CompatProfile`
- Files: kebab-case — `pipeline-state.ts`, `compat-detector.ts`
- Tests: `*.test.ts` next to impl or `__tests__/`

## Style

- No comments unless type assertion or non-obvious constraint
- Self-documenting names over comments
- Type inference over explicit annotations — use `satisfies` for const
- No classes unless GObject-required. Prefer fns + interfaces.
- Every export typed. No `any`. Use `unknown` + narrowing.
- Barrel files (`index.ts`) re-export layer.
- Error handling via `Result<T, E>`, not exceptions.
- Early returns over nested `if`. `??`/`?.` over ternary chains.
- `import type` for type-only imports. Arrow fns over `function`.
- Max line length 100 for AI-written code. Prettier config sets 120.

## GJS runtime traps

- **No `undefined` in constructor props objects**: GTK4/GJS throws on undefined. Build `Record<string, unknown>` dynamically. Applies all GObject constructors.
- **No `undefined` for `label` on `Gtk.Button`**: Omit `label` entirely if only `icon_name`.

## UI conventions — MUST follow

- **No `undefined` in GObject props**: dynamic `Record<string, unknown>`. Never pass undefined.
- **Button creation**: ALWAYS `createButton()` from `factory.ts`. NEVER `new Gtk.Button()`. Gets `action-button` CSS class.
- **Layout**: Views extend `Adw.Bin`. Use `templates/` layouts:
  - `createScrollContent()` / `createGridContent()` / `createListContent()`
  - `createSettingsPage()` / `showDetailDialog()` / `createActionBar()`
- **Switches**: `new Gtk.Switch()` inside `Adw.ActionRow` + `add_suffix()` + `set_activatable_widget()`. Never `extends Adw.SwitchRow` (segfault in GJS).
- **CSS classes**: Every widget ≥1 CSS class. Kebab-case, component-prefixed.
- **Adw over Gtk**: Prefer `Adw.ActionRow` > `Gtk.Box`, `Adw.PreferencesGroup` > manual sections.
- **Spacing**: `Gtk.Box` spacing property. Default=6. Section gaps=12. No hardcoded margins.
- **Sizing**: Follow `src/ui/LAYOUT.md`. Explicit `halign`/`valign`. Both dims in `set_size_request()`.
- **Dialogs**: `createAlertDialog()` / `showDetailDialog()`. Use `.present()`, NEVER `.show()`.
- **Forbidden**: `new Gtk.ScrolledWindow` / `new Gtk.Button()` / `extends Gtk.Window` / `extends Adw.SwitchRow` / `set_size_request(-1, ...)` / `.show()` / `as any`.

## Types (used everywhere)

- `GameID = string` — MD5(sourceId + sourceGameId)
- `SourceID = string` — short slug: "fitgirl", "dodi"
- `Result<T, E = string>` — `{ ok: true, value: T } | { ok: false, error: E }`
- `PipelineStep` — union of valid step names

## AST-grep structural lint

Rules in `rules/*.yml` enforce UI patterns:

- `no-bare-button` — use `createButton()` factory
- `no-scrolled-window` — use `Adw.ClampScrollable`
- `no-as-any` — use `unknown`
- `no-neg-one-size` — both dims in `set_size_request()`
- `no-dot-show` — use `.present()`
- `domain-no-gi` — no GI imports in domain

Run via `scripts/check-conventions.sh` (invokes `./node_modules/.bin/sg`).
