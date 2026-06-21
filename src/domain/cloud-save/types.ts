export interface SaveManifest {
  gameId: string
  gameName: string
  saves: SaveFile[]
  backupTime: string
  tool: 'ludusavi' | 'manual'
}

export interface SaveFile {
  relativePath: string
  absolutePath: string
  sizeBytes: number
  lastModified: string
}

export interface CloudSaveConfig {
  ludusaviEnabled: boolean
  webdavUrl?: string
  webdavUser?: string
  webdavPass?: string
  relayUrl?: string
  autoSync: boolean
}
