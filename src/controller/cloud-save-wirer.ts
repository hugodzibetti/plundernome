import type { ILibraryView, IWindow } from './view-interfaces'
import type { CloudSaveService } from '../services/cloud-save'

export function wireCloudSave(
  saveService: CloudSaveService,
  libraryView: ILibraryView,
  window: IWindow,
): void {
  libraryView.onBackupSave(async (gameId: string) => {
    window.showToast('Backing up saves...')
    const manifest = await saveService.backup(gameId)
    if (manifest) {
      window.showToast(`Backed up ${manifest.saves.length} files`)
    } else {
      window.showToast('Backup failed', 'high')
    }
  })

  libraryView.onRestoreSave(async (gameId: string) => {
    const manifests = await saveService.listSaves(gameId)
    if (manifests.length === 0) {
      window.showToast('No saves found for this game', 'high')
      return
    }
    window.showToast('Restoring saves...')
    const ok = await saveService.restore(manifests[0]!)
    if (ok) {
      window.showToast('Saves restored')
    } else {
      window.showToast('Restore failed', 'high')
    }
  })
}
