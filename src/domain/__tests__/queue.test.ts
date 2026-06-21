import { describe, it, expect } from 'vitest'
import { reorderDownloads, canResume, canPause, sortByPriority, setPriority, clampSpeedLimit, SPEED_PRESETS } from '../queue'
import type { Download } from '../models'

function makeDownload(overrides: Partial<Download> = {}): Download {
  return {
    id: 'dl-1',
    gameId: 'abc123',
    name: 'Test Game',
    url: 'https://example.com/game.zip',
    type: 'direct',
    status: 'queued',
    priority: 'normal',
    progress: 0,
    speed: 0,
    bytesDownloaded: 0,
    totalBytes: 1000000,
    destinationPath: '/tmp/test',
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('reorderDownloads', () => {
  const ids = ['a', 'b', 'c', 'd']
  const dls = ids.map((id, i) => makeDownload({ id, progress: i * 10 }))

  it('moves item forward', () => {
    const result = reorderDownloads(dls, 0, 2)
    expect(result.map(d => d.id)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('moves item backward', () => {
    const result = reorderDownloads(dls, 3, 1)
    expect(result.map(d => d.id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('returns same array for same index', () => {
    const result = reorderDownloads(dls, 1, 1)
    expect(result).toEqual(dls)
  })

  it('handles out-of-bounds fromIndex', () => {
    const result = reorderDownloads(dls, -1, 2)
    expect(result).toEqual(dls)
  })

  it('handles out-of-bounds toIndex', () => {
    const result = reorderDownloads(dls, 0, 99)
    expect(result).toEqual(dls)
  })

  it('does not mutate original', () => {
    const copy = [...dls]
    reorderDownloads(dls, 0, 2)
    expect(dls.map(d => d.id)).toEqual(copy.map(d => d.id))
  })
})

describe('canResume', () => {
  it('allows paused download', () => {
    expect(canResume(makeDownload({ status: 'paused' }))).toBe(true)
  })

  it('allows failed download', () => {
    expect(canResume(makeDownload({ status: 'failed' }))).toBe(true)
  })

  it('rejects queued download', () => {
    expect(canResume(makeDownload({ status: 'queued' }))).toBe(false)
  })

  it('rejects downloading download', () => {
    expect(canResume(makeDownload({ status: 'downloading' }))).toBe(false)
  })

  it('rejects completed download', () => {
    expect(canResume(makeDownload({ status: 'completed' }))).toBe(false)
  })
})

describe('canPause', () => {
  it('allows downloading download', () => {
    expect(canPause(makeDownload({ status: 'downloading' }))).toBe(true)
  })

  it('allows queued download', () => {
    expect(canPause(makeDownload({ status: 'queued' }))).toBe(true)
  })

  it('rejects paused download', () => {
    expect(canPause(makeDownload({ status: 'paused' }))).toBe(false)
  })

  it('rejects failed download', () => {
    expect(canPause(makeDownload({ status: 'failed' }))).toBe(false)
  })

  it('rejects completed download', () => {
    expect(canPause(makeDownload({ status: 'completed' }))).toBe(false)
  })
})

describe('sortByPriority', () => {
  it('puts high before normal', () => {
    const dls = [
      makeDownload({ id: 'a', priority: 'normal', createdAt: '2024-01-01T00:00:00Z' }),
      makeDownload({ id: 'b', priority: 'high', createdAt: '2024-01-01T00:00:00Z' }),
    ]
    const result = sortByPriority(dls)
    expect(result.map(d => d.id)).toEqual(['b', 'a'])
  })

  it('puts normal before low', () => {
    const dls = [
      makeDownload({ id: 'a', priority: 'low', createdAt: '2024-01-01T00:00:00Z' }),
      makeDownload({ id: 'b', priority: 'normal', createdAt: '2024-01-01T00:00:00Z' }),
    ]
    const result = sortByPriority(dls)
    expect(result.map(d => d.id)).toEqual(['b', 'a'])
  })

  it('stable sort by createdAt within same priority', () => {
    const dls = [
      makeDownload({ id: 'a', priority: 'high', createdAt: '2024-01-02T00:00:00Z' }),
      makeDownload({ id: 'b', priority: 'high', createdAt: '2024-01-01T00:00:00Z' }),
    ]
    const result = sortByPriority(dls)
    expect(result.map(d => d.id)).toEqual(['b', 'a'])
  })

  it('does not mutate original', () => {
    const dls = [
      makeDownload({ id: 'a', priority: 'low' }),
      makeDownload({ id: 'b', priority: 'high' }),
    ]
    const copy = [...dls]
    sortByPriority(dls)
    expect(dls.map(d => d.id)).toEqual(copy.map(d => d.id))
  })
})

describe('setPriority', () => {
  it('returns new download with updated priority', () => {
    const dl = makeDownload({ priority: 'low' })
    const result = setPriority(dl, 'high')
    expect(result.priority).toBe('high')
    expect(result.id).toBe(dl.id)
  })

  it('does not mutate original', () => {
    const dl = makeDownload({ priority: 'low' })
    setPriority(dl, 'high')
    expect(dl.priority).toBe('low')
  })
})

describe('clampSpeedLimit', () => {
  it('returns 0 for unlimited (0 input)', () => {
    expect(clampSpeedLimit(0, 100, 1000)).toBe(0)
  })

  it('clamps to min when below range', () => {
    expect(clampSpeedLimit(50, 100, 1000)).toBe(100)
  })

  it('clamps to max when above range', () => {
    expect(clampSpeedLimit(5000, 100, 1000)).toBe(1000)
  })

  it('returns value when within range', () => {
    expect(clampSpeedLimit(500, 100, 1000)).toBe(500)
  })

  it('handles exact boundary values', () => {
    expect(clampSpeedLimit(100, 100, 1000)).toBe(100)
    expect(clampSpeedLimit(1000, 100, 1000)).toBe(1000)
  })
})

describe('SPEED_PRESETS', () => {
  it('has Unlimited as first entry with value 0', () => {
    expect(SPEED_PRESETS[0]?.label).toBe('Unlimited')
    expect(SPEED_PRESETS[0]?.value).toBe(0)
  })

  it('all values are non-negative', () => {
    for (const p of SPEED_PRESETS) {
      expect(p.value).toBeGreaterThanOrEqual(0)
    }
  })

  it('all labels are non-empty strings', () => {
    for (const p of SPEED_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0)
    }
  })

  it('has correct number of presets', () => {
    expect(SPEED_PRESETS).toHaveLength(6)
  })

  it('values are in ascending order', () => {
    for (let i = 1; i < SPEED_PRESETS.length; i++) {
      expect(SPEED_PRESETS[i]!.value).toBeGreaterThan(SPEED_PRESETS[i - 1]!.value)
    }
  })
})