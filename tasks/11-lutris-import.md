# Task 11 — Lutris Library Import

## Context
Lutris manages GOG, itch.io, and custom Wine/native games via YAML config files at
`~/.config/lutris/games/*.yml`. Each file is one game. Importing these gives users their
full Linux gaming library in one place. Follow exact pattern of task 04 (Heroic import).

## Files to read before starting
- `src/services/heroic-service.ts` — completed in task 04, mirror this pattern exactly
- `src/services/database-games.ts` — upsertGame() or equivalent insert method
- `src/ui/widgets/steam-settings-group.ts` — settings group pattern to follow
- `src/controller/settings-wirer.ts` — wireHeroicImport() from task 04 to mirror
- `src/controller/index.ts` — where to instantiate LutrisService

## Lutris file locations
```
~/.config/lutris/games/*.yml     — one YAML file per game
~/.local/share/lutris/covers/    — cover art (filename = slug + .jpg/.png)
```

## Lutris game YAML structure
```yaml
name: The Witcher 3
game_id: the-witcher-3
slug: the-witcher-3-gog
runner: wine                    # wine | steam | native | dosbox | scummvm | retroarch
directory: /home/user/Games/witcher3
exe: /home/user/Games/witcher3/bin/witcher3.exe
installed: true
platform: Windows               # Windows | Linux
year: 2015
```

## What to implement

### Step 1 — LutrisService
New file: `src/services/lutris-service.ts` (max 120 lines)

```ts
const GLib = imports.gi.GLib
const Gio = imports.gi.Gio

const LUTRIS_CONFIG = `${GLib.get_home_dir()}/.config/lutris/games`
const LUTRIS_COVERS = `${GLib.get_home_dir()}/.local/share/lutris/covers`

interface LutrisGame {
  name: string
  game_id?: string
  slug?: string
  runner?: string
  directory?: string
  exe?: string
  installed?: boolean
  platform?: string
}

export class LutrisService {
  constructor(private db: DatabaseService) {}

  isLutrisInstalled(): boolean {
    return GLib.file_test(LUTRIS_CONFIG, GLib.FileTest.IS_DIR)
  }

  async importLibrary(): Promise<number> {
    if (!this.isLutrisInstalled()) return 0
    const dir = Gio.File.new_for_path(LUTRIS_CONFIG)
    const enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null)
    let count = 0
    let info = enumerator.next_file(null)
    while (info) {
      const fname = info.get_name()
      if (fname.endsWith('.yml') || fname.endsWith('.yaml')) {
        const path = `${LUTRIS_CONFIG}/${fname}`
        const game = this.parseYaml(path)
        if (game?.name && game.installed !== false) {
          await this.upsertGame(game)
          count++
        }
      }
      info = enumerator.next_file(null)
    }
    return count
  }

  private parseYaml(path: string): LutrisGame | null {
    // GLib.file_get_contents → decode → parse YAML manually
    // Lutris YAML is simple key: value, no nested structures needed
    // Parse only: name, game_id, slug, runner, directory, exe, installed, platform
    const [ok, bytes] = GLib.file_get_contents(path)
    if (!ok || !bytes) return null
    const text = new TextDecoder().decode(bytes)
    const result: Record<string, string> = {}
    for (const line of text.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)$/)
      if (match) result[match[1]!] = match[2]!.trim().replace(/^['"]|['"]$/g, '')
    }
    return result as unknown as LutrisGame
  }

  private coverPath(slug: string): string | undefined {
    for (const ext of ['.jpg', '.png', '.jpeg']) {
      const p = `${LUTRIS_COVERS}/${slug}${ext}`
      if (GLib.file_test(p, GLib.FileTest.EXISTS)) return `file://${p}`
    }
    return undefined
  }

  private async upsertGame(game: LutrisGame): Promise<void> {
    const slug = game.slug ?? game.game_id ?? game.name.toLowerCase().replace(/\s+/g, '-')
    // map to DB row and call db.upsertGame or db.execute INSERT OR REPLACE
    // id: 'lutris-' + slug
    // source_id: 'lutris'
    // source_game_id: slug
    // name: game.name
    // url: '' (already installed)
    // install_path: game.directory ?? null
    // image_url: this.coverPath(slug) ?? null
    // download_type: 'direct'
    // tags: [game.runner ?? 'native', game.platform ?? 'Linux'].filter(Boolean)
  }
}
```

### Step 2 — Settings UI
New file: `src/ui/widgets/lutris-settings-group.ts` (max 80 lines)

`Adw.PreferencesGroup` titled "Lutris":
- Only render if `lutrisService.isLutrisInstalled()` returns true
- "Import Lutris Library" button (use `createButton()`)
- Status label showing result: "Imported 42 games" or idle

### Step 3 — Wire in settings
File: `src/controller/settings-wirer.ts`

Add `wireLutrisImport(settingsView, lutrisService, window, refreshLibrary)`.
Mirror `wireHeroicImport` exactly.

### Step 4 — Instantiate in AppController
File: `src/controller/index.ts`

Add `lutrisService: LutrisService` field.
Instantiate in constructor with `this.db`.
Call `wireLutrisImport(...)` in `init()`.

## Acceptance criteria
- Settings shows Lutris import button only when `~/.config/lutris/games/` exists
- Import reads all `.yml` files, inserts into DB
- Games appear in library view with local cover art if available
- Runner shown as tag (wine/native/steam)
- Re-import is idempotent
- App works normally if Lutris not installed
- `npm run build` passes
- `npm run typecheck` passes
