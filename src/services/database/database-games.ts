import type { Game, GameID, SourceID } from '../../domain/models'
import type { GameRow } from '../types'
import { rowToGame, gameToRow } from '../database/database-helpers'
import type { Achievement } from '../../domain/achievements/types'

interface DbCtx {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<number>
}

export async function insertGame(ctx: DbCtx, game: Game): Promise<void> {
  const row = gameToRow(game)
  const keys = Object.keys(row)
  await ctx.execute(
    `INSERT OR REPLACE INTO games (${keys.join(', ')}) VALUES (${keys.map((_, i) => `//${i + 1}`).join(', ')})`,
    Object.values(row),
  )
}

export async function getGame(ctx: DbCtx, id: GameID): Promise<Game | null> {
  const rows = await ctx.query<GameRow>('SELECT * FROM games WHERE id = //1', [id])
  return rows.length > 0 ? rowToGame(rows[0]!) : null
}

export async function getAllGames(ctx: DbCtx, sourceId?: SourceID): Promise<Game[]> {
  const rows = sourceId
    ? await ctx.query<GameRow>('SELECT * FROM games WHERE source_id = //1 ORDER BY name', [sourceId])
    : await ctx.query<GameRow>('SELECT * FROM games ORDER BY name')
  return rows.map((r) => rowToGame(r))
}

export async function getResumeOffset(ctx: DbCtx, gameId: GameID): Promise<number> {
  const rows = await ctx.query<{ resume_offset: number }>('SELECT resume_offset FROM games WHERE id = //1', [gameId])
  return rows[0]?.resume_offset ?? 0
}

export async function setResumeOffset(ctx: DbCtx, gameId: GameID, offset: number): Promise<void> {
  await ctx.execute('UPDATE games SET resume_offset = //1 WHERE id = //2', [offset, gameId])
}

export async function saveDownloadState(
  ctx: DbCtx, gameId: GameID, offset: number, total: number, status: string,
): Promise<void> {
  await ctx.execute(
    'UPDATE games SET resume_offset = //1, download_total = //2, download_status = //3 WHERE id = //4',
    [offset, total, status, gameId],
  )
}

export async function getDownloadState(
  ctx: DbCtx, gameId: GameID,
): Promise<{ offset: number; total: number; status: string } | null> {
  const rows = await ctx.query<{ resume_offset: number; download_total: number; download_status: string }>(
    'SELECT resume_offset, download_total, download_status FROM games WHERE id = //1',
    [gameId],
  )
  return rows.length > 0
    ? { offset: rows[0]!.resume_offset, total: rows[0]!.download_total, status: rows[0]!.download_status }
    : null
}

export async function setWishlisted(ctx: DbCtx, gameId: GameID, wishlisted: boolean): Promise<void> {
  await ctx.execute('UPDATE games SET wishlisted = //1 WHERE id = //2', [wishlisted ? 1 : 0, gameId])
}

export async function getWishlisted(ctx: DbCtx): Promise<GameID[]> {
  const rows = await ctx.query<{ id: GameID }>('SELECT id FROM games WHERE wishlisted = 1')
  return rows.map((r) => r.id)
}

export async function getAchievements(
  ctx: DbCtx, gameId: string,
): Promise<Achievement[] | null> {
  const rows = await ctx.query<{
    id: string; game_id: string; name: string; description: string | null
    icon_url: string | null; unlocked: number; unlocked_at: string | null
    source: string; steam_api_name: string | null; hidden: number
  }>('SELECT * FROM game_achievements WHERE game_id = //1', [gameId])
  if (rows.length === 0) return null
  return rows.map(r => ({
    id: r.id,
    gameId: r.game_id,
    name: r.name,
    description: r.description ?? undefined,
    iconUrl: r.icon_url ?? undefined,
    unlocked: r.unlocked === 1,
    unlockedAt: r.unlocked_at ?? undefined,
    source: r.source as Achievement['source'],
    steamApiName: r.steam_api_name ?? undefined,
    hidden: r.hidden === 1,
  }))
}
