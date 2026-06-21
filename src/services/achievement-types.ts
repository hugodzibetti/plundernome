export interface IAchievementService {
  scanGame(gameId: string, installPath: string): Promise<import('../domain/achievements/types').AchievementSet>
  fetchSteamAchievements(appId: number): Promise<import('../domain/achievements/types').Achievement[]>
  getAll(gameId: string): Promise<import('../domain/achievements/types').AchievementSet | null>
}
