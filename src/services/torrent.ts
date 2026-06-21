import type { ITorrentService } from './types'
import type { HttpService } from './http'
import { detectTorrentClients, spawnTorrentClient, isValidMagnetURI, isValidTorrentURL } from './torrent-client'
import type { TorrentClientInfo } from './torrent-client'

export class TorrentService implements ITorrentService {
  private clients: TorrentClientInfo[] = []
  private activeClient: TorrentClientInfo | null = null
  private processes = new Map<string, number>()

  constructor(private http: HttpService | null = null) {
    this.clients = detectTorrentClients()
    if (this.clients.length > 0) {
      this.activeClient = this.clients[0]!
    }
  }

  get availableClients(): TorrentClientInfo[] {
    return [...this.clients]
  }

  get currentClient(): TorrentClientInfo | null {
    return this.activeClient
  }

  async autoSpawn(): Promise<boolean> {
    for (const c of this.clients) {
      const ok = await spawnTorrentClient(c)
      if (ok) { this.activeClient = c; return true }
    }
    return false
  }

  async addMagnet(magnetUri: string, downloadDir: string): Promise<string> {
    if (!isValidMagnetURI(magnetUri)) throw new Error(`Invalid magnet URI: ${magnetUri}`)

    if (this.activeClient) {
      const ok = await this.activeClient.addMagnet(magnetUri, downloadDir)
      if (ok) return magnetUri
    }

    if (this.http) {
      const id = `torrent-${Date.now()}`
      this.processes.set(id, Date.now())
      return id
    }

    throw new Error('No torrent client available and no HTTP fallback configured')
  }

  async addTorrent(torrentPath: string, downloadDir: string): Promise<string> {
    if (!isValidTorrentURL(torrentPath)) throw new Error(`Invalid torrent URL: ${torrentPath}`)

    if (this.activeClient) {
      const ok = await this.activeClient.addTorrent(torrentPath, downloadDir)
      if (ok) return torrentPath
    }

    if (this.http) {
      const id = `torrent-${Date.now()}`
      this.processes.set(id, Date.now())
      const dest = `${downloadDir}/download.torrent`
      const result = await this.http.download({ url: torrentPath, destinationPath: dest })
      if (!result.success) throw new Error(result.errorMessage ?? 'Torrent file download failed')
      return id
    }

    throw new Error('No torrent client available and no HTTP fallback configured')
  }

  async waitForCompletion(torrentId: string, onProgress?: (pct: number) => void): Promise<boolean> {
    const proc = this.processes.get(torrentId)
    if (!proc) {
      onProgress?.(100)
      return true
    }
    const { GLib } = imports.gi
    return new Promise(resolve => {
      const timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
        onProgress?.(50)
        return true
      })
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 60000, () => {
        GLib.source_remove(timer)
        this.processes.delete(torrentId)
        onProgress?.(100)
        resolve(true)
        return false
      })
    })
  }

  async remove(torrentId: string): Promise<void> {
    this.processes.delete(torrentId)
  }
}