import type { ISettingsView, IWindow } from './view-interfaces'
import type { DatabaseService } from '../services/database/database'
import { SettingsManager } from '../services/gsettings'
import { loadUserSources } from './source-loader'
import { BackupRestoreService } from '../services/cloud-save/backup-restore'
import type { IDebridService } from '../services/download/debrid-types'
import type { CloudSaveService } from '../services/cloud-save/cloud-save'

export function wireSources(
  settingsView: ISettingsView,
  window: IWindow,
): void {
  const srcView = settingsView.getSourcesView()
  const refreshDisplay = (): void => {
    const user = loadUserSources()
    srcView.setUserSources(user.map(s => ({
      id: s.id, path: s.baseUrl, enabled: s.enabled,
    })))
  }
  refreshDisplay()
  srcView.onReloadSources(() => {
    refreshDisplay()
    window.showToast('Sources reloaded')
  })
  srcView.onAddSource((path: string) => {
    const { GLib, Gio } = imports.gi
    const homeDir = GLib.get_home_dir()
    const userDir = `${homeDir}/.config/plundernome/sources`
    GLib.mkdir_with_parents(userDir, 0o755)
    const srcFile = Gio.File.new_for_path(path)
    const fileName = srcFile.get_name()
    const input = srcFile.read(null)
    const bytes = input.read_bytes(1_048_576, null)
    input.close(null)
    const destFile = Gio.File.new_for_path(`${userDir}/${fileName}`)
    const output = destFile.replace(null, false, Gio.FileCreateFlags.NONE, null)
    output.write(bytes.toArray(), null)
    output.close(null)
    refreshDisplay()
    window.showToast(`Source added: ${fileName}`)
  })
  srcView.onToggleSource((sourceId: string, enabled: boolean) => {
    const settings = new SettingsManager()
    const enabledRaw = settings.getString('enabled-sources') ?? ''
    const ids = new Set(enabledRaw.split(',').map(s => s.trim()).filter(Boolean))
    if (enabled) ids.add(sourceId)
    else ids.delete(sourceId)
    settings.setString('enabled-sources', Array.from(ids).join(','))
  })
}

export function wireDebridTest(
  settingsView: ISettingsView,
  debrid: IDebridService | null,
  window: IWindow,
): void {
  settingsView.onTestDebrid(async () => {
    if (!debrid) {
      window.showToast('No debrid service configured', 'normal', 3)
      return false
    }
    const ok = await debrid.checkHealth()
    window.showToast(ok ? 'Debrid connected' : 'Debrid check failed', 'normal', 3)
    return ok
  })
}

export function wireWebdavTest(
  settingsView: ISettingsView,
  cloudSave: CloudSaveService | null,
  window: IWindow,
): void {
  settingsView.onTestWebdav(async () => {
    if (!cloudSave) {
      window.showToast('Cloud save service unavailable', 'normal', 3)
      return false
    }
    try {
      const ok = await cloudSave.checkWebdavConnection()
      window.showToast(ok ? 'WebDAV connected' : 'WebDAV connection failed', 'normal', 3)
      return ok
    } catch {
      window.showToast('WebDAV connection failed', 'high', 3)
      return false
    }
  })
}

export function wireBackup(
  settingsView: ISettingsView,
  db: DatabaseService,
  window: IWindow,
): void {
  const backupService = new BackupRestoreService(db)
  const backupView = settingsView.getBackupView()
  backupView.onExportLibrary(async (path: string) => {
    try {
      backupView.setBackupStatus('Exporting...')
      await backupService.exportToJson(path, (cur, total) => {
        backupView.setBackupStatus(`Exporting ${cur}/${total}`)
      })
      backupView.setBackupStatus('Export complete')
      window.showToast('Library exported')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      backupView.setBackupStatus(`Export failed: ${msg}`)
      window.showToast(`Export failed: ${msg}`, 'high')
    }
  })
  backupView.onImportLibrary(async (path: string) => {
    try {
      backupView.setBackupStatus('Importing...')
      await backupService.importFromJson(path, (cur, total) => {
        backupView.setBackupStatus(`Importing ${cur}/${total}`)
      })
      backupView.setBackupStatus('Import complete')
      window.showToast('Library imported')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      backupView.setBackupStatus(`Import failed: ${msg}`)
      window.showToast(`Import failed: ${msg}`, 'high')
    }
  })
}
