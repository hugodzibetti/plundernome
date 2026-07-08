import type { HttpService } from '../http/http'

export class PremiumizeService {
  private session: SoupSession
  private base = 'https://www.premiumize.me/api'

  constructor(private http: HttpService, private apiKey: string) {
    const Soup = imports.gi.Soup
    this.session = new Soup.Session()
  }

  private decode(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes)
  }

  private async req(method: string, path: string, body?: string): Promise<{ status: number; body: string }> {
    const Soup = imports.gi.Soup
    const msg = new Soup.Message({ method, uri: `${this.base}${path}` })
    msg.request_headers.append('Authorization', `Bearer ${this.apiKey}`)
    if (body) {
      msg.request_headers.append('Content-Type', 'application/x-www-form-urlencoded')
      msg.set_request('application/x-www-form-urlencoded', Soup.MemoryUse.COPY, new TextEncoder().encode(body))
    }
    const status = this.session.send(msg, null)
    return { status, body: this.decode(msg.response_body.flatten()) }
  }

  async unrestrict(link: string): Promise<string | null> {
    const { status, body } = await this.req('POST', '/services/unrestrict', `link=${encodeURIComponent(link)}`)
    if (status !== 200) return null
    try { return JSON.parse(body).content?.download ?? null } catch { return null }
  }

  async checkHealth(): Promise<boolean> {
    const { status } = await this.req('GET', '/account/info')
    return status === 200
  }

  async getTorrentInfo(id: string): Promise<{ progress: number; status: string; links: string[] } | null> {
    const { status, body } = await this.req('GET', `/transfer/list?id=${encodeURIComponent(id)}`)
    if (status !== 200) return null
    try {
      const d = JSON.parse(body)
      const t = (d.transfers ?? []).find((x: Record<string, unknown>) => x.id === id)
      if (!t) return null
      return { progress: t.progress ?? 0, status: t.status ?? '', links: t.files ?? [] }
    } catch { return null }
  }

  async addMagnet(magnet: string): Promise<string | null> {
    const { status, body } = await this.req('POST', '/transfer/directdl', `src=${encodeURIComponent(magnet)}`)
    if (status !== 200) return null
    try { return JSON.parse(body).id ?? JSON.parse(body).transfer_id ?? null } catch { return null }
  }
}
