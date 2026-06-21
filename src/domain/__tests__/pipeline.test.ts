import { describe, it, expect } from 'vitest'
import {
  reducePipeline,
  getPipelineSteps,
  type PipelineAction,
} from '../pipeline'
import {
  type PipelineState,
  type PipelineStep,
  createInitialPipelineState,
} from '../models'

describe('Pipeline reducer', () => {
  it('starts an idle pipeline', () => {
    const state = createInitialPipelineState('game1')
    const result = reducePipeline(state, { type: 'START' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('running')
      expect(result.value.startedAt).toBeDefined()
    }
  })

  it('rejects starting a running pipeline', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'running' as const }
    const result = reducePipeline(state, { type: 'START' })
    expect(result.ok).toBe(false)
  })

  it('rejects starting a completed pipeline', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'completed' as const }
    const result = reducePipeline(state, { type: 'START' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('completed')
  })

  it('rejects starting a failed pipeline', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'failed' as const }
    const result = reducePipeline(state, { type: 'START' })
    expect(result.ok).toBe(false)
  })

  it('advances through valid steps', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'running' as const }
    const r1 = reducePipeline(state, { type: 'ADVANCE', to: 'verifying' })
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value.step).toBe('verifying')

    const r2 = r1.ok ? reducePipeline(r1.value, { type: 'ADVANCE', to: 'extracting' }) : null
    expect(r2?.ok).toBe(true)
    if (r2?.ok) expect(r2.value.step).toBe('extracting')
  })

  it('rejects advancing when not running', () => {
    const state = createInitialPipelineState('game1')
    const result = reducePipeline(state, { type: 'ADVANCE', to: 'verifying' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('idle')
  })

  it('rejects advancing completed pipeline', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'completed' as const }
    const result = reducePipeline(state, { type: 'ADVANCE', to: 'verifying' })
    expect(result.ok).toBe(false)
  })

  it('rejects advancing failed pipeline', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'failed' as const }
    const result = reducePipeline(state, { type: 'ADVANCE', to: 'verifying' })
    expect(result.ok).toBe(false)
  })

  it('rejects invalid step transitions', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'running' as const }
    const result = reducePipeline(state, { type: 'ADVANCE', to: 'completed' })
    expect(result.ok).toBe(false)
  })

  it('rejects self-transition advance', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'running' as const }
    const result = reducePipeline(state, { type: 'ADVANCE', to: 'downloading' })
    expect(result.ok).toBe(false)
  })

  it('rejects backward transition advance', () => {
    const state = {
      ...createInitialPipelineState('game1'),
      status: 'running' as const,
      step: 'finding-exe' as PipelineStep,
    }
    const result = reducePipeline(state, { type: 'ADVANCE', to: 'installing-deps' })
    expect(result.ok).toBe(false)
  })

  it('fails a running pipeline', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'running' as const }
    const result = reducePipeline(state, { type: 'FAIL', error: 'Download failed' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('failed')
      expect(result.value.errorMessage).toBe('Download failed')
    }
  })

  it('fails an idle pipeline', () => {
    const state = createInitialPipelineState('game1')
    const result = reducePipeline(state, { type: 'FAIL', error: 'Cancelled' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.status).toBe('failed')
  })

  it('fails a failed pipeline again', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'failed' as const }
    const result = reducePipeline(state, { type: 'FAIL', error: 'again' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.errorMessage).toBe('again')
  })

  it('rejects failing a completed pipeline', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'completed' as const }
    const result = reducePipeline(state, { type: 'FAIL', error: 'oops' })
    expect(result.ok).toBe(false)
  })

  it('sets progress within bounds', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'running' as const }
    const r1 = reducePipeline(state, { type: 'SET_PROGRESS', progress: 50 })
    expect(r1.ok).toBe(true)
    if (r1.ok) expect(r1.value.progress).toBe(50)

    const r2 = reducePipeline(state, { type: 'SET_PROGRESS', progress: 150 })
    expect(r2.ok).toBe(true)
    if (r2.ok) expect(r2.value.progress).toBe(100)

    const r3 = reducePipeline(state, { type: 'SET_PROGRESS', progress: -10 })
    expect(r3.ok).toBe(true)
    if (r3.ok) expect(r3.value.progress).toBe(0)
  })

  it('rejects set_progress when not running', () => {
    const state = createInitialPipelineState('game1')
    const result = reducePipeline(state, { type: 'SET_PROGRESS', progress: 50 })
    expect(result.ok).toBe(false)
  })

  it('rejects set_progress when completed', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'completed' as const }
    const result = reducePipeline(state, { type: 'SET_PROGRESS', progress: 50 })
    expect(result.ok).toBe(false)
  })

  it('rejects set_progress when failed', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'failed' as const }
    const result = reducePipeline(state, { type: 'SET_PROGRESS', progress: 50 })
    expect(result.ok).toBe(false)
  })

  it('resets pipeline from failed', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'failed' as const, step: 'registering' as const, progress: 90 }
    const result = reducePipeline(state, { type: 'RESET' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('idle')
      expect(result.value.step).toBe('downloading')
      expect(result.value.progress).toBe(0)
    }
  })

  it('resets pipeline from completed', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'completed' as const, step: 'completed' as const, progress: 100 }
    const result = reducePipeline(state, { type: 'RESET' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.status).toBe('idle')
  })

  it('resets pipeline from idle', () => {
    const state = createInitialPipelineState('game1')
    const result = reducePipeline(state, { type: 'RESET' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.status).toBe('idle')
  })

  it('advance updates progress to correct value', () => {
    const state = { ...createInitialPipelineState('game1'), status: 'running' as const }
    const r1 = reducePipeline(state, { type: 'ADVANCE', to: 'verifying' })
    if (r1.ok) expect(r1.value.progress).toBe(20)

    const r2 = r1.ok ? reducePipeline(r1.value, { type: 'ADVANCE', to: 'extracting' }) : null
    if (r2?.ok) expect(r2.value.progress).toBe(35)

    const r3 = r2?.ok ? reducePipeline(r2.value, { type: 'ADVANCE', to: 'detecting-deps' }) : null
    if (r3?.ok) expect(r3.value.progress).toBe(50)
  })
})

describe('getPipelineSteps', () => {
  it('returns steps in order', () => {
    const steps = getPipelineSteps()
    expect(steps).toHaveLength(8)
    expect(steps[0]).toBe('downloading')
    expect(steps[steps.length - 1]).toBe('completed')
  })

  it('returns all unique steps', () => {
    const steps = getPipelineSteps()
    const unique = new Set(steps)
    expect(unique.size).toBe(steps.length)
  })

  it('returns deterministic order each call', () => {
    const steps1 = getPipelineSteps()
    const steps2 = getPipelineSteps()
    expect(steps1).toEqual(steps2)
  })
})