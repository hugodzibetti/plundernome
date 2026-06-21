import type { Achievement } from '../../domain/achievements/types'
import type { IHttpService } from '../types'

export class SteamAchievementsAPI {
  constructor(private readonly http: IHttpService) {}

  async fetchSteamAchievements(appId: number, steamId: string, apiKey: string): Promise<Achievement[]> {
    if (!apiKey || !steamId) return []
    const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appId}`
    try {
      const resp = await this.http.fetch(url, { retries: 2, timeoutMs: 10000 })
      if (resp.status !== 200) return []
      const data = JSON.parse(resp.body)
      const raw = data?.playerstats?.achievements ?? []
      return raw.map((a: Record<string, unknown>) => ({
        id: `steam-${a.apiname}`,
        gameId: String(appId),
        name: a.name as string ?? a.apiname as string,
        description: a.description as string | undefined,
        unlocked: a.achieved === 1,
        unlockedAt: a.unlocktime ? new Date((a.unlocktime as number) * 1000).toISOString() : undefined,
        source: 'steam' as const,
        steamApiName: a.apiname as string,
        hidden: false,
      }))
    } catch {
      return []
    }
  }

  async fetchGlobalStats(appId: number, apiKey: string): Promise<Record<string, { pct: number }>> {
    if (!apiKey) return {}
    const url = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?key=${apiKey}&gameid=${appId}`
    try {
      const resp = await this.http.fetch(url, { retries: 2, timeoutMs: 10000 })
      if (resp.status !== 200) return {}
      const data = JSON.parse(resp.body)
      const raw = data?.achievementpercentages?.achievements ?? []
      const result: Record<string, { pct: number }> = {}
      for (const a of raw) {
        result[a.name as string] = { pct: a.percent as number }
      }
      return result
    } catch {
      return {}
    }
  }
}
