import type { Game, CompatProfile, Download } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import type { SyncPeer } from '../services/sync-service'
import type { LogEntry, LogFilter } from '../services/database'
import type { SourceHealth } from '../services/types'
import type { EnrichedMetadata } from '../services/metadata-provider'

export interface IHomeView {
  setContinuePlaying(games: Game[]): void
  setRecentlyAdded(games: Game[]): void
  setTrending(games: Game[]): void
  onDownloadGame(cb: (gameId: string) => void): void
  onNavigate(viewId: string, cb: () => void): void
}

export interface ICatalogView {
  setGames(games: Game[]): void
  focusSearch(): void
  closeSearch(): boolean
  onDownloadGame(cb: (gameId: string) => void): void
  setEnrichedMetadata(gameId: string, meta: EnrichedMetadata): void
  setLoading(loading: boolean): void
  showError(message: string): void
  onOpenSettings(cb: () => void): void
}

export interface ILibraryEntry {
  game: Game & { installPath?: string }
  profile: CompatProfile
  playtime?: number
  launchOptions?: { env: Record<string, string>; args: string }
  protonRating?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'borked' | 'pending'
}

export interface ILibraryView {
  setGames(entries: ILibraryEntry[]): void
  onPlayGame(cb: (gameId: string) => void): void
  onRemoveGame(cb: (gameId: string) => void): void
  onLaunchOptions(cb: (gameId: string) => void): void
  onOpenCatalog(cb: () => void): void
}

export interface EmulatorDetectResult {
  platformId: string
  binaryPath: string
  version?: string
  source: string
}

export interface ScannedROM {
  id: string
  path: string
  name: string
  platformId: string
  sizeBytes: number
  lastModified: string
}

export interface IEmulatorView {
  setPlatforms(platforms: EmulatorDetectResult[]): void
  setROMs(roms: ScannedROM[]): void
  setScanProgress(current: number, total: number): void
  onScanROMS(cb: (folderPath: string) => void): void
  onLaunchROM(cb: (romId: string) => void): void
  onOpenSettings(cb: () => void): void
}

export interface IDownloadsView {
  addDownload(download: Download): void
  updateDownload(download: Download): void
  removeDownload(downloadId: string): void
  onQueueAction(cb: (action: string, downloadId: string) => void): void
  onRetryDownload(cb: (downloadId: string) => void): void
  clearCompletedDownloads(): void
  onBrowseCatalog(cb: () => void): void
}

export interface ISettingsSourcesView {
  onReloadSources(cb: () => void): void
  onAddSource(cb: (path: string) => void): void
  onToggleSource(cb: (sourceId: string, enabled: boolean) => void): void
  setUserSources(sources: Array<{ id: string; path: string; enabled: boolean }>): void
}

export interface ISettingsBackupView {
  onExportLibrary(cb: (path: string) => void): void
  onImportLibrary(cb: (path: string) => void): void
  setBackupStatus(text: string): void
}

export interface ISettingsView {
  addSources(sources: SourceDefinition[]): void
  onSteamImport(cb: () => void): void
  onHeroicImport(cb: () => void): void
  onLANSyncToggle(cb: (enabled: boolean) => void): void
  setPeers(peers: SyncPeer[]): void
  onSyncWithPeer(cb: (peer: SyncPeer) => void): void
  onExportToPeer(cb: (peer: SyncPeer) => void): void
  setLogEntries(entries: LogEntry[]): void
  setLogGameIds(ids: string[]): void
  onRefreshLogs(cb: (filter: LogFilter) => void): void
  updateSourceHealth(sourceId: string, health: SourceHealth): void
  getSourcesView(): ISettingsSourcesView
  getBackupView(): ISettingsBackupView
}

export interface IWindow {
  showToast(title: string, priority?: 'normal' | 'high', timeout?: number): void
  showActionToast(title: string, actionLabel: string, onAction: () => void): void
  showToastWithAction(title: string, actionLabel: string, onAction: () => void): void
  getHomeView(): IHomeView
  getCatalogView(): ICatalogView
  getLibraryView(): ILibraryView
  getDownloadsView(): IDownloadsView
  getSettingsView(): ISettingsView
  navigateTo(viewId: string): void
}
