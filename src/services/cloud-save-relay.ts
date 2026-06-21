import type { SaveManifest } from '../domain/cloud-save/types'
import type { Friend } from '../domain/social/types'

const Soup = imports.gi.Soup

export class CloudSaveRelayClient {
  private session: SoupSession

  constructor(
    private baseUrl: string,
    private deviceId: string,
    private token: string,
  ) {
    this.session = new Soup.Session()
    this.session.timeout = 30
  }

  private async request(method: string, path: string, body?: string): Promise<{ status: number; body: string }> {
    const uri = `${this.baseUrl.replace(/\/+$/, '')}${path}`
    const msg = new Soup.Message({ method, uri })
    msg.request_headers.append('Authorization', `Bearer ${this.token}`)
    if (body) {
      msg.request_headers.append('Content-Type', 'application/json')
      const enc = new TextEncoder().encode(body)
      msg.set_request('application/json', 2, enc)
    }
    this.session.send(msg, null)
    const respBody = new TextDecoder().decode(msg.response_body.flatten())
    return { status: msg.status_code, body: respBody }
  }

  async upload(manifest: SaveManifest, filePath: string): Promise<boolean> {
    const Gio = imports.gi.Gio
    const f = Gio.File.new_for_path(filePath)
    if (!f.query_exists(null)) return false
    const info = f.query_info('standard::*', Gio.FileQueryInfoFlags.NONE, null)
    const bytes = f.load_contents(null)[1] as Uint8Array
    const GLib = imports.gi.GLib
    const b64 = (GLib as any).base64_encode(bytes)
    const body = JSON.stringify({ gameId: manifest.gameId, fileData: b64 })
    const { status } = await this.request('POST', '/api/saves/upload', body)
    return status === 200
  }

  async listSaves(gameId: string): Promise<SaveManifest[]> {
    const { status, body } = await this.request('GET', `/api/saves/list?deviceId=${this.deviceId}&gameId=${encodeURIComponent(gameId)}`)
    if (status !== 200) return []
    return JSON.parse(body) as SaveManifest[]
  }

  async download(saveId: string, destPath: string): Promise<boolean> {
    const Gio = imports.gi.Gio
    const uri = `${this.baseUrl.replace(/\/+$/, '')}/api/saves/download?saveId=${saveId}&deviceId=${this.deviceId}`
    const msg = new Soup.Message({ method: 'GET', uri })
    msg.request_headers.append('Authorization', `Bearer ${this.token}`)
    this.session.send(msg, null)
    if (msg.status_code !== 200) return false
    const bytes = msg.response_body.flatten()
    const f = Gio.File.new_for_path(destPath)
    const parent = f.get_parent()
    if (parent && !parent.query_exists(null)) parent.make_directory_with_parents(null)
    const out = f.replace(null, false, Gio.FileCreateFlags.NONE, null)
    out.write(bytes, null)
    out.close(null)
    return true
  }

  async sendFriendRequest(targetDeviceId: string): Promise<boolean> {
    const { status } = await this.request('POST', '/api/friends/request', JSON.stringify({ toDeviceId: targetDeviceId }))
    return status === 200
  }

  async respondToFriendRequest(requestId: string, accept: boolean): Promise<boolean> {
    const { status } = await this.request('POST', '/api/friends/respond', JSON.stringify({ requestId, accept }))
    return status === 200
  }

  async getFriends(): Promise<Friend[]> {
    const { status, body } = await this.request('GET', `/api/friends/list?deviceId=${this.deviceId}`)
    if (status !== 200) return []
    return JSON.parse(body) as Friend[]
  }

  async updatePresence(status: string, currentGame?: string): Promise<void> {
    await this.request('POST', '/api/presence', JSON.stringify({ deviceId: this.deviceId, status, currentGame }))
  }
}
