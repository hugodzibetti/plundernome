import type { Game } from '../domain/models'
import type { DatabaseService } from './database/database'
import type { ILANDiscovery } from './lan-discovery'

export interface SyncPeer {
  name: string
  address: string
  port: number
}

export class SyncService {
  private discovery: ILANDiscovery | null = null
  private httpServer: SoupServer | null = null
  private peers: SyncPeer[] = []
  private onPeersChanged: (() => void) | null = null

  constructor(private db: DatabaseService) {}

  async startLANDiscovery(port = 42070): Promise<void> {
    const { Soup } = imports.gi

    this.httpServer = new Soup.Server()
    this.httpServer.add_handler('/api/library', (server, msg, path, query) => {
      this.handleLibraryRequest(msg).catch(() => {})
    })
    this.httpServer.add_handler('/api/library/import', (server, msg, path, query) => {
      this.handleLibraryImport(msg).catch(() => {})
    })
    this.httpServer.listen_local(port, Soup.ServerListenOptions.IPV4_ONLY)

    const { LANDiscovery } = await import('./lan-discovery')
    this.discovery = new LANDiscovery()
    this.discovery.startBroadcasting(port, (peer) => {
      if (!this.peers.find(p => p.address === peer.address && p.port === peer.port)) {
        this.peers.push(peer)
        this.onPeersChanged?.()
      }
    })
  }

  stopLANDiscovery(): void {
    this.discovery?.stopBroadcasting()
    if (this.httpServer) {
      this.httpServer.disconnect()
      this.httpServer = null
    }
    this.discovery = null
    this.peers = []
  }

  onPeersUpdate(cb: () => void): void {
    this.onPeersChanged = cb
  }

  private async handleLibraryRequest(msg: SoupMessage): Promise<void> {
    const { Soup } = imports.gi
    const json = await this.exportLibrary()
    const bytes = new TextEncoder().encode(json)
    msg.set_response('application/json', Soup.MemoryUse.COPY, bytes)
  }

  private async handleLibraryImport(msg: SoupMessage): Promise<void> {
    const MAX_BODY = 10 * 1024 * 1024
    const body = msg.request_body.read()
    if (body.byteLength > MAX_BODY) {
      msg.set_status(413)
      return
    }
    const json = new TextDecoder().decode(body)
    await this.importLibrary(json)
    msg.set_status(200)
  }

  async syncWithPeer(peer: SyncPeer): Promise<number> {
    try {
      const { Soup } = imports.gi
      const session = new Soup.Session()
      const msg = new Soup.Message({ method: 'GET', uri: `http://${peer.address}:${peer.port}/api/library` })
      session.send(msg, null)
      const body = msg.response_body.flatten()
      const json = new TextDecoder().decode(body)
      return this.importLibrary(json)
    } catch {
      return 0
    }
  }

  async exportToPeer(peer: SyncPeer): Promise<boolean> {
    const json = await this.exportLibrary()
    const { Soup } = imports.gi
    const session = new Soup.Session()
    const msg = new Soup.Message({ method: 'POST', uri: `http://${peer.address}:${peer.port}/api/library/import` })
    const bytes = new TextEncoder().encode(json)
    msg.set_request('application/json', Soup.MemoryUse.COPY, bytes)
    session.send(msg, null)
    return msg.status_code === 200
  }

  getPeers(): SyncPeer[] {
    return this.peers
  }

  async exportLibrary(): Promise<string> {
    const games = await this.db.getAllGames()
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), games }, null, 2)
  }

  async importLibrary(json: string): Promise<number> {
    const data = JSON.parse(json)
    if (data.version !== 1) throw new Error('Unsupported sync version')
    let count = 0
    for (const game of data.games as Game[]) {
      await this.db.insertGame(game)
      count++
    }
    return count
  }
}
