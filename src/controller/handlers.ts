import type { Game } from '../domain/models'
import type { DatabaseService } from '../services/database'
import type { Launcher } from '../services/launcher'
import type { ControllerDeps } from './types'
import { detectCompat } from '../domain/compat/detector'
import { findExecutable } from './executable-scanner'

export function buildImportHandler(db: DatabaseService, refresh: () => Promise<void>, win: ControllerDeps['window']) {
  return async (path: string): Promise<void> => {
    try {
      const { GLib } = imports.gi
      const folderName = path.split('/').filter(Boolean).pop() ?? 'Unknown'
      const id = `imported-${GLib.uuid_string_random()}`
      const game: Game = {
        id, name: folderName, sourceId: 'imported', sourceGameId: id,
        url: '', description: '', size: '', sizeBytes: 0, lastUpdated: new Date().toISOString(),
        downloadType: 'direct', imageUrl: undefined, tags: [],
      }
      await db.insertGame(game)
      await refresh()
      win.showToast(`Imported: ${folderName}`)
    } catch (e: unknown) {
      win.showToast(`Import failed: ${e instanceof Error ? e.message : String(e)}`, 'high')
    }
  }
}

export function buildPlayHandler(db: DatabaseService, launcher: Launcher, win: ControllerDeps['window']) {
  return async (gameId: string): Promise<void> => {
    try {
      const game = await db.getGame(gameId)
      const g = game as Game & { installPath?: string }
      if (!g) { win.showToast('Game not found in database', 'high'); return }
      if (!g.installPath) { win.showToast('Game has no install path. Import or install first.', 'high'); return }
      const { path, candidates } = findExecutable(g.installPath)
      if (candidates.length === 0) { win.showToast('No executable found in install path', 'high'); return }
      const profile = detectCompat([], g.name)
      const result = await launcher.launch(path, profile, gameId)
      win.showToast(result.success ? `Launched: ${g.name}` : (result.errorMessage ?? 'Launch failed'))
    } catch (e: unknown) {
      win.showToast(`Launch error: ${e instanceof Error ? e.message : String(e)}`, 'high')
    }
  }
}

export function buildRemoveHandler(db: DatabaseService, refresh: () => Promise<void>, win: ControllerDeps['window']) {
  return async (gameId: string): Promise<void> => {
    try {
      const game = await db.getGame(gameId)
      if (!game) return
      await db.execute('DELETE FROM games WHERE id = //1', [gameId])
      await refresh()
      win.showToast(`Removed: ${game.name}`)
    } catch (e: unknown) {
      win.showToast(`Remove failed: ${e instanceof Error ? e.message : String(e)}`, 'high')
    }
  }
}
