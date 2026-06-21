import type { GameID } from '../domain/models'

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

export interface SourceHealth {
  sourceId: string
  status: 'up' | 'slow' | 'down'
  latencyMs: number
  lastChecked: string
  consecutiveTimeouts: number
}

export type { IDatabaseService, GameRow, PlaySession, GameConfig, IDependencyInstaller, DependencyInfo, InstallResult } from './database-types'
export type { ILauncher, LaunchResult } from './launcher-types'
export type { IHttpService } from './http-types'
export type { ITorrentService, TorrentClientInfo } from './torrent-types'
export type { IMetadataService } from './metadata-types'
export type { IEmulatorDetector, IROMScanner, IEmulatorLauncher, IBIOSDetector } from './emulator-types'
export type { ICloudSaveService } from './cloud-save-types'
export type { IAchievementService } from './achievement-types'
export type { ISteamService } from './steam-types'
export type { IWineManager, WineVersion, INotificationService } from './wine-types'
export type { IExtractorService, ExtractProgressFn, ExtractResult } from './extract-types'
