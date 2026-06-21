import type { IDatabaseService, GameRow } from './types'

export interface BackupData {
  version: number
  exportedAt: string
  games: GameRow[]
  playSessions: Array<{ gameId: string; start: string; end: string | null }>
}

export class BackupRestoreService {
  private db: IDatabaseService

  constructor(db: IDatabaseService) {
    this.db = db
  }

  async exportToJson(filePath: string, onProgress?: (current: number, total: number) => void): Promise<void> {
    const total = 3
    const games = await this.db.query<GameRow>('SELECT * FROM games')
    onProgress?.(1, total)
    const sessions = await this.db.query<{ game_id: string; session_start: string; session_end: string | null }>(
      'SELECT game_id, session_start, session_end FROM play_sessions'
    )
    const playSessions = sessions.map(s => ({
      gameId: s.game_id,
      start: s.session_start,
      end: s.session_end,
    }))
    const data: BackupData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      games,
      playSessions,
    }
    onProgress?.(2, total)
    const file = imports.gi.Gio.File.new_for_path(filePath)
    const output = file.replace(null, false, imports.gi.Gio.FileCreateFlags.NONE, null)
    const encoder = new TextEncoder()
    output.write(encoder.encode(JSON.stringify(data, null, 2)), null)
    output.close(null)
    onProgress?.(3, total)
  }

  async importFromJson(filePath: string, onProgress?: (current: number, total: number) => void): Promise<void> {
    const file = imports.gi.Gio.File.new_for_path(filePath)
    const input = file.read(null)
    const info = file.query_info('standard::size', imports.gi.Gio.FileQueryInfoFlags.NONE, null)
    const stream = input.read_bytes(info.get_size(), null)
    const decoder = new TextDecoder()
    const data: BackupData = JSON.parse(decoder.decode(stream.toArray()))
    if (!data.version || data.version < 1) throw new Error('Unsupported backup format')
    const total = 1 + data.games.length + data.playSessions.length
    let current = 1
    onProgress?.(current, total)
    for (const game of data.games) {
      await this.db.execute(
        `INSERT OR REPLACE INTO games (id, name, source_id, source_game_id, url, description, size_bytes, last_updated, download_type, image_url, installed, install_path, wishlisted)
         VALUES (//1, //2, //3, //4, //5, //6, //7, //8, //9, //10, //11, //12, //13)`,
        [game.id, game.name, game.source_id, game.source_game_id, game.url ?? '', game.description ?? '',
         game.size_bytes ?? 0, game.last_updated ?? '', game.download_type ?? '', game.image_url ?? null,
         game.installed ? 1 : 0, game.install_path ?? null, game.wishlisted ? 1 : 0]
      )
      current++
      onProgress?.(current, total)
    }
    for (const s of data.playSessions) {
      await this.db.execute(
        'INSERT INTO play_sessions (id, game_id, session_start, session_end) VALUES (//1, //2, //3, //4)',
        [imports.gi.GLib.uuid_string_random(), s.gameId, s.start, s.end]
      )
      current++
      onProgress?.(current, total)
    }
  }
}
