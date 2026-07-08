import type { HttpService } from '../http/http'

export class AllDebridService {
  private session: SoupSession
  private base = 'https://api.alldebrid.com/v4'

  constructor(private http: HttpService, private apiKey: string) {
    const Soup = imports.gi.Soup
    this.session = new Soup.Session()
  }

  private decode(bytes: Uint8Array): string {
    return new TextDecoder().decode(bytes)
  }

  private async req(method: string, path: string, body?: string): Promise<{ status: number; body: string }> {
    const Soup = imports.gi.Soup
    const sep = path.includes('?') ? '&' : '?'
    const msg = new Soup.Message({ method, uri: `${this.base}${path}${sep}agent=plundernome&apikey=${this.apiKey}` })
    if (body) {
      msg.request_headers.append('Content-Type', 'application/x-www-form-urlencoded')
      msg.set_request('application/x-www-form-urlencoded', Soup.MemoryUse.COPY, new TextEncoder().encode(body))
    }
    const status = this.session.send(msg, null)
    return { status, body: this.decode(msg.response_body.flatten()) }
  }

  async unrestrict(link: string): Promise<string | null> {
    const { status, body } = await this.req('POST', '/link/unrestrict', `link=${encodeURIComponent(link)}`)
    if (status !== 200) return null
    try {
      const d = JSON.parse(body)
      return d.data?.link ?? null
    } catch { return null }
  }

  async checkHealth(): Promise<boolean> {
    const { status, body } = await this.req('GET', '/user')
    if (status !== 200) return false
    try { return JSON.parse(body).status === 'success' } catch { return false }
  }

  async getTorrentInfo(id: string): Promise<{ progress: number; status: string; links: string[] } | null> {
    const { status, body } = await this.req('GET', `/magnet/status?id=${encodeURIComponent(id)}`)
    if (status !== 200) return null
    try {
      const d = JSON.parse(body)
      if (d.status !== 'success') return null
      return { progress: d.data?.progress ?? 0, status: d.data?.status ?? '', links: d.data?.links ?? [] }
    } catch { return null }
  }

  async addMagnet(magnet: string): Promise<string | null> {
    const { status, body } = await this.req('POST', '/magnet/upload', `magnets=${encodeURIComponent(magnet)}`)
    if (status !== 200) return null
    try {
      const d = JSON.parse(body)
      if (d.status !== 'success') return null
      return d.data?.magnets?.[0]?.id ?? null
    } catch { return null }
  }
}
