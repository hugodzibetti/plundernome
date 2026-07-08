# Phase 2 — Services Layer

## Goal
Implement GJS service wrappers around GNOME system libraries. Each service implements an interface from `src/services/types.ts`.

## Files to create

```
src/services/
├── http.ts          ← IHttpService (libsoup 3, GET + streaming download)
├── database.ts      ← IDatabaseService (Gda/SQLite, schema migration)
├── extractor.ts     ← IExtractorService (libarchive / spawn 7z)
├── dependency.ts    ← IDependencyInstaller (winetricks, bundled installers)
├── launcher.ts      ← ILauncher (wine/proton exec, .desktop creation)
├── index.ts         ← barrel
└── __tests__/       ← GJS-runnable tests (*.js files, NOT .ts)
```

## Build tooling note
Tests must compile TS→JS first, then run with `gjs -m`. Use `esbuild` to compile per-file before gjs execution.

## Dependencies
- **domain/models.ts** — Game, CompatProfile, FileEntry types (already stable)
- **domain/pipeline.ts** — PipelineState for tracking install progress
- **GJS introspection**: Soup-3.0, Gda-6.0, GLib-2.0, Gio-2.0

## Interface contracts (src/services/types.ts)
Each interface is documented inline. Read `src/services/types.ts` before implementing.

## Implementation order (recommended)
1. `http.ts` — needed by catalog scraper and download manager
2. `database.ts` — needed for library persistence, pipeline logs
3. `extractor.ts` — needed after download completes
4. `dependency.ts` — needed for compat deps installation
5. `launcher.ts` — final step, depends on CompatProfile

## Test strategy
- Services cannot use vitest (require GJS runtime)
- Write tests as plain `.js` files run with `gjs -m`
- Mock network/filesystem by implementing test doubles
- Example test pattern:
```js
// src/services/__tests__/http.test.js
imports.gi.versions.Soup = '3.0'
const Soup = imports.gi.Soup
// ... test with mock Soup session
```

## Drift rules
- If you change an interface in `types.ts`, append drift note to docs/AGENTS.md
- If you discover domain models need changes, note it — don't modify domain/ files (that's another agent's scope)