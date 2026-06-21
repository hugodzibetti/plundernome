import type { GameID, Game, CompatProfile } from '../domain/models'
export interface HttpOptions {
  method?: 'GET' | 'HEAD'
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
  userAgent?: string
}

export interface HttpResponse {
  status: number
  body: string
  headers: Record<string, string>
}

export interface DownloadOptions {
  url: string
  destinationPath: string
  offset?: number
  downloadId?: string
  expectedTotalBytes?: number
  expectedExtractedBytes?: number
  onProgress?: (bytesDownloaded: number, totalBytes: number) => void
  onSpeed?: (bytesPerSec: number) => void
  onOffsetSave?: (offset: number) => void
}

export interface DownloadState {
  gameId: string
  offset: number
  totalBytes: number
  status: 'downloading' | 'paused' | 'completed' | 'failed'
}

export interface DownloadResult {
  success: boolean
  bytesDownloaded: number
  totalBytes: number
  elapsedMs: number
  errorMessage?: string
}

export interface IDatabaseService {
  connect(dbPath: string): Promise<void>
  disconnect(): Promise<void>
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<number>
  migrate(): Promise<void>
  setWishlisted(gameId: GameID, wishlisted: boolean): Promise<void>
  getWishlisted(): Promise<GameID[]>
}

export interface GameRow {
  id: string
  name: string
  source_id: string
  source_game_id: string
  url: string
  description: string
  size_bytes: number
  last_updated: string
  download_type: string
  image_url: string | null
  installed: boolean
  install_path: string | null
  created_at: string
  checksum: string | null
  resume_offset: number
  wishlisted?: boolean
}

export interface PlaySession {
  id: string
  game_id: string
  session_start: string
  session_end: string | null
}

export interface GameConfig {
  env: Record<string, string>
  args: string
}

export interface IDependencyInstaller {
  install(dep: DependencyInfo, prefixPath: string): Promise<InstallResult>
  detect(dep: DependencyInfo): Promise<boolean>
}

export interface DependencyInfo {
  id: string
  name: string
  type: string
  installerPath?: string
  downloadUrl?: string
  winetricksVerb?: string
}

export interface InstallResult {
  success: boolean
  action: string
  errorMessage?: string
}

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

export interface IHttpService {
  fetch(url: string, options?: HttpOptions): Promise<HttpResponse>
  download(options: DownloadOptions): Promise<DownloadResult>
}

export interface ITorrentService {
  addMagnet(magnetUri: string, downloadDir: string): Promise<string>
  addTorrent(torrentPath: string, downloadDir: string): Promise<string>
  waitForCompletion(torrentId: string, onProgress?: (pct: number) => void): Promise<boolean>
  remove(torrentId: string): Promise<void>
  readonly availableClients: TorrentClientInfo[]
  readonly currentClient: TorrentClientInfo | null
  autoSpawn(): Promise<boolean>
}

export interface TorrentClientInfo {
  name: string
  binary: string
  daemonBinary: string
  cliBinary: string
  detect(): boolean
  spawn(): Promise<boolean>
  addMagnet(magnet: string, downloadDir: string): Promise<boolean>
  addTorrent(url: string, downloadDir: string): Promise<boolean>
}

export interface SourceHealth {
  sourceId: string
  status: 'up' | 'slow' | 'down'
  latencyMs: number
  lastChecked: string
  consecutiveTimeouts: number
}
export type { IWineManager, WineVersion, INotificationService } from './wine-types'
export type { IExtractorService, ExtractProgressFn, ExtractResult } from './extract-types'
