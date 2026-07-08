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
