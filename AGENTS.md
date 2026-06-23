# AI-Directed Text: Caveman Ultra — Always Enforced

Any text written for AI consumption (guidance, instructions, docs, comments, AGENTS.md, config descriptions, FEATURE.md, etc.) must use caveman most intense mode: fragments over sentences, single words over phrases, no articles, no prepositions where context suffices, minimal punctuation, maximal token efficiency. Human-read text (user messages, commit messages, error output) → normal. Applies to everything AI writes for itself or other agents.

# Plundernome — AI Coding Guide

## IDE: GNOME Builder

Flatpak manifest `flatpak/io.github.plundernome.json`. Build + run via Builder. Terminal dev for quick iteration: `npm run build && gjs dist/main.js`.

## Stack

- Runtime: GJS (GNOME JS, `gi://` bindings)
- Language: TS → GJS-compat JS via esbuild (IIFE, `format: 'iife'`, `platform: 'neutral'`)
- UI: GTK4 + Libadwaita
- HTTP: libsoup 3
- DB: SQLite via Gda
- Test: vitest (pure domain), vitest (service/ui tests), gjs -m (manual service tests)
- Build: esbuild + `node --check` syntax validation

## Architecture layers

```
domain/   → pure TS, 0 GI imports. Node-testable.
services/ → thin GJS wrappers. Implements interfaces from services/types.ts.
ui/       → GTK4 widgets. Views extend Adw.Bin.
sources/  → JSON source defs + TypeScript type modules.
controller/ → wires domain logic to services and UI views.
```

## Commands

### Completion gate (always do before done)

Build must pass: `npm run build`. No exception. Run before declaring finished.

### Pre-commit hook (must pass)

```
npx tsc --noEmit && npx vitest run && npm run build && bash scripts/check-conventions.sh
```

### CI workflow order (`.github/workflows/ci.yml`)

```
typecheck → test (vitest) → build (esbuild) → smoke test
```

### Verification commands

| Command                        | What                                                                    |
| ------------------------------ | ----------------------------------------------------------------------- | ------ | -------- | --- | ----------- | ----- | ---------- |
| `npm run typecheck`            | `tsc --noEmit`                                                          |
| `npm test`                     | `vitest run` (domain + service + ui + integration + smoke)              |
| `npm run test:domain`          | `vitest run src/domain/`                                                |
| `npm run test:smoke`           | `vitest run tests/smoke.test.ts`                                        |
| `npm run test:quick`           | `bash scripts/check-quick.sh` (typecheck + domain + conventions)        |
| `npm run lint`                 | `eslint . && tsc --noEmit`                                              |
| `npm run build`                | `node scripts/build.mjs` (produces dist/main.js + dist/launch-entry.js) |
| `scripts/check-conventions.sh` | line limits, domain purity, no GI in domain, UI patterns                |
| `scripts/run-tests.sh`         | wrapper: `all                                                           | domain | services | ui  | integration | smoke | typecheck` |

### Dev workflow

```bash
npm install
npm run build
gjs dist/main.js
```

### Smoke test prerequisites

- `xvfb-run` (or DISPLAY set) — test spawns GJS under fake display
- GSettings schema compiled — test compiles `io.github.plundernome.gschema.xml` to tmpdir automatically
- Schema install: `glib-compile-schemas .` + `GSETTINGS_SCHEMA_DIR=<dir> gjs dist/main.js`

### Domain tests

Pure vitest. No GJS needed. Run via `npm run test:domain`.
Fixtures in `tests/fixtures/`. Test contract pattern — no mocks.

### Service tests

Most run under vitest (`src/services/__tests__/`). Some need GJS env.
For manual GJS service testing: `gjs -m path/to/test.js`.

## Conventions

### File limits

- Max 150 lines/file. Split if exceeded.
- Interface/type files: max 50 lines. Exception: `gjs.d.ts` (ambient decls).

### Naming

- Interfaces: `I` prefix — `ICatalogSource`, `IDownloadBackend`
- Pure fns: camelCase, verb-first — `parseGame()`, `detectCompat()`
- Types: PascalCase — `Game`, `PipelineState`, `CompatProfile`
- Files: kebab-case — `pipeline-state.ts`, `compat-detector.ts`
- Tests: `*.test.ts` next to impl or `__tests__/`

### Style

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

### GJS runtime traps

- **No `undefined` in constructor props objects**: GTK4/GJS throws on undefined. Build `Record<string, unknown>` dynamically. Applies all GObject constructors.
- **No `undefined` for `label` on `Gtk.Button`**: Omit `label` entirely if only `icon_name`.

### UI conventions — MUST follow

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

## Feature isolation

### Dependency levels

1. No deps: models, catalog/types, compat/types
2. Depends on interfaces: pipeline, catalog/parser, compat/detector
3. GJS services: http, database, extractor, launcher
4. UI widgets: catalog-view, library-view, downloads-view

### Multi-agent rules

1. Agent reads: AGENTS.md + FEATURE.md + types.ts + deps' types.ts
2. Agent modifies: only files listed in FEATURE.md as owned
3. Agent reads tests, not impl, of dependencies
4. Cross-feature state: interfaces or events only, no shared singletons

### Cross-session handoff

Shared handoff: `/tmp/plundernome-handoff.md`. Read on start, append on end. Keep current work summary so other agents pick up without overlap.

## File ownership

| File                                                                             | Owner                          |
| -------------------------------------------------------------------------------- | ------------------------------ |
| vitest.config.ts, tsconfig.json, package.json, scripts/build.mjs                 | Infra                          |
| src/domain/models.ts, src/domain/types-extras.ts                                 | Architecture                   |
| src/services/types.ts, src/services/wine-types.ts, src/services/extract-types.ts | Architecture                   |
| src/ui/views/_, src/ui/widgets/_, src/ui/helpers.ts                              | Architecture                   |
| src/domain/pipeline.ts, src/gjs.d.ts, src/domain/index.ts                        | CodeQuality                    |
| src/services/extractor.ts, http.ts, adaptive-queue.ts, pipeline-orchestrator.ts  | CodeQuality                    |
| AGENTS.md                                                                        | Coordination                   |
| src/sources/\*                                                                   | Any (read-only after creation) |

### AST-grep structural lint

Rules in `rules/*.yml` enforce UI patterns:

- `no-bare-button` — use `createButton()` factory
- `no-scrolled-window` — use `Adw.ClampScrollable`
- `no-as-any` — use `unknown`
- `no-neg-one-size` — both dims in `set_size_request()`
- `no-dot-show` — use `.present()`
- `domain-no-gi` — no GI imports in domain

Run via `scripts/check-conventions.sh` (invokes `./node_modules/.bin/sg`).

## Barrel exports pattern

```
// domain/index.ts
export * from './models'
export * from './pipeline'
// ...
```

## Build

- Entry points: `src/main.ts`, `src/launch-entry.ts`
- Bundle: IIFE for GJS runtime. `external: ['imports:*']` keeps GI imports unbundled.
- Banner sets GI version overrides: `imports.gi.versions.Gtk = "4.0"` etc.
- Post-build `node --check` validates syntax of each output.
