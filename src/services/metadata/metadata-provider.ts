import type { HttpService } from '../http/http'

export interface EnrichedMetadata {
  gameId: string
  name: string
  description?: string
  coverUrl?: string
  backgroundUrl?: string
  screenshots?: string[]
  genres?: string[]
  releaseDate?: string
  developer?: string
  publisher?: string
  igdbId?: number
  steamGridDbId?: number
}

const CACHE_TTL = 3_600_000

function fixUrl(url: string): string {
  return url.startsWith('//') ? 'https:' + url : url
}

function normalizeGameName(name: string): string {
  return name
    .replace(/\s*\[.*?\]\s*/g, ' ')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\bv?\d+\.\d+\b/g, '')
    .replace(/\b(Repack|REPACK|Multi\d*|CODEX|CPY|FLT|PLAZA|RUNE|GOG|ElAmigos|KaOs|DODI|FitGirl)\b/g, '')
    .replace(/\s+/g, ' ').trim()
}

async function soupPost(url: string, headers: Record<string, string>, body: string, ct: string): Promise<{ status: number; body: string }> {
  const Soup = imports.gi.Soup
  const msg = new Soup.Message({ method: 'POST', uri: url })
  for (const [k, v] of Object.entries(headers)) msg.request_headers.append(k, v)
  msg.set_request(ct, Soup.MemoryUse.COPY, new TextEncoder().encode(body))
  const s = new Soup.Session()
  s.timeout = 15
  const status = s.send(msg, null)
  return { status, body: new TextDecoder().decode(msg.response_body.flatten()) }
}

export class MetadataProvider {
  private cache = new Map<string, { data: EnrichedMetadata | null; ts: number }>()
  private igdbToken: string | null = null
  private tokenExpires = 0

  constructor(
    private http: HttpService,
    private igdbClientId?: string,
    private igdbClientSecret?: string,
    private accessToken?: string,
  ) {
    if (accessToken) { this.igdbToken = accessToken; this.tokenExpires = Infinity }
  }

  async enrich(gameId: string, name: string, sourceGameId?: string): Promise<EnrichedMetadata | null> {
    const now = Date.now()
    const cached = this.cache.get(gameId)
    if (cached && now - cached.ts < CACHE_TTL) return cached.data
    const n = normalizeGameName(name)
    let r = this.igdbClientId ? await this.searchIGDB(n) : null
    if (!r) r = await this.searchSteamGridDB(n)
    if (!r && sourceGameId) r = await this.searchSteamGridDB(sourceGameId)
    if (r) { const e: EnrichedMetadata = { gameId, name, ...r }; this.cache.set(gameId, { data: e, ts: now }); return e }
    this.cache.set(gameId, { data: null, ts: now })
    return null
  }

  getCached(gameId: string): EnrichedMetadata | null {
    const e = this.cache.get(gameId)
    if (!e || Date.now() - e.ts >= CACHE_TTL) return null
    return e.data
  }

  private async ensureToken(): Promise<boolean> {
    if (this.igdbToken && Date.now() < this.tokenExpires) return true
    if (!this.igdbClientId || !this.igdbClientSecret) return false
    try {
      const body = `client_id=${this.igdbClientId}&client_secret=${this.igdbClientSecret}&grant_type=client_credentials`
      const { status, body: raw } = await soupPost('https://id.twitch.tv/oauth2/token', { 'Content-Type': 'application/x-www-form-urlencoded' }, body, 'application/x-www-form-urlencoded')
      if (status !== 200) return false
      const d: { access_token: string; expires_in: number } = JSON.parse(raw)
      this.igdbToken = d.access_token
      this.tokenExpires = Date.now() + d.expires_in * 1000 - 60_000
      return true
    } catch { return false }
  }

  private async searchIGDB(name: string): Promise<Partial<EnrichedMetadata> | null> {
    if (!await this.ensureToken()) return null
    const q = `search "${name}"; fields name,summary,cover.url,genres.name,first_release_date,involved_companies.company.name,screenshots.url; limit 1;`
    try {
      const { status, body } = await soupPost('https://api.igdb.com/v4/games', { 'Client-ID': this.igdbClientId!, Authorization: `Bearer ${this.igdbToken}`, 'Content-Type': 'text/plain' }, q, 'text/plain')
      if (status !== 200) return null
      const arr: Array<{
        id?: number; summary?: string; cover?: { url: string }
        genres?: Array<{ name: string }>; first_release_date?: number
        involved_companies?: Array<{ company: { name: string } }>
        screenshots?: Array<{ url: string }>
      }> = JSON.parse(body)
      if (!arr?.length) return null
      const g = arr[0]!
      const m: Partial<EnrichedMetadata> = {}
      m.igdbId = g.id
      if (g.summary) m.description = g.summary
      if (g.cover?.url) m.coverUrl = fixUrl(g.cover.url).replace('t_thumb', 't_cover_big')
      if (g.genres?.length) m.genres = g.genres.map(x => x.name).filter((n): n is string => !!n)
      if (g.first_release_date) m.releaseDate = new Date(g.first_release_date * 1000).toISOString().split('T')[0]
      if (g.involved_companies?.length) {
        const ns = g.involved_companies.map(c => c.company?.name).filter((n): n is string => !!n)
        if (ns.length) { m.developer = ns[0]; if (ns.length > 1) m.publisher = ns[ns.length - 1] }
      }
      if (g.screenshots?.length) m.screenshots = g.screenshots.map(s => fixUrl(s.url).replace('t_thumb', 't_screenshot_big'))
      return m
    } catch { return null }
  }

  private async searchSteamGridDB(name: string): Promise<Partial<EnrichedMetadata> | null> {
    try {
      const { status, body } = await this.http.fetch(`https://www.steamgriddb.com/api/v2/search/autocomplete/${encodeURIComponent(name)}`)
      if (status !== 200) return null
      const d: { data?: Array<{ id: number }> } = JSON.parse(body)
      if (!d?.data?.length) return null
      const id = d.data[0]!.id
      return { steamGridDbId: id, coverUrl: `https://cdn.steamgriddb.com/grids/${id}.jpg` }
    } catch { return null }
  }
}
