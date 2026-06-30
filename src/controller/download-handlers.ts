import type { Game } from '../domain/models'
import type { PipelineOrchestrator } from '../services'
import type { IWindow } from './view-interfaces'
import type { IDebridService } from '../services/debrid-types'
import { resolveUrl } from '../services/debrid-resolver'

export function buildDownloadHandler(
  getGames: () => Game[],
  pipeline: PipelineOrchestrator,
  win: IWindow,
  downloadDir: string,
  getMirrors?: (sourceId: string) => string[],
  debrid?: IDebridService | null,
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
    const resolvedUrl = await resolveUrl(game.url, debrid ?? null)
    if (debrid && resolvedUrl !== game.url) {
      win.showToast('Link resolved via debrid')
    } else if (debrid && resolvedUrl === game.url) {
      win.showToast('Debrid failed — using direct link')
    }
    pipeline.start(game, resolvedUrl, downloadPath, mirrors).catch(() => {})
  }
}
