import { retryProvider, searchSteamStore, searchSteamGridDB, searchIGDB } from '../cover/cover-provider-providers'

export interface ICoverProvider {
  getCoverUrl(gameName: string): Promise<string | null>
}

type FetchFn = (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ status: number; body: string }>

interface CacheEntry {
  url: string | null
  timestamp: number
}

const MAX_CACHE_SIZE = 500
const CACHE_TTL_MS = 3_600_000

export class CoverProvider implements ICoverProvider {
  private cache = new Map<string, CacheEntry>()
  private accessOrder: string[] = []

  constructor(
    private fetchFn: FetchFn,
  ) {}

  async getCoverUrl(gameName: string): Promise<string | null> {
    const now = Date.now()
    const cached = this.cache.get(gameName)
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      this.recordAccess(gameName)
      return cached.url
    }

    const providers = [
      () => searchSteamStore(this.fetchFn, gameName),
      () => searchSteamGridDB(this.fetchFn, gameName),
      () => searchIGDB(this.fetchFn, gameName),
    ]

    for (const provider of providers) {
      const url = await retryProvider(provider)
      if (url !== null) {
        this.setCacheEntry(gameName, url)
        return url
      }
    }

    this.setCacheEntry(gameName, null)
    return null
  }

  private recordAccess(key: string): void {
    const idx = this.accessOrder.indexOf(key)
    if (idx > -1) this.accessOrder.splice(idx, 1)
    this.accessOrder.push(key)
  }

  private setCacheEntry(key: string, url: string | null): void {
    if (this.cache.has(key)) {
      this.recordAccess(key)
    } else {
      if (this.cache.size >= MAX_CACHE_SIZE) {
        const oldest = this.accessOrder.shift()
        if (oldest) this.cache.delete(oldest)
      }
      this.accessOrder.push(key)
    }
    this.cache.set(key, { url, timestamp: Date.now() })
  }

  clearCache(): void {
    this.cache.clear()
    this.accessOrder = []
  }
}

let defaultProvider: CoverProvider | null = null

export async function fetchCoverArt(
  gameName: string,
  fetchFn: FetchFn,
): Promise<string | null> {
  if (!defaultProvider) {
    defaultProvider = new CoverProvider(fetchFn)
  }
  return defaultProvider.getCoverUrl(gameName)
}
