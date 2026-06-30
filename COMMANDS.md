# Plundernome — Commands

## IDE: GNOME Builder

Flatpak manifest `flatpak/io.github.plundernome.json`. Build + run via Builder. Terminal dev for quick iteration: `npm run build && gjs dist/main.js`.

## Completion gate (always do before done)

Build must pass: `npm run build`. No exception. Run before declaring finished.

## Pre-commit hook (must pass)

```
npx tsc --noEmit && npx vitest run && npm run build && bash scripts/check-conventions.sh
```

## CI workflow order (`.github/workflows/ci.yml`)

```
typecheck → test (vitest) → build (esbuild) → smoke test
```

## Dev workflow

```bash
npm install
npm run build
gjs dist/main.js
```

## Verification commands

| Command                        | What                                                                    |
| ------------------------------ | ----------------------------------------------------------------------- |
| `npm run typecheck`            | `tsc --noEmit`                                                          |
| `npm test`                     | `vitest run` (domain + service + ui + integration + smoke)              |
| `npm run test:domain`          | `vitest run src/domain/`                                                |
| `npm run test:smoke`           | `vitest run tests/smoke.test.ts`                                        |
| `npm run test:quick`           | `bash scripts/check-quick.sh` (typecheck + domain + conventions)        |
| `npm run lint`                 | `eslint . && tsc --noEmit`                                              |
| `npm run build`                | `node scripts/build.mjs` (produces dist/main.js + dist/launch-entry.js) |
| `scripts/check-conventions.sh` | line limits, domain purity, no GI in domain, UI patterns                |
| `scripts/run-tests.sh`         | wrapper: `all | domain | services | ui | integration | smoke | typecheck` |

## Smoke test prerequisites

- `xvfb-run` (or DISPLAY set) — test spawns GJS under fake display
- GSettings schema compiled — test compiles `io.github.plundernome.gschema.xml` to tmpdir automatically
- Schema install: `glib-compile-schemas .` + `GSETTINGS_SCHEMA_DIR=<dir> gjs dist/main.js`

## Domain tests

Pure vitest. No GJS needed. Run via `npm run test:domain`.
Fixtures in `tests/fixtures/`. Test contract pattern — no mocks.

## Service tests

Most run under vitest (`src/services/__tests__/`). Some need GJS env.
For manual GJS service testing: `gjs -m path/to/test.js`.
