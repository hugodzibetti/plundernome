import type { Game } from '../domain/models'
import type { PipelineOrchestrator } from '../services'
import type { IWindow } from './view-interfaces'

export function buildDownloadHandler(
  getGames: () => Game[],
  pipeline: PipelineOrchestrator,
  win: IWindow,
  downloadDir: string,
  getMirrors?: (sourceId: string) => string[]
): (gameId: string) => void {
  return async (gameId: string) => {
    const game = getGames().find(g => g.id === gameId)
    if (!game) {
      win.showToast('Game not found', 'high')
      return
    }
    const { GLib } = imports.gi
    GLib.mkdir_with_parents(downloadDir, 0o755)
    const sanitized = game.name.replace(/[^a-zA-Z0-9_-]/g, '_')
    const ext = game.downloadType === 'torrent' ? '.torrent' : '.zip'
    const downloadPath = `${downloadDir}/${sanitized}${ext}`
    const mirrors = getMirrors?.(game.sourceId)
    pipeline.start(game, game.url, downloadPath, mirrors).catch(() => {})
  }
}
