# Plundernome — Architecture

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

## Barrel exports pattern

```
// domain/index.ts
export * from './models'
export * from './pipeline'
```

Entry points: `src/main.ts`, `src/launch-entry.ts`
Bundle: IIFE for GJS runtime. `external: ['imports:*']` keeps GI imports unbundled.
Banner sets GI version overrides: `imports.gi.versions.Gtk = "4.0"` etc.
Post-build `node --check` validates syntax of each output.

## Summary

```
Plundernome
├── domain/       Pure TS, 0 GI
├── services/     GJS wrappers (http, db, extractor, launcher)
├── ui/           GTK4+Adw views + widgets
│   ├── templates/  Reusable layouts
│   ├── views/      Catalog, Library, Downloads, Settings, Discover
│   └── widgets/    GameCard, ProgressBar, dialogs, settings groups
├── controller/   Wires domain → services → UI
├── sources/      JSON defs + TS types
└── scripts/      Build, tests, conventions check
```
