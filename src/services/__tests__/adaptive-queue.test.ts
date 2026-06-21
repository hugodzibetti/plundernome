import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdaptiveConcurrencyManager } from '../adaptive-queue'

describe('AdaptiveConcurrencyManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('uses defaults when no options given', () => {
    const mgr = new AdaptiveConcurrencyManager()
    expect(mgr.getCurrentConcurrency()).toBe(3)
  })

  it('accepts custom config', () => {
    const mgr = new AdaptiveConcurrencyManager({ minConcurrency: 1, maxConcurrency: 5, initialConcurrency: 2 })
    expect(mgr.getCurrentConcurrency()).toBe(2)
  })

  it('recordSpeed stores samples', () => {
    const mgr = new AdaptiveConcurrencyManager()
    mgr.recordSpeed('d1', 1_000_000)
    expect(mgr.getCurrentConcurrency()).toBe(3)
  })

  it('removeDownload cleans up samples', () => {
    const mgr = new AdaptiveConcurrencyManager()
    mgr.recordSpeed('d1', 1_000_000)
    mgr.removeDownload('d1')
    expect(mgr.getSuggestedConcurrency()).toBe(3)
  })

  it('getSuggestedConcurrency returns current initially', () => {
    const mgr = new AdaptiveConcurrencyManager()
    expect(mgr.getSuggestedConcurrency()).toBe(3)
  })

  it('reduces concurrency when all speeds are slow', () => {
    const mgr = new AdaptiveConcurrencyManager({ minConcurrency: 1, initialConcurrency: 3 })
    vi.advanceTimersByTime(5000)
    mgr.recordSpeed('d1', 100_000)
    mgr.recordSpeed('d2', 200_000)
    expect(mgr.getSuggestedConcurrency()).toBe(2)
  })

  it('increases concurrency when all speeds are fast', () => {
    const mgr = new AdaptiveConcurrencyManager({ maxConcurrency: 10, initialConcurrency: 3 })
    vi.advanceTimersByTime(5000)
    mgr.recordSpeed('d1', 10_000_000)
    expect(mgr.getSuggestedConcurrency()).toBe(4)
  })

  it('getSuggestedConcurrency respects min boundary', () => {
    const mgr = new AdaptiveConcurrencyManager({ minConcurrency: 1, initialConcurrency: 1 })
    vi.advanceTimersByTime(5000)
    mgr.recordSpeed('d1', 100_000)
    expect(mgr.getSuggestedConcurrency()).toBe(1)
  })

  it('getSuggestedConcurrency respects max boundary', () => {
    const mgr = new AdaptiveConcurrencyManager({ maxConcurrency: 5, initialConcurrency: 5 })
    vi.advanceTimersByTime(5000)
    mgr.recordSpeed('d1', 10_000_000)
    expect(mgr.getSuggestedConcurrency()).toBe(5)
  })

  it('reset restores to defaults', () => {
    const mgr = new AdaptiveConcurrencyManager({ initialConcurrency: 8 })
    mgr.recordSpeed('d1', 100_000)
    mgr.reset()
    expect(mgr.getCurrentConcurrency()).toBe(3)
  })

  it('reset accepts new config', () => {
    const mgr = new AdaptiveConcurrencyManager()
    mgr.reset({ initialConcurrency: 7, minConcurrency: 2, maxConcurrency: 9 })
    expect(mgr.getCurrentConcurrency()).toBe(7)
  })

  it('getCurrentConcurrency returns current value', () => {
    const mgr = new AdaptiveConcurrencyManager({ initialConcurrency: 5 })
    expect(mgr.getCurrentConcurrency()).toBe(5)
  })
})
