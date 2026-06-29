# Task 03 — ProtonDB Auto Proton Version Selection

## Context
ProtonDB ratings (platinum/gold/silver/bronze/borked) are already fetched into
`ctrl.protonRatings` Map in `src/controller/health-wirer.ts`. GE-Proton versions are managed
by `src/services/wine-manager.ts`. But when a user clicks Play, the launcher just uses
whatever Wine is configured in GSettings — it never checks ProtonDB. Goal: before launching,
auto-select the best available Proton version based on ProtonDB rating. Zero user interaction
required.

## Files to read before starting
- `src/services/protondb.ts` — ProtonDBRating type, ProtonDB class
- `src/services/wine-manager.ts` — WineManager, WineVersion, listVersions(), getLatestGE()
- `src/services/wine-types.ts` — IWineManager, WineVersion interface
- `src/services/launcher.ts` — Launcher.launch(), how Wine path is selected
- `src/controller/handlers.ts` — buildPlayHandler() — entry point for Play button
- `src/controller/index.ts` — AppController, protonRatings Map
- `src/domain/models.ts` — Game type

## What to implement

### Step 1 — Create proton selector
New file: `src/services/proton-selector.ts` (max 80 lines)

```ts
import type { ProtonDBRating } from './protondb'
import type { WineVersion } from './wine-types'

export interface ProtonSelection {
  version: WineVersion | null
  reason: string
}

// Rating → minimum acceptable Proton tier
// platinum/gold → use stable Proton or GE latest
// silver/bronze → use GE latest (better compat)
// borked → use GE latest + warn user
// pending/null → use GE latest as safe default
export function selectProtonVersion(
  rating: ProtonDBRating | null | undefined,
  available: WineVersion[],
): ProtonSelection {
  const ge = available.filter(v => v.name.toLowerCase().includes('ge-proton'))
    .sort((a, b) => b.name.localeCompare(a.name))  // latest first
  const stable = available.filter(v => !v.name.toLowerCase().includes('ge'))
    .sort((a, b) => b.name.localeCompare(a.name))

  if (!rating || rating === 'pending') {
    const pick = ge[0] ?? stable[0] ?? null
    return { version: pick, reason: 'No ProtonDB data — using latest GE-Proton' }
  }
  if (rating === 'borked') {
    const pick = ge[0] ?? null
    return { version: pick, reason: 'Borked on ProtonDB — trying GE-Proton, may not work' }
  }
  if (rating === 'platinum' || rating === 'gold') {
    const pick = stable[0] ?? ge[0] ?? null
    return { version: pick, reason: `ProtonDB: ${rating} — using ${pick?.name ?? 'system Wine'}` }
  }
  // silver or bronze
  const pick = ge[0] ?? stable[0] ?? null
  return { version: pick, reason: `ProtonDB: ${rating} — using GE-Proton for better compat` }
}
```

### Step 2 — Wire into play handler
File: `src/controller/handlers.ts`

`buildPlayHandler` currently calls `launcher.launch(game, installPath)`. Update it to:

1. Accept `protonRatings: Map<string, ProtonDBRating>` and `wineManager: WineManager` as params
2. Before launch:
```ts
import { selectProtonVersion } from '../services/proton-selector'
// ...
const rating = protonRatings.get(game.name) ?? null
const available = await wineManager.listVersions()
const { version, reason } = selectProtonVersion(rating, available)
win.showToast(reason, 'normal', 3)
// Pass version.path to launcher if version found
```
3. If `version` is not null, pass `version.path` as the Wine binary override to `launcher.launch()`
4. If `version` is null, proceed with system Wine (no change)

Check `src/services/launcher.ts` for the exact launch signature to see how to pass Wine path.

### Step 3 — Update AppController
File: `src/controller/index.ts`

Update the `buildPlayHandler(...)` call sites (there are 2 — in `init()` and in `wireLibraryView`) to pass:
- `this.protonRatings`
- new `WineManager()` instance (import from `'../services/wine-manager'`)

Add `private wineManager: WineManager` field, instantiate in constructor.

## Acceptance criteria
- User clicks Play on a gold-rated game → toast shows "ProtonDB: gold — using Proton X.Y"
- User clicks Play on unknown game → toast shows "No ProtonDB data — using latest GE-Proton"
- No GE-Proton installed → falls back to system Wine silently
- Borked game → toast warns user, still attempts launch
- `npm run build` passes
- `npm run typecheck` passes

## Do NOT touch
- `src/domain/`
- `src/services/protondb.ts` (read-only)
- Any catalog or downloads UI
