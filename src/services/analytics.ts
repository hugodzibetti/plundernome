import type { GameID } from '../domain/models'
import type { DatabaseService } from './database'

export interface PlaytimeStats {
  totalPlaytimeSeconds: number
  perGame: Array<{ gameId: string; gameName: string; seconds: number }>
  topPlayed: Array<{ gameId: string; gameName: string; seconds: number }>
  averageSessionMinutes: number
  totalSessions: number
}

export interface CollectionStats {
  totalGames: number
  installedGames: number
  bySource: Record<string, number>
  totalSizeBytes: number
  bySourceSize: Record<string, number>
}

export class AnalyticsService {
  constructor(private db: DatabaseService) {}

  async getPlaytimeStats(): Promise<PlaytimeStats> {
    const sessions = await this.db.query<{ game_id: string; duration: number }>(
      "SELECT game_id, COALESCE((julianday(session_end) - julianday(session_start)) * 86400, 0) as duration FROM play_sessions WHERE session_end IS NOT NULL"
    )
    const perGameMap = new Map<string, number>()
    let total = 0
    for (const s of sessions) {
      perGameMap.set(s.game_id, (perGameMap.get(s.game_id) ?? 0) + s.duration)
      total += s.duration
    }
    const perGame = await Promise.all(
      Array.from(perGameMap.entries()).map(async ([gameId, seconds]) => {
        const game = await this.db.getGame(gameId as GameID)
        return { gameId, gameName: game?.name ?? 'Unknown', seconds }
      })
    )
    const topPlayed = [...perGame].sort((a, b) => b.seconds - a.seconds).slice(0, 10)
    const avg = sessions.length > 0 ? total / sessions.length : 0
    return {
      totalPlaytimeSeconds: total,
      perGame,
      topPlayed,
      averageSessionMinutes: Math.round(avg / 60),
      totalSessions: sessions.length,
    }
  }

  async getCollectionStats(): Promise<CollectionStats> {
    const games = await this.db.getAllGames()
    const countResult = await this.db.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM games WHERE installed = 1'
    )
    const installed = countResult[0]?.count ?? 0
    const bySource: Record<string, number> = {}
    for (const g of games) {
      bySource[g.sourceId] = (bySource[g.sourceId] ?? 0) + 1
    }
    return {
      totalGames: games.length,
      installedGames: installed,
      bySource,
      totalSizeBytes: 0,
      bySourceSize: {},
    }
  }
}
