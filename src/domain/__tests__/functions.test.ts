import { describe, it, expect } from 'vitest'
import {
  createGameID,
  isValidGameID,
  validateGame,
  createInitialPipelineState,
  isValidPipelineTransition,
} from '../functions'
import type { Game } from '../models'
import { SAMPLE_GAME } from '../../../tests/fixtures/game-samples'

describe('createGameID', () => {
  it('returns 8-char hex string', () => {
    const id = createGameID('fitgirl', 'hades')
    expect(id).toMatch(/^[0-9a-f]{8}$/)
  })

  it('different inputs produce different IDs', () => {
    const ids = new Set([
      createGameID('fitgirl', 'game-a'),
      createGameID('fitgirl', 'game-b'),
      createGameID('dodi', 'game-a'),
    ])
    expect(ids.size).toBe(3)
  })

  it('same inputs produce same ID', () => {
    const id1 = createGameID('source', 'game')
    const id2 = createGameID('source', 'game')
    expect(id1).toBe(id2)
  })

  it('handles long sourceId and sourceGameId', () => {
    const long = 'a'.repeat(1000)
    expect(createGameID(long, long)).toMatch(/^[0-9a-f]{8}$/)
  })

  it('handles numeric strings', () => {
    expect(createGameID('123', '456')).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe('isValidGameID', () => {
  it('rejects null', () => {
    expect(isValidGameID(null as unknown as string)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(isValidGameID(undefined as unknown as string)).toBe(false)
  })

  it('rejects string with only hex chars but wrong length', () => {
    expect(isValidGameID('0')).toBe(false)
    expect(isValidGameID('01')).toBe(false)
    expect(isValidGameID('0123456')).toBe(false)
    expect(isValidGameID('0123456789')).toBe(false)
  })

  it('accepts edge hex value ffffffff', () => {
    expect(isValidGameID('ffffffff')).toBe(true)
  })

  it('accepts edge hex value 00000000', () => {
    expect(isValidGameID('00000000')).toBe(true)
  })

  it('rejects string with newline', () => {
    expect(isValidGameID('abcd1234\n')).toBe(false)
  })

  it('rejects string with trailing space', () => {
    expect(isValidGameID('abcd1234 ')).toBe(false)
  })
})

describe('validateGame', () => {
  it('rejects game with undefined sourceId', () => {
    const result = validateGame({ ...SAMPLE_GAME, sourceId: undefined as unknown as string })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Source ID')
  })

  it('rejects game with null sourceId', () => {
    const result = validateGame({ ...SAMPLE_GAME, sourceId: null as unknown as string })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('Source ID')
  })

  it('accepts game with undefined sizeBytes (no guard)', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: undefined as unknown as number })
    expect(result.ok).toBe(true)
  })

  it('handles -Infinity sizeBytes - confirms function behavior', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: -Infinity })
    expect(result.ok).toBe(false)
  })

  it('rejects game with string name', () => {
    const result = validateGame({ ...SAMPLE_GAME, name: '' })
    expect(result.ok).toBe(false)
  })

  it('accepts game with very long name', () => {
    const result = validateGame({ ...SAMPLE_GAME, name: 'x'.repeat(1000) })
    expect(result.ok).toBe(true)
  })

  it('accepts game with very long URL', () => {
    const result = validateGame({ ...SAMPLE_GAME, url: 'https://x.com/' + 'a'.repeat(500) })
    expect(result.ok).toBe(true)
  })

  it('rejects game with negative Infinity sizeBytes', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: -Infinity })
    expect(result.ok).toBe(false)
  })

  it('accepts game with Infinity sizeBytes', () => {
    const result = validateGame({ ...SAMPLE_GAME, sizeBytes: Infinity })
    expect(result.ok).toBe(true)
  })

  it('rejects game with missing all fields', () => {
    const result = validateGame({} as Game)
    expect(result.ok).toBe(false)
  })
})

describe('createInitialPipelineState', () => {
  it('sets correct gameId', () => {
    const state = createInitialPipelineState('deadbeef')
    expect(state.gameId).toBe('deadbeef')
  })

  it('sets step to downloading', () => {
    const state = createInitialPipelineState('x')
    expect(state.step).toBe('downloading')
  })

  it('sets status to idle', () => {
    const state = createInitialPipelineState('x')
    expect(state.status).toBe('idle')
  })

  it('sets progress to 0', () => {
    const state = createInitialPipelineState('x')
    expect(state.progress).toBe(0)
  })

  it('does not set errorMessage', () => {
    const state = createInitialPipelineState('x')
    expect(state.errorMessage).toBeUndefined()
  })

  it('does not set startedAt or completedAt', () => {
    const state = createInitialPipelineState('x')
    expect(state.startedAt).toBeUndefined()
    expect(state.completedAt).toBeUndefined()
  })
})

describe('isValidPipelineTransition', () => {
  it('allows failed transitions from every step except completed', () => {
    const steps = ['downloading', 'verifying', 'extracting', 'detecting-deps', 'installing-deps', 'finding-exe', 'registering'] as const
    for (const step of steps) {
      expect(isValidPipelineTransition(step, 'failed' as any)).toBe(true)
    }
  })

  it('rejects failed transition from completed', () => {
    expect(isValidPipelineTransition('completed', 'failed' as any)).toBe(false)
  })

  it('rejects unknown from step', () => {
    expect(isValidPipelineTransition('unknown' as any, 'downloading')).toBe(false)
  })

  it('rejects unknown to step', () => {
    expect(isValidPipelineTransition('downloading', 'unknown' as any)).toBe(false)
  })

  it('rejects empty string from step', () => {
    expect(isValidPipelineTransition('' as any, 'downloading')).toBe(false)
  })

  it('rejects empty string to step', () => {
    expect(isValidPipelineTransition('downloading', '' as any)).toBe(false)
  })

  it('handles all registered steps have entries in transitions map', () => {
    const steps = ['downloading', 'verifying', 'extracting', 'detecting-deps', 'installing-deps', 'finding-exe', 'registering', 'completed'] as const
    for (const step of steps) {
      if (step === 'completed') {
        expect(isValidPipelineTransition(step, 'downloading')).toBe(false)
      } else {
        expect(isValidPipelineTransition(step, 'failed' as any)).toBe(true)
      }
    }
  })
})