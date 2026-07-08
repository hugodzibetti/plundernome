# Plundernome — DeepSeek Master Context

Read entire file before touching any code.

## What this is

GNOME-native gaming hub for Fedora/Ubuntu. GTK4 + Libadwaita desktop app.
Users browse game catalog, download repacks, extract, launch via Wine/Proton — one click.
Also imports Steam/Heroic/Lutris libraries. Cloud saves via Ludusavi + WebDAV.

## Stack

| Layer | Tech |
|-------|------|
| Language | TypeScript → compiled to GJS-compatible JS via esbuild |
| Runtime | GJS (GNOME JavaScript, `gi://` bindings — NOT Node.js) |
| UI | GTK4 + Libadwaita (Adw prefix) |
| HTTP | libsoup 3 (via GJS) |
| Database | SQLite via libgda (via GJS) |
| Build | esbuild IIFE bundles → `dist/main.js` |
| Tests | vitest (pure domain/service logic — no GJS needed) |

## Architecture — 4 strict layers

```
src/domain/       Pure TypeScript. ZERO GI imports. Node-testable with vitest.
src/services/     GJS wrappers. Implements interfaces from services/types.ts.
src/controller/   Wires domain + services + UI. AppController is the root.
src/ui/           GTK4 widgets. Views extend Adw.Bin.
src/sources/      Source definitions (repack sites). Read-only after creation.
```

**Rule: dependencies only flow downward. UI imports controller interfaces, never services directly.**

## Key files — read these to understand the codebase

| File | Purpose |
|------|---------|
| `src/domain/models.ts` | Core types: Game, Download, PipelineState, DownloadType |
| `src/services/types.ts` | All service interfaces (re-exports from sub-files) |
| `src/controller/types.ts` | ControllerDeps, IAppController |
| `src/controller/view-interfaces.ts` | IHomeView, ICatalogView, ILibraryView, IWindow, etc. |
| `src/controller/index.ts` | AppController — root wiring class |
| `src/controller/feature-wirers.ts` | wireAllFeatures(), individual view wiring functions |
| `src/services/gsettings.ts` | SettingsManager, GSETTINGS_KEYS |
| `src/services/database-migrations.ts` | DB schema (current version: 9) |
| `data/io.github.plundernome.gschema.xml` | GSettings schema — add new keys here |
| `src/ui/window.ts` | Main window, sidebar nav, view registration |
| `src/ui/factory.ts` | createButton(), createLabel() — ALWAYS use these |

## Mandatory conventions — violations cause build or runtime failure

### GJS runtime traps (these crash at runtime, not compile time)
- **Never pass `undefined` in GObject constructor props objects.** Build props object dynamically, omit keys with undefined values.
- **Never `new Gtk.Button({ label: undefined })`** — omit `label` entirely if icon-only.
- **Never `extends Adw.SwitchRow`** — segfault. Use `Adw.ActionRow` + `Gtk.Switch` + `add_suffix()` + `set_activatable_widget()`.
- **Never `.show()`** — use `.present()`.
- **No `as any`** — use `unknown` + narrowing.
- **No `new Gtk.ScrolledWindow()`** — use `Adw.ClampScrollable`, UNLESS it's a horizontal image strip (comment why).
- **No `new Gtk.Button()`** — always `createButton()` from `src/ui/factory.ts`.
- **`set_size_request()` always needs both dims** — `widget.set_size_request(width, height)`, never `(-1, height)`.

### File structure
- Max 150 lines per file. Split into `-part2.ts` / separate concern file if exceeded.
- Interface/type files: max 50 lines.
- `*-types.ts` files = interfaces only.
- `index.ts` files = barrel re-exports only.

### Domain layer purity
- `src/domain/` files: ZERO imports from `gi://` or `imports.gi.*`.
- All GJS calls stay in `src/services/`.
- Domain functions are pure: input → output, no side effects.

### UI patterns
- Views extend `Adw.Bin`, registered with `GObject.registerClass`.
- Use templates: `createScrollContent()`, `createGridContent()`, `createSettingsPage()` from `src/ui/templates/`.
- Prefer `Adw.*` widgets over `Gtk.*`: `Adw.ActionRow` > `Gtk.Box` rows, `Adw.PreferencesGroup` > manual sections.
- Every widget gets ≥1 CSS class. Kebab-case, component-prefixed.
- Error handling via `Result<T, E>` from `src/domain/result.ts`, not thrown exceptions.

### Adding GSettings keys
1. Add `<key name="..." type="s/b/i">` to `data/io.github.plundernome.gschema.xml`
2. Add constant to `GSETTINGS_KEYS` in `src/services/gsettings.ts`
3. Read in `AppController` constructor via `s.getString(GSETTINGS_KEYS.YOUR_KEY)`

### Adding DB tables
Add `if (cur < N)` block in `src/services/database-migrations.ts` with next version number.
Current schema version: **9**. Next migration: **10**.

### Adding a new view to the window
1. Create view class in `src/ui/views/your-view.ts` extending `Adw.Bin`
2. Add `IYourView` interface to `src/controller/view-interfaces.ts`
3. Add `yourView: IYourView` to `ControllerDeps` in `src/controller/types.ts`
4. Register in `src/ui/window.ts`: add sidebar row + stack child + getter method
5. Add to `IWindow` interface in `src/controller/view-interfaces.ts`
6. Wire in `src/controller/feature-wirers.ts`

## Current state — what's already built

**Working:**
- Catalog: scrapes 21 repack sites (FitGirl, DODI, SteamRIP, etc.), search + filter
- Download pipeline: HTTP download → 7z extract → dep install → Wine launch
- Library: installed games, playtime tracking, launch options editor
- Steam import: reads `~/.steam/steam/steamapps/`
- Emulator: detects 20+ emulators, scans ROMs
- Cloud saves: Ludusavi CLI + WebDAV sync (basic)
- GE-Proton manager
- Home dashboard, Big Picture mode, LAN sync
- ProtonDB ratings fetched (stored in `ctrl.protonRatings` Map)
- IGDB metadata provider (class exists, not wired to UI)
- RealDebrid/AllDebrid/Premiumize (classes exist, not wired to download flow)
- Hoster resolvers: GoFile, MediaFire, Pixeldrain (classes exist, not wired)

**Stubbed / incomplete (this is what the tasks implement):**
- Debrid not in download flow
- Hoster link resolution not in download flow
- ProtonDB rating not used to select Proton version
- Heroic (Epic/GOG) library import: missing
- Lutris library import: missing
- Cloud save auto-backup on game exit: missing
- IGDB cover art not shown in catalog cards
- No Discover view
- No accounts/API keys settings section
- No friendly error messages (raw errors shown)
- No source health indicators in catalog

## Completion gate — run before declaring any task done

```bash
npm run typecheck    # must pass — zero TS errors
npm run build        # must pass — dist/main.js produced
npm run test:domain  # must pass — pure domain tests
```

Full gate (slower):
```bash
npm test             # vitest run — all tests
```

## Task queue

All tasks are in `tasks/`. Work one at a time. File: `tasks/INDEX.md`.

**How to work on a task:**
1. Read `tasks/INDEX.md` — pick lowest-numbered incomplete task
2. Read the task file fully before writing any code
3. Read every file listed in the task's "Files to read" section
4. Implement exactly what the task describes — nothing more
5. Run completion gate
6. Mark done by adding `✅` to the task filename or noting in INDEX.md

## What NOT to do
- Do not refactor code outside the task scope
- Do not add features not described in the task
- Do not introduce new dependencies (no npm packages — runtime is GJS)
- Do not use `console.log` — use `this.db.log()` or GLib.log()
- Do not create `.md` files unless the task asks for one
- Do not skip the completion gate
