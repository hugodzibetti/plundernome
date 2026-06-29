# Task 04 — Heroic Games Launcher Library Import

## Context
Steam import works via `src/services/steam/steam-service.ts`. Heroic Games Launcher manages
Epic Games Store and GOG games on Linux. Its library JSON lives at
`~/.config/heroic/library/` (Epic) and `~/.config/heroic/gog_store/` (GOG). Importing these
lets users see all their legitimately purchased games in Plundernome's unified library. This
is the most impactful feature for "it just works" — paid game owners get their library for free.

## Files to read before starting
- `src/services/steam/steam-service.ts` — SteamService pattern to follow exactly
- `src/services/steam-types.ts` — ISteamService interface
- `src/services/database-types.ts` — IDatabaseService, what columns games table has
- `src/services/database-games.ts` — how games are inserted/updated
- `src/domain/models.ts` — Game type (must map Heroic data to this)
- `src/controller/view-interfaces.ts` — ISettingsView.onSteamImport pattern to mirror
- `src/controller/feature-wirers.ts` — how Steam import is wired (mirror for Heroic)

## Heroic file locations
```
~/.config/heroic/library/legendary.json       — Epic library (array of game objects)
~/.config/heroic/gog_store/library.json       — GOG library
~/.config/heroic/sideload_apps/               — sideloaded apps (skip)
~/.config/heroic/GamesConfig/{appName}.json   — per-game config (install path)
```

## Epic library JSON structure (legendary.json)
```json
{
  "library": [
    {
      "app_name": "Fortnite",
      "title": "Fortnite",
      "install": { "install_path": "/home/user/Games/Fortnite" },
      "art_cover": "https://cdn1.epicgames.com/...",
      "install_size": 90000000000,
      "is_installed": true,
      "platform": "Windows"
    }
  ]
}
```

## GOG library JSON structure
```json
{
  "games": [
    {
      "app_name": "1207658924",
      "title": "The Witcher 3",
      "install": { "install_path": "/home/user/Games/witcher3" },
      "art_cover": "https://images.gog.com/...",
      "install_size": 50000000000,
      "is_installed": true
    }
  ]
}
```

## What to implement

### Step 1 — HeroicService
New file: `src/services/heroic-service.ts` (max 150 lines — split if needed)

```ts
import type { DatabaseService } from './database'

const GLib = imports.gi.GLib

const HEROIC_CONFIG = `${GLib.get_home_dir()}/.config/heroic`

interface HeroicGame {
  app_name: string
  title: string
  install?: { install_path?: string }
  art_cover?: string
  install_size?: number
  is_installed?: boolean
}

export class HeroicService {
  constructor(private db: DatabaseService) {}

  async importLibrary(): Promise<number> {
    let imported = 0
    imported += await this.importSource(`${HEROIC_CONFIG}/library/legendary.json`, 'epic', 'library')
    imported += await this.importSource(`${HEROIC_CONFIG}/gog_store/library.json`, 'gog', 'games')
    return imported
  }

  private async importSource(path: string, sourceId: string, key: string): Promise<number> {
    // read file with GLib.file_get_contents
    // parse JSON
    // for each game: call this.db.upsertGame() with mapped fields
    // return count of games imported
  }

  isHeroicInstalled(): boolean {
    return GLib.file_test(`${HEROIC_CONFIG}`, GLib.FileTest.IS_DIR)
  }
}
```

Map Heroic game → DB row:
- `id`: `'heroic-' + app_name`
- `name`: title
- `source_id`: sourceId ('epic' or 'gog')
- `source_game_id`: app_name
- `url`: `''` (already installed, no download URL)
- `install_path`: install.install_path (if is_installed)
- `image_url`: art_cover
- `size_bytes`: install_size ?? 0
- `download_type`: `'direct'`

### Step 2 — Add import button to Settings
File: `src/ui/widgets/steam-settings-group.ts` (or create `heroic-settings-group.ts`)

Follow exact pattern of steam settings group. Add:
- "Import Heroic Library" button
- Status label showing last import count
- Only show if HeroicService.isHeroicInstalled() returns true

### Step 3 — Wire in settings-wirer
File: `src/controller/settings-wirer.ts`

Add `wireHeroicImport(settingsView, heroicService, window, refreshLibrary)` function.
Mirror how Steam import is wired.

### Step 4 — Instantiate in AppController
File: `src/controller/index.ts`

Add `heroicService: HeroicService` field, instantiate in constructor with `this.db`.
Call `wireHeroicImport(...)` in `init()`.

## Acceptance criteria
- Settings view shows "Import Heroic Library" button when `~/.config/heroic` exists
- Clicking it reads legendary.json + gog_store library, inserts into DB
- Library view shows imported Epic/GOG games with cover art
- Re-importing is idempotent (upsert, not duplicate)
- App works normally if Heroic not installed (button hidden)
- `npm run build` passes
- `npm run typecheck` passes
