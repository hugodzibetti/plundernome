import type { InstallResult } from '../types'

export interface WineVersion {
  id: string
  name: string
  type: 'wine' | 'proton' | 'ge-proton'
  version: string
  downloadUrl: string
  sizeBytes: number
  installed: boolean
  installPath?: string
}

export interface IWineManager {
  listAvailableVersions(): Promise<WineVersion[]>
  installVersion(version: WineVersion): Promise<InstallResult>
  removeVersion(versionId: string): Promise<InstallResult>
  getInstalledVersions(): Promise<WineVersion[]>
  setDefaultVersion(versionId: string): Promise<void>
  getDefaultVersion(): Promise<WineVersion | null>
}

export interface INotificationService {
  show(title: string, body: string, urgency?: 'low' | 'normal' | 'critical'): void
  showDownloadComplete(gameName: string, onLaunch?: () => void, onShow?: () => void): void
  showDownloadCompleteWithActions(gameId: string, gameName: string, actions: { label: string; callback: () => void }[]): void
  addAction(label: string, callback: () => void): void
  showError(title: string, message: string): void
}
