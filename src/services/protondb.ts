export type ProtonDBRating = 'platinum' | 'gold' | 'silver' | 'bronze' | 'borked' | 'pending'

export interface IProtonDB {
  getRating(gameName: string): Promise<ProtonDBRating | null>
}

type FetchFn = (url: string) => Promise<{ status: number; body: string }>

interface CacheEntry {
  rating: ProtonDBRating | null
  timestamp: number
}

const VALID_RATINGS: readonly ProtonDBRating[] = ['platinum', 'gold', 'silver', 'bronze', 'borked', 'pending'] as const

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
}

export const PROTONDB_COLORS: Record<ProtonDBRating, string> = {
  platinum: '#e5cc8a',
  gold: '#d4af37',
  silver: '#b0b0b0',
  bronze: '#cd7f32',
  borked: '#ff4444',
  pending: '#888888',
}

export class ProtonDB implements IProtonDB {
  private cache = new Map<string, CacheEntry>()
  private ttl: number

  constructor(
    private fetchFn: FetchFn,
    ttlMs = 3_600_000,
  ) {
    this.ttl = ttlMs
  }

  async getRating(gameName: string): Promise<ProtonDBRating | null> {
    const slug = generateSlug(gameName)
    const now = Date.now()
    const cached = this.cache.get(slug)
    if (cached && now - cached.timestamp < this.ttl) return cached.rating

    try {
      const res = await this.fetchFn(`https://www.protondb.com/api/v1/reports/summaries/${slug}.json`)
      if (res.status !== 200) {
        this.cache.set(slug, { rating: null, timestamp: now })
        return null
      }
      const data = JSON.parse(res.body)
      const tier: string = data?.tier ?? ''
      const rating = (VALID_RATINGS as readonly string[]).includes(tier)
        ? (tier as ProtonDBRating)
        : 'pending'
      this.cache.set(slug, { rating, timestamp: now })
      return rating
    } catch {
      this.cache.set(slug, { rating: null, timestamp: now })
      return null
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}