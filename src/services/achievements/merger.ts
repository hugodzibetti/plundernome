import type { Achievement, AchievementSet } from '../../domain/achievements/types'

export class AchievementsMerger {
  merge(local: AchievementSet, steam: Achievement[], isSteamGame: boolean): AchievementSet {
    const steamMap = new Map<string, Achievement>()
    for (const a of steam) {
      const key = a.steamApiName ?? a.name
      steamMap.set(key, a)
    }

    const merged = new Map<string, Achievement>()

    for (const a of local.achievements) {
      const steamKey = a.steamApiName ?? a.name
      const steamMatch = steamMap.get(steamKey)
      if (isSteamGame && steamMatch) {
        merged.set(steamKey, {
          ...a,
          unlocked: steamMatch.unlocked,
          unlockedAt: steamMatch.unlockedAt ?? a.unlockedAt,
          description: steamMatch.description ?? a.description,
          iconUrl: steamMatch.iconUrl ?? a.iconUrl,
          source: 'steam',
          steamApiName: steamMatch.steamApiName,
        })
      } else {
        merged.set(steamKey, a)
      }
    }

    for (const a of steam) {
      const key = a.steamApiName ?? a.name
      if (!merged.has(key)) {
        merged.set(key, a)
      }
    }

    const achievements = Array.from(merged.values())
    const unlocked = achievements.filter(a => a.unlocked).length

    return {
      gameId: local.gameId,
      achievements,
      total: achievements.length,
      unlocked,
    }
  }
}
