import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ProtonDB, generateSlug } from '../protondb'

describe('generateSlug', () => {
  it('lowercases and replaces spaces with underscores', () => {
    expect(generateSlug('The Witcher 3')).toBe('the_witcher_3')
  })

  it('removes special characters', () => {
    expect(generateSlug("Assassin's Creed: Origins!")).toBe('assassins_creed_origins')
  })

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  it('handles already-clean string', () => {
    expect(generateSlug('hades')).toBe('hades')
  })

  it('collapses multiple spaces', () => {
    expect(generateSlug('game   name')).toBe('game_name')
  })

  it('removes leading/trailing special chars', () => {
    expect(generateSlug('!Hello World?')).toBe('hello_world')
  })
})

describe('ProtonDB', () => {
  let protondb: ProtonDB
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockFetch = vi.fn()
    protondb = new ProtonDB(mockFetch, 3600000)
  })

  it('returns rating on successful fetch', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ tier: 'gold' }),
    })
    const rating = await protondb.getRating('Hades')
    expect(rating).toBe('gold')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://www.protondb.com/api/v1/reports/summaries/hades.json',
    )
  })

  it('returns null on non-200 status', async () => {
    mockFetch.mockResolvedValue({ status: 404, body: '{}' })
    const rating = await protondb.getRating('Unknown Game')
    expect(rating).toBeNull()
  })

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))
    const rating = await protondb.getRating('Hades')
    expect(rating).toBeNull()
  })

  it('returns pending for unknown tier', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ tier: 'unknown_tier_xyz' }),
    })
    const rating = await protondb.getRating('Hades')
    expect(rating).toBe('pending')
  })

  it('caches results and does not refetch within TTL', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ tier: 'platinum' }),
    })
    await protondb.getRating('Hades')
    await protondb.getRating('Hades')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('refetches after TTL expires', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ tier: 'silver' }),
    })
    await protondb.getRating('Hades')
    vi.advanceTimersByTime(3600001)
    await protondb.getRating('Hades')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('caches null results', async () => {
    mockFetch.mockResolvedValue({ status: 404, body: '{}' })
    await protondb.getRating('Missing')
    await protondb.getRating('Missing')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('clearCache resets all entries', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      body: JSON.stringify({ tier: 'gold' }),
    })
    await protondb.getRating('Hades')
    protondb.clearCache()
    await protondb.getRating('Hades')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('handles all valid rating tiers', async () => {
    const tiers = ['platinum', 'gold', 'silver', 'bronze', 'borked', 'pending']
    for (const tier of tiers) {
      mockFetch.mockResolvedValue({
        status: 200,
        body: JSON.stringify({ tier }),
      })
      const rating = await protondb.getRating(`Game ${tier}`)
      expect(rating).toBe(tier)
    }
  })
})