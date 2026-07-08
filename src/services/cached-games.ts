import type { Game } from '../domain/models'
import type { DatabaseService } from './database/database'

export async function loadCachedGames(db: DatabaseService): Promise<Game[]> {
  const rows = await db.query<{ game_data_json: string }>('SELECT game_data_json FROM cached_games')
  const all: Game[] = []
  for (const row of rows) {
    try {
      const games = JSON.parse(row.game_data_json) as Game[]
      all.push(...games)
    } catch { /* skip corrupt cache entry */ }
  }
  return all
}

export async function cacheSourceGames(
  db: DatabaseService,
  sourceId: string,
  games: Game[],
): Promise<void> {
  const now = new Date().toISOString()
  await db.execute(
    'INSERT OR REPLACE INTO cached_games (source_id, game_data_json, cached_at) VALUES (?, ?, ?)',
    [sourceId, JSON.stringify(games), now],
  )
}
