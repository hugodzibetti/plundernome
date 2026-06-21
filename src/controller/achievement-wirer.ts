import type { AchievementsScanner } from '../services/achievements/scanner'
import type { AchievementsMerger } from '../services/achievements/merger'
import type { DatabaseService } from '../services/database'
import type { ILibraryView, IWindow } from './view-interfaces'
import type { AchievementSet } from '../domain/achievements/types'

export function wireAchievements(
  scanner: AchievementsScanner,
  merger: AchievementsMerger,
  db: DatabaseService,
  libraryView: ILibraryView,
  window: IWindow,
): void {
  libraryView.onAchievements(async (gameId: string) => {
    const set = await getAchievementSet(db, gameId)
    if (!set || set.achievements.length === 0) {
      window.showToast('No achievements found for this game', 'high')
      return
    }
    window.showToast(`${set.unlocked}/${set.total} achievements unlocked`)
  })

  libraryView.onGameLaunched(async (gameId: string) => {
    const rows = await db.query<{ install_path: string; source_id: string; source_game_id: string }>(
      'SELECT install_path, source_id, source_game_id FROM games WHERE id = //1', [gameId]
    )
    const row = rows[0]
    if (!row || !row.install_path) return
    const { install_path, source_id, source_game_id } = row
    const before = await db.getAchievements(gameId)
    const scanned = await scanner.scanGame(gameId, install_path)
    const isSteam = source_id === 'steam'
    const steamId = isSteam ? source_game_id : ''
    const merged = isSteam && steamId
      ? merger.merge(scanned, [], true)
      : scanned

    const after = merged.achievements
    const newlyUnlocked = before
      ? after.filter(a => a.unlocked && !before.find(b => b.id === a.id)?.unlocked)
      : after.filter(a => a.unlocked)

    if (newlyUnlocked.length > 0) {
      window.showToast(`${newlyUnlocked.length} new achievement${newlyUnlocked.length > 1 ? 's' : ''} unlocked!`, 'high')
    }
  })
}

async function getAchievementSet(db: DatabaseService, gameId: string): Promise<AchievementSet | null> {
  const rows = await db.query<{
    id: string; game_id: string; name: string; description: string | null
    icon_url: string | null; unlocked: number; unlocked_at: string | null
    source: string; steam_api_name: string | null; hidden: number
  }>('SELECT * FROM game_achievements WHERE game_id = //1', [gameId])
  if (rows.length === 0) return null
  const achievements = rows.map(r => ({
    id: r.id,
    gameId: r.game_id,
    name: r.name,
    description: r.description ?? undefined,
    iconUrl: r.icon_url ?? undefined,
    unlocked: r.unlocked === 1,
    unlockedAt: r.unlocked_at ?? undefined,
    source: r.source as AchievementSet['achievements'][0]['source'],
    steamApiName: r.steam_api_name ?? undefined,
    hidden: r.hidden === 1,
  }))
  return {
    gameId,
    achievements,
    total: achievements.length,
    unlocked: achievements.filter(a => a.unlocked).length,
  }
}
