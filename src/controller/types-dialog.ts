import type { Game, GameID } from '../domain/models'

export interface IDialogService {
  showError(title: string, message: string): void
  showRetryWithMirrorDialog(
    title: string,
    message: string,
    mirrors: string[],
  ): Promise<string | null>
}

export interface ILaunchOptionsEditor {
  show(game: Game, options: { env: Record<string, string>; args: string }, onSave: (gameId: GameID, env: Record<string, string>, args: string) => void): void
}
