import type { Achievement, AchievementSet } from '../../domain/achievements/types'
import type { DatabaseService } from '../database'
import { parseIniSection, parseGogJson } from './scanner-parsers'

const Gio = imports.gi.Gio

interface FileParser {
  glob: string
  parse: (c: string) => Achievement[]
}

export class AchievementsScanner {
  constructor(private readonly db: DatabaseService) {}

  async scanGame(gameId: string, installPath: string): Promise<AchievementSet> {
    const dir = Gio.File.new_for_path(installPath)
    if (!dir.query_exists(null)) return { gameId, achievements: [], total: 0, unlocked: 0 }
    const found: Achievement[] = []
    for (const fp of this.walkDir(installPath)) {
      for (const p of this.knownPatterns) {
        if (!this.matches(fp, p.glob)) continue
        const c = this.readFile(fp)
        if (!c) continue
        const parsed = p.parse(c)
        for (const a of parsed) {
          a.gameId = gameId
          if (!a.id) a.id = `${gameId}-${a.name}`
        }
        found.push(...parsed)
        break
      }
    }
    const merged = this.dedup(found)
    const unlocked = merged.filter(a => a.unlocked).length
    if (merged.length > 0) await this.save(gameId, merged)
    return { gameId, achievements: merged, total: merged.length, unlocked }
  }

  private walkDir(p: string): string[] {
    const r: string[] = []
    const d = Gio.File.new_for_path(p)
    try {
      const e = d.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null)
      let i: GioFileInfo | null
      while ((i = e.next_file(null))) {
        const c = d.get_child(i.get_name())
        if (i.get_file_type() === Gio.FileType.DIRECTORY) r.push(...this.walkDir(c.get_path()))
        else r.push(c.get_path())
      }
    } catch {}
    return r
  }

  private readFile(p: string): string | null {
    const f = Gio.File.new_for_path(p)
    const [ok, d] = f.load_contents(null) as [boolean, Uint8Array | null, string]
    if (!ok || !d) return null
    return new TextDecoder().decode(d)
  }

  private matches(fp: string, glob: string): boolean {
    if (!glob.includes('*')) return fp.endsWith(glob)
    const base = fp.split('/').pop() ?? ''
    return new RegExp(`^${glob.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`).test(base)
  }

  private dedup(items: Achievement[]): Achievement[] {
    const seen = new Set<string>()
    return items.filter(a => { if (seen.has(a.name)) return false; seen.add(a.name); return true })
  }

  private async save(gameId: string, ach: Achievement[]): Promise<void> {
    await this.db.execute('DELETE FROM game_achievements WHERE game_id = //1', [gameId])
    for (const a of ach) {
      await this.db.execute(
        `INSERT OR REPLACE INTO game_achievements (id, game_id, name, description, icon_url, unlocked, unlocked_at, source, steam_api_name, hidden)
         VALUES (//1, //2, //3, //4, //5, //6, //7, //8, //9, //10)`,
        [a.id, gameId, a.name, a.description ?? null, a.iconUrl ?? null, a.unlocked ? 1 : 0, a.unlockedAt ?? null, a.source, a.steamApiName ?? null, a.hidden ? 1 : 0]
      )
    }
  }

  private knownPatterns: FileParser[] = [
    { glob: 'steam_settings/achievements.ini', parse: (c) => parseIniSection(c, 'SteamAchievements') },
    { glob: 'ALI213.ini', parse: (c) => parseIniSection(c, 'Settings', true) },
    { glob: 'CODEX.ini', parse: (c) => parseIniSection(c, 'Settings', true) },
    { glob: 'cream_api.ini', parse: (c) => parseIniSection(c, 'Settings', true) },
    { glob: 'goggame-*.info', parse: parseGogJson },
  ]
}
