import type { Game, CompatProfile, GameID } from '../../domain/models'

export interface ILauncher {
  launch(executablePath: string, compatProfile: CompatProfile, gameId: GameID): Promise<LaunchResult>
  createDesktopEntry(game: Game, executablePath: string): Promise<void>
  removeDesktopEntry(gameId: GameID): Promise<void>
}

export interface LaunchResult {
  success: boolean
  pid?: number
  errorMessage?: string
}
