import type { Game } from '../domain/models'
import type { DatabaseService } from '../services/database/database'
import type { Launcher } from '../services/launcher/launcher'
import type { CloudSaveService } from '../services/cloud-save/cloud-save'
import type { ControllerDeps } from './types'
import { SettingsManager, GSETTINGS_KEYS } from '../services/gsettings'
import { detectCompat } from '../domain/compat/detector'
import { findExecutable } from './executable-scanner'
import type { ProtonDBRating } from '../services/proton/protondb'
import type { WineManager } from '../services/wine/wine-manager'
import { selectProtonVersion } from '../services/proton/proton-selector'

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

export function buildPlayHandler(
  db: DatabaseService,
  launcher: Launcher,
  win: ControllerDeps['window'],
  protonRatings?: Map<string, ProtonDBRating>,
  wineManager?: WineManager,
  cloudSave?: CloudSaveService | null,
) {
  return async (gameId: string): Promise<void> => {
    try {
      const game = await db.getGame(gameId)
      const g = game as Game & { installPath?: string }
      if (!g) { win.showToast('Game not found in database', 'high'); return }
      if (!g.installPath) { win.showToast('Game has no install path. Import or install first.', 'high'); return }
      const { path, candidates } = findExecutable(g.installPath)
      if (candidates.length === 0) { win.showToast('No executable found in install path', 'high'); return }
      const profile = detectCompat([], g.name)

      // ponytail: skip proton selection if no ratings/wineManager provided
      if (protonRatings && wineManager) {
        const rating = protonRatings.get(g.name) ?? null
        const available = await wineManager.getInstalledVersions()
        const { version, reason } = selectProtonVersion(rating, available)
        win.showToast(reason, 'normal', 3)
        if (version) {
          if (version.type === 'ge-proton' || version.type === 'proton') {
            profile.needsProton = true
            profile.needsWine = false
            const protonBin = version.installPath ? `${version.installPath}/proton` : undefined
            if (protonBin) profile.protonOverridePath = protonBin
          } else {
            profile.needsWine = true
            profile.needsProton = false
            profile.wineVersion = version.version
          }
        }
      }

      const result = await launcher.launch(path, profile, gameId)
      if (result.success && result.pid) {
        const { GLib } = imports.gi
        GLib.child_watch_add(result.pid, () => {
          if (cloudSave) {
            const s = new SettingsManager()
            if (s.getBool(GSETTINGS_KEYS.CLOUD_SAVE_ENABLED)) {
              win.showToast('Saving game data…', 'normal', 2)
              cloudSave.backup(gameId)
                .then((manifest) => {
                  if (manifest) {
                    return cloudSave.syncToWebdav(manifest)
                      .then((synced) => {
                        win.showToast(synced ? 'Game saved to cloud \u2713' : 'Backed up locally (WebDAV unavailable)')
                      })
                  }
                  return Promise.resolve()
                })
                .catch(() => {
                  win.showToast('Cloud save failed \u2014 data kept locally', 'high')
                })
            }
          }
        })
      }
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
