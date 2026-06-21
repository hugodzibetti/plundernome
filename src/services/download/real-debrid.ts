import type { HttpService } from '../http'

export class RealDebridService {
  private session: SoupSession

  constructor(private http: HttpService, private apiKey: string) {
    const Soup = imports.gi.Soup
    this.session = new Soup.Session()
  }

  private decode(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes)
  }

  private async req(method: string, path: string, body?: string): Promise<{ status: number; body: string }> {
    const Soup = imports.gi.Soup
    const msg = new Soup.Message({ method, uri: `https://api.real-debrid.com/rest/1.0${path}` })
    msg.request_headers.append('Authorization', `Bearer ${this.apiKey}`)
    if (body) {
      msg.request_headers.append('Content-Type', 'application/x-www-form-urlencoded')
      msg.set_request('application/x-www-form-urlencoded', Soup.MemoryUse.COPY, new TextEncoder().encode(body))
    }
    const status = this.session.send(msg, null)
    return { status, body: this.decode(msg.response_body.flatten()) }
  }

  async unrestrict(link: string): Promise<string | null> {
    const { status, body } = await this.req('POST', '/unrestrict/link', `link=${encodeURIComponent(link)}`)
    if (status !== 200) return null
    try { return JSON.parse(body).download ?? null } catch { return null }
  }

  async checkHealth(): Promise<boolean> {
    const { status } = await this.req('GET', '/time')
    return status === 200
  }

  async getTorrentInfo(id: string): Promise<{ progress: number; status: string; links: string[] } | null> {
    const { status, body } = await this.req('GET', `/torrents/info/${id}`)
    if (status !== 200) return null
    try {
      const d = JSON.parse(body)
      return { progress: d.progress ?? 0, status: d.status ?? '', links: d.links ?? [] }
    } catch { return null }
  }

  async addMagnet(magnet: string): Promise<string | null> {
    const { status, body } = await this.req('POST', '/torrents/addMagnet', `magnet=${encodeURIComponent(magnet)}`)
    if (status !== 200) return null
    try { return JSON.parse(body).id ?? null } catch { return null }
  }
}
