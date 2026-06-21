import type { Game, CompatProfile, Download } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';
import type { SyncPeer } from '../services/sync-service';
import type { LogEntry, LogFilter } from '../services/database';
import type { SourceHealth } from '../services/types';

export interface ICatalogView {
  setGames(games: Game[]): void;
  setSort(key: string): void;
  focusSearch(): void;
  closeSearch(): boolean;
  setViewMode(mode: 'grid' | 'list'): void;
  toggleViewMode(): 'grid' | 'list';
  onDownloadGame(cb: (gameId: string) => void): void;
  onToggleWishlist(cb: (gameId: string, wishlisted: boolean) => void): void;
  setLoading(loading: boolean): void;
  showError(message: string): void;
  onOpenSettings(cb: () => void): void;
}

export interface ILibraryEntry {
  game: Game & { installPath?: string };
  profile: CompatProfile;
  playtime?: number;
  launchOptions?: { env: Record<string, string>; args: string };
  protonRating?: 'platinum' | 'gold' | 'silver' | 'bronze' | 'borked' | 'pending';
}

export interface ILibraryView {
  setGames(entries: ILibraryEntry[]): void;
  showImportDialog(): void;
  onImportFolder(cb: (path: string) => void): void;
  onPlayGame(cb: (gameId: string) => void): void;
  onRemoveGame(cb: (gameId: string) => void): void;
  onLaunchOptions(cb: (gameId: string) => void): void;
  onSteamImport(cb: () => void): void;
  getSelectedGameId(): string | null;
  triggerPlay(gameId: string): void;
  triggerRemove(gameId: string): void;
  refreshLibrary(): void;
  onRefreshLibrary(cb: () => void): void;
  onOpenCatalog(cb: () => void): void;
  onAddToAppMenu(cb: (gameId: string) => void): void;
  onRemoveFromAppMenu(cb: (gameId: string) => void): void;
  setSortKey(key: string): void;
  onSortChanged(cb: (key: string) => void): void;
  getPlaytimeSummary(): string;
}

export interface IDownloadsView {
  addDownload(download: Download): void;
  updateDownload(download: Download): void;
  removeDownload(downloadId: string): void;
  onQueueAction(cb: (action: string, downloadId: string) => void): void;
  onRetryDownload(cb: (downloadId: string) => void): void;
  clearCompletedDownloads(): void;
  onBrowseCatalog(cb: () => void): void;
}

export interface ISettingsSourcesView {
  onReloadSources(cb: () => void): void;
  onAddSource(cb: (path: string) => void): void;
  onToggleSource(cb: (sourceId: string, enabled: boolean) => void): void;
  setUserSources(sources: Array<{ id: string; path: string; enabled: boolean }>): void;
}

export interface ISettingsBackupView {
  onExportLibrary(cb: (path: string) => void): void;
  onImportLibrary(cb: (path: string) => void): void;
  setBackupStatus(text: string): void;
}

export interface ISettingsView {
  addSources(sources: SourceDefinition[]): void;
  onSteamImport(cb: () => void): void;
  onLANSyncToggle(cb: (enabled: boolean) => void): void;
  setPeers(peers: SyncPeer[]): void;
  onSyncWithPeer(cb: (peer: SyncPeer) => void): void;
  onExportToPeer(cb: (peer: SyncPeer) => void): void;
  setLogEntries(entries: LogEntry[]): void;
  setLogGameIds(ids: string[]): void;
  onRefreshLogs(cb: (filter: LogFilter) => void): void;
  updateSourceHealth(sourceId: string, health: SourceHealth): void;
  getSourcesView(): ISettingsSourcesView;
  getBackupView(): ISettingsBackupView;
}

export interface IWindowWithBuilders {
  buildCatalogViewToggle(): unknown;
  buildLibraryImportBtn(): unknown;
}

export interface IWindow {
  showToast(title: string, priority?: 'normal' | 'high', timeout?: number): void;
  showActionToast(title: string, actionLabel: string, onAction: () => void): void;
  showToastWithAction(title: string, actionLabel: string, onAction: () => void): void;
  getCatalogView(): ICatalogView;
  getLibraryView(): ILibraryView;
  getDownloadsView(): IDownloadsView;
  getSettingsView(): ISettingsView;
  navigateTo(viewId: string): void;
}
