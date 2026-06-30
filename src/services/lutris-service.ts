import type { DatabaseService } from './database'

const { GLib, Gio } = imports.gi

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
    const [ok, bytes] = GLib.file_get_contents(path)
    if (!ok || !bytes) return null
    const text = new TextDecoder().decode(bytes)
    const result: Record<string, string | boolean> = {}
    for (const line of text.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)$/)
      if (match) {
        const val = match[2]!.trim().replace(/^['"]|['"]$/g, '')
        result[match[1]!] = val === 'true' ? true : val === 'false' ? false : val
      }
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
    const tags = [game.runner ?? 'native', game.platform ?? 'Linux'].filter(Boolean)
    const now = new Date().toISOString()
    await this.db.execute(
      `INSERT OR REPLACE INTO games (id, name, source_id, source_game_id, url, install_path, image_url, download_type, tags_json, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `lutris-${slug}`,
        game.name,
        'lutris',
        slug,
        '',
        game.directory ?? null,
        this.coverPath(slug) ?? null,
        'direct',
        JSON.stringify(tags),
        now,
      ],
    )
  }
}
