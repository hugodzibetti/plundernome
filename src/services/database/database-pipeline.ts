import type { GameID } from '../../domain/models'
import type { LogEntry, LogFilter } from '../database/database-types'

interface DbCtx {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<number>
}

export async function logPipelineStep(
  ctx: DbCtx, gameId: GameID, step: string, status: string, message?: string,
): Promise<void> {
  await ctx.execute('INSERT INTO pipeline_log (game_id, step, status, message) VALUES (//1, //2, //3, //4)', [
    gameId,
    step,
    status,
    message ?? null,
  ])
}

export async function startPlaySession(ctx: DbCtx, gameId: GameID): Promise<string> {
  const id = imports.gi.GLib.uuid_string_random()
  await ctx.execute(
    "INSERT INTO play_sessions (id, game_id, session_start) VALUES (//1, //2, datetime('now'))",
    [id, gameId],
  )
  return id
}

export async function endPlaySession(ctx: DbCtx, sessionId: string): Promise<void> {
  await ctx.execute("UPDATE play_sessions SET session_end = datetime('now') WHERE id = //1", [sessionId])
}

export async function getPlaytime(ctx: DbCtx, gameId: GameID): Promise<number> {
  const rows = await ctx.query<{ total: number }>(
    'SELECT COALESCE(SUM((julianday(session_end) - julianday(session_start)) * 86400), 0) as total FROM play_sessions WHERE game_id = //1 AND session_end IS NOT NULL',
    [gameId],
  )
  return rows[0]?.total ?? 0
}

export async function getLaunchOptions(
  ctx: DbCtx, gameId: GameID,
): Promise<{ env: Record<string, string>; args: string }> {
  const rows = await ctx.query<{ env_json: string; args: string }>(
    'SELECT env_json, args FROM launch_options WHERE game_id = //1',
    [gameId],
  )
  if (rows.length === 0) return { env: {}, args: '' }
  return { env: JSON.parse(rows[0]!.env_json), args: rows[0]!.args }
}

export async function setLaunchOptions(
  ctx: DbCtx, gameId: GameID, env: Record<string, string>, args: string,
): Promise<void> {
  await ctx.execute('INSERT OR REPLACE INTO launch_options (game_id, env_json, args) VALUES (//1, //2, //3)', [
    gameId,
    JSON.stringify(env),
    args,
  ])
}

export async function savePipelineState(
  ctx: DbCtx, gameId: GameID,
  state: { step: string; status: string; progress: number; errorMessage?: string },
): Promise<void> {
  await ctx.execute(
    "INSERT OR REPLACE INTO pipeline_state (game_id, step, status, progress, error_message, updated_at) VALUES (//1, //2, //3, //4, //5, datetime('now'))",
    [gameId, state.step, state.status, state.progress, state.errorMessage ?? null],
  )
}

export async function getPipelineState(
  ctx: DbCtx, gameId: GameID,
): Promise<{ step: string; status: string; progress: number; errorMessage?: string } | null> {
  const rows = await ctx.query<{ step: string; status: string; progress: number; error_message: string | null }>(
    'SELECT step, status, progress, error_message FROM pipeline_state WHERE game_id = //1',
    [gameId],
  )
  if (rows.length === 0) return null
  return {
    step: rows[0]!.step,
    status: rows[0]!.status,
    progress: rows[0]!.progress,
    errorMessage: rows[0]!.error_message ?? undefined,
  }
}

export async function getAllIncompletePipelines(
  ctx: DbCtx,
): Promise<Array<{ gameId: GameID; step: string; status: string; progress: number }>> {
  const rows = await ctx.query<{ game_id: GameID; step: string; status: string; progress: number }>(
    "SELECT game_id, step, status, progress FROM pipeline_state WHERE status != 'completed'",
  )
  return rows.map((r) => ({ gameId: r.game_id, step: r.step, status: r.status, progress: r.progress }))
}

export async function getPipelineLogs(
  ctx: DbCtx, filter?: LogFilter,
): Promise<LogEntry[]> {
  const conds: string[] = []
  const params: unknown[] = []
  let n = 1
  if (filter?.gameId) {
    conds.push(`game_id = //${n++}`)
    params.push(filter.gameId)
  }
  if (filter?.step) {
    conds.push(`step = //${n++}`)
    params.push(filter.step)
  }
  if (filter?.status) {
    conds.push(`status = //${n++}`)
    params.push(filter.status)
  }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''
  return ctx.query<LogEntry>(
    `SELECT * FROM pipeline_log ${where} ORDER BY created_at DESC LIMIT //${n++}`,
    [...params, filter?.limit ?? 200],
  )
}

export async function getRecentlyPlayedGames(ctx: DbCtx): Promise<Array<{ gameId: GameID; lastPlayed: string; playtime: number }>> {
  return ctx.query<{ gameId: GameID; lastPlayed: string; playtime: number }>(
    `SELECT ps.game_id as gameId, MAX(ps.session_start) as lastPlayed,
     COALESCE(SUM((julianday(ps.session_end) - julianday(ps.session_start)) * 86400), 0) as playtime
     FROM play_sessions ps WHERE ps.session_end IS NOT NULL GROUP BY ps.game_id ORDER BY lastPlayed DESC LIMIT 10`,
  )
}

export async function getLogGameIds(ctx: DbCtx): Promise<string[]> {
  const rows = await ctx.query<{ game_id: string }>('SELECT DISTINCT game_id FROM pipeline_log ORDER BY game_id')
  return rows.map((r) => r.game_id)
}
