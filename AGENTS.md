# Plundernome — Agent Instructions

## Quick Start

```bash
npm install              # install build deps (Node.js required)
npm run build            # esbuild → dist/main.js + dist/launch-entry.js
gjs dist/main.js         # run under GJS (GNOME 48 runtime)
```

For Flatpak: `flatpak-builder --force-clean build flatpak/io.github.plundernome.json`

## Commands

| Command                    | Purpose                                         |
|----------------------------|-------------------------------------------------|
| `npm run build`            | esbuild IIFE bundles → `dist/`                  |
| `npm run dev:watch`        | esbuild watch mode                              |
| `npm run typecheck`        | `tsc --noEmit`                                  |
| `npm test`                 | vitest run — all tests (domain + service + ui + integration + smoke) |
| `npm run test:domain`      | vitest run `src/domain/` only                   |
| `npm run test:smoke`       | vitest run `tests/smoke.test.ts`                |
| `npm run test:quick`       | typecheck + domain tests + conventions (fast gate) |
| `npm run test:coverage`    | vitest with coverage (85% branches, 90% lines)  |
| `npm run lint`             | eslint + typecheck                              |
| `npm run lint:ui`          | UI tests + conventions check                    |
| `npm run lint:sg`          | ast-grep structural lint only                   |
| `npm run format`           | prettier --write                                |
| `bash scripts/run-tests.sh all` | Typecheck + all vitest suites               |
| `scripts/check-conventions.sh` | Line limits, domain purity, UI patterns, ast-grep |

### Completion gate (run before declaring any task done)
```bash
npm run typecheck && npm run build && npm run test:domain
```
Full gate: `npm test`

## Key Architecture

**Stack:** TypeScript → esbuild → GJS (GNOME JavaScript). GTK4 + Libadwaita UI. libsoup 3 HTTP, SQLite via Gda.

**4 strict layers (dependencies flow downward):**

| Layer        | Location            | Rules                                          |
|-------------|---------------------|------------------------------------------------|
| domain/     | `src/domain/`       | Pure TS, **zero GI imports**. Node-testable.   |
| services/   | `src/services/`     | GJS wrappers. Implement interfaces from `services/types.ts`. |
| controller/ | `src/controller/`   | Wires domain + services + UI. `AppController` is root. |
| ui/         | `src/ui/`           | GTK4 widgets. Views extend `Adw.Bin`.           |

**Key files to read first:**
- `src/domain/models.ts` — Core types (Game, Download, PipelineState)
- `src/services/types.ts` — All service interfaces
- `src/controller/types.ts` — ControllerDeps, IAppController
- `src/controller/view-interfaces.ts` — IHomeView, ICatalogView, ILibraryView, IWindow
- `src/controller/index.ts` — AppController root wiring
- `src/ui/factory.ts` — createButton(), createLabel() — **always use these**
- `src/ui/window.ts` — Main window, sidebar nav, view registration

**Build details:** esbuild bundles to IIFE. `external: ['imports:*']` keeps GI imports unbundled. Banner sets GI version overrides for Gtk 4.0, Adw 1, Soup 3.0. Post-build `node --check` validates syntax.

## Conventions (mandatory — violations cause build or runtime failure)

### GJS runtime traps
- **Never pass `undefined` in GObject constructor props.** Build `Record<string, unknown>` dynamically.
- **Never `new Gtk.Button()`** — always `createButton()` from `src/ui/factory.ts`.
- **Never `extends Adw.SwitchRow`** — segfaults in GJS. Use `Adw.ActionRow` + `Gtk.Switch` + `add_suffix()` + `set_activatable_widget()`.
- **Never `.show()`** — use `.present()` on dialogs.
- **Never `new Gtk.ScrolledWindow()`** — use `Adw.ClampScrollable` (exception: horizontal image strips).
- **Never `as any`** — use `unknown` + narrowing.
- **`set_size_request()` always needs both dims** — never `(-1, height)`.

### File structure
- Max 150 lines per file. Split if exceeded.
- Interface/type files: max 50 lines.
- `*-types.ts` = interfaces only. `index.ts` = barrel re-exports only.
- Files: kebab-case. Tests: `*.test.ts` next to impl or in `__tests__/`.

### Domain purity
- `src/domain/` files: zero imports from `gi://` or `imports.gi.*`.
- Prefer fns + interfaces over classes (classes only when GObject-required).
- Error handling via `Result<T, E>`, not thrown exceptions.

### Style
- Self-documenting names. No comments unless non-obvious.
- `import type` for type-only imports. Arrow fns over `function`.
- Type inference over explicit annotations. Use `satisfies` for const.
- `??`/`?.` over ternary chains. Early returns over nested `if`.

## Adding Features

### Add a new view
1. Create view class in `src/ui/views/your-view.ts` extending `Adw.Bin`
2. Add `IYourView` interface to `src/controller/view-interfaces.ts`
3. Add `yourView: IYourView` to `ControllerDeps` in `src/controller/types.ts`
4. Register in `src/ui/window.ts`: sidebar row + stack child + getter
5. Add to `IWindow` interface
6. Wire in `src/controller/feature-wirers.ts`

### Add GSettings keys
1. Add `<key>` to `data/io.github.plundernome.gschema.xml`
2. Add constant to `GSETTINGS_KEYS` in `src/services/gsettings.ts`
3. Read in `AppController` constructor via `s.getString(GSETTINGS_KEYS.YOUR_KEY)`

### Add DB tables
Add `if (cur < N)` block in `src/services/database-migrations.ts`. Current schema version: **9**.

## Pitfalls

- **No `console.log`** — use `this.db.log()` or `GLib.log()`.
- **No new npm dependencies** — runtime is GJS, not Node. Only devDependencies for build/test.
- **GTK4 has no `Gtk.SwitchRow`** — segfaults. Use the `Adw.ActionRow` + `Gtk.Switch` pattern.
- **GJS `undefined` is fatal in GObject props** — GJS throws on undefined constructor values. Build props objects conditionally.
- **Don't refactor outside task scope** — one concern per task. Read tests, not impl, of dependencies.
- **Sources are read-only** — `src/sources/` files are JSON defs. Don't modify them.
- **Eslint v9 flat config is missing** — `npm run lint` calls `eslint .` but no `eslint.config.*` file exists yet. You may need to create one if lint fails.
- **Smoke tests need `xvfb-run`** (or DISPLAY set) — spawns GJS under fake display.

## Docs Index

See `docs/` for detailed reference:
- `docs/ARCHITECTURE.md` — full stack, layers, file ownership, build details
- `docs/COMMANDS.md` — all commands, CI workflow, smoke test prerequisites
- `docs/CONVENTIONS.md` — file limits, naming, style, GJS traps, UI rules, ast-grep rules
- `docs/PROJECT-STATE.md` — current feature set (all 13 tasks complete)
- `docs/CONTEXT.md` — domain glossary (Game, RepackSource, Catalog, Library, Pipeline, Emulators, etc.)
- `docs/DEEPSEEK.md` — master context document for new sessions (read this first in a fresh context)
