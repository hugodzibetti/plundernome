export interface ISteamService {
  scanLibrary(): Promise<import('../../domain/steam/types').SteamLibraryFolder[]>
  importApp(gameId: string, appId: number): Promise<void>
  createShortcut(shortcut: import('../../domain/steam/types').SteamShortcut): Promise<boolean>
  removeShortcut(appId: number): Promise<boolean>
  fetchAchievements(appId: number): Promise<import('../../domain/achievements/types').Achievement[]>
}
