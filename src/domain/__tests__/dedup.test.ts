import { describe, it, expect } from 'vitest'
import { createDedupKey, groupByDedupKey, pickCanonicalGame, deduplicateGames } from '../dedup'
import type { Game } from '../models'

function makeGame(overrides: Partial<Game> & { name: string }): Game {
  return {
    id: 'a1b2c3d4',
    sourceId: 'fitgirl',
    sourceGameId: 'hades',
    url: 'https://example.com',
    description: '',
    size: '10 GB',
    sizeBytes: 10_000_000_000,
    lastUpdated: '2024-01-01T00:00:00.000Z',
    downloadType: 'torrent',
    tags: [],
    ...overrides,
  }
}

describe('createDedupKey', () => {
  it('lowercases name', () => {
    expect(createDedupKey(makeGame({ name: 'HADES' }))).toBe('hades')
  })

  it('strips parentheticals', () => {
    expect(createDedupKey(makeGame({ name: 'Hades (GOTY Edition)' }))).toBe('hades')
  })

  it('strips bracketed text', () => {
    expect(createDedupKey(makeGame({ name: 'Hades [v1.0]' }))).toBe('hades')
  })

  it('strips version numbers', () => {
    expect(createDedupKey(makeGame({ name: 'Hades v1.0' }))).toBe('hades')
  })

  it('strips version numbers at end', () => {
    expect(createDedupKey(makeGame({ name: 'Game v2.5.1' }))).toBe('game')
  })

  it('collapses whitespace', () => {
    expect(createDedupKey(makeGame({ name: '  Hades    GOTY  ' }))).toBe('hades goty')
  })

  it('removes punctuation', () => {
    expect(createDedupKey(makeGame({ name: 'Hades: The Game!' }))).toBe('hades the game')
  })

  it('produces same key for different editions', () => {
    const base = createDedupKey(makeGame({ name: 'Hades' }))
    const goty = createDedupKey(makeGame({ name: 'Hades (GOTY Edition)' }))
    expect(base).toBe(goty)
  })

  it('produces different keys for different games', () => {
    const hades = createDedupKey(makeGame({ name: 'Hades' }))
    const hades2 = createDedupKey(makeGame({ name: 'Hades 2' }))
    expect(hades).not.toBe(hades2)
  })
})

describe('groupByDedupKey', () => {
  it('groups matching games together', () => {
    const games = [
      makeGame({ name: 'Hades', id: '1' }),
      makeGame({ name: 'Hades (GOTY Edition)', id: '2' }),
      makeGame({ name: 'Portal', id: '3' }),
    ]
    const groups = groupByDedupKey(games)
    expect(groups.size).toBe(2)
    const hadesGroup = groups.get('hades')
    expect(hadesGroup).toHaveLength(2)
    const portalGroup = groups.get('portal')
    expect(portalGroup).toHaveLength(1)
  })

  it('returns empty map for empty list', () => {
    const groups = groupByDedupKey([])
    expect(groups.size).toBe(0)
  })
})

describe('pickCanonicalGame', () => {
  it('returns null for empty list', () => {
    expect(pickCanonicalGame([])).toBeNull()
  })

  it('returns single game', () => {
    const game = makeGame({ name: 'Hades' })
    expect(pickCanonicalGame([game])).toBe(game)
  })

  it('picks game with description over one without', () => {
    const noDesc = makeGame({ name: 'Hades', id: '1', description: '' })
    const withDesc = makeGame({ name: 'Hades', id: '2', description: 'A great game' })
    expect(pickCanonicalGame([noDesc, withDesc])).toBe(withDesc)
  })

  it('picks game with imageUrl over one without', () => {
    const noImg = makeGame({ name: 'Hades', id: '1', imageUrl: undefined })
    const withImg = makeGame({ name: 'Hades', id: '2', imageUrl: 'https://img.png' })
    expect(pickCanonicalGame([noImg, withImg])).toBe(withImg)
  })

  it('picks most recent when scores equal', () => {
    const old = makeGame({ name: 'Hades', id: '1', lastUpdated: '2023-01-01T00:00:00.000Z', description: 'desc', imageUrl: 'img' })
    const recent = makeGame({ name: 'Hades', id: '2', lastUpdated: '2024-01-01T00:00:00.000Z', description: 'desc', imageUrl: 'img' })
    expect(pickCanonicalGame([old, recent])).toBe(recent)
  })

  it('picks game with repackNotes over one without', () => {
    const noNotes = makeGame({ name: 'Hades', id: '1', repackNotes: undefined })
    const withNotes = makeGame({ name: 'Hades', id: '2', repackNotes: 'Selective download' })
    expect(pickCanonicalGame([noNotes, withNotes])).toBe(withNotes)
  })
})

describe('deduplicateGames', () => {
  it('returns empty array for empty input', () => {
    const result = deduplicateGames([])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual([])
  })

  it('returns same array for single game', () => {
    const games = [makeGame({ name: 'Hades' })]
    const result = deduplicateGames(games)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toHaveLength(1)
  })

  it('removes duplicate entries', () => {
    const games = [
      makeGame({ name: 'Hades', id: '1', description: 'desc' }),
      makeGame({ name: 'Hades (v1.0)', id: '2' }),
    ]
    const result = deduplicateGames(games)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(1)
      expect(result.value[0]!.id).toBe('1')
    }
  })

  it('keeps non-duplicate games separate', () => {
    const games = [
      makeGame({ name: 'Hades', id: '1' }),
      makeGame({ name: 'Portal 2', id: '2' }),
    ]
    const result = deduplicateGames(games)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toHaveLength(2)
  })

  it('does not merge games with different names', () => {
    const games = [
      makeGame({ name: 'Hades', id: '1' }),
      makeGame({ name: 'Hades 2', id: '2' }),
    ]
    const result = deduplicateGames(games)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toHaveLength(2)
  })

  it('handles multiple groups with duplicates', () => {
    const games = [
      makeGame({ name: 'Hades', id: '1', description: 'desc' }),
      makeGame({ name: 'Hades (GOTY)', id: '2' }),
      makeGame({ name: 'Portal 2', id: '3', description: 'desc' }),
      makeGame({ name: 'Portal 2 (v1.2)', id: '4' }),
    ]
    const result = deduplicateGames(games)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toHaveLength(2)
      const ids = result.value.map(g => g.id).sort()
      expect(ids).toEqual(['1', '3'])
    }
  })
})
