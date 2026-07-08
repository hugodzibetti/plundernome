const DEFAULT_MIN = 2
const DEFAULT_MAX = 10
const DEFAULT_THRESHOLD = 1_000_000
const DEFAULT_INITIAL = 3
const EVAL_INTERVAL_MS = 5000
const MAX_SAMPLES = 10
const HIGH_BPS_THRESHOLD = 5_000_000
const LOW_BPS_THRESHOLD = 500_000

export interface SpeedSample {
  bytesPerSec: number
  timestamp: number
}

export interface AdaptiveConfig {
  minConcurrency?: number
  maxConcurrency?: number
  thresholdBytesPerSec?: number
  initialConcurrency?: number
}

export class AdaptiveConcurrencyManager {
  private minConcurrency: number
  private maxConcurrency: number
  private thresholdBytesPerSec: number
  private currentConcurrency: number
  private samples: Map<string, SpeedSample[]>
  private lastAdjustment: number

  constructor(options?: AdaptiveConfig) {
    this.minConcurrency = options?.minConcurrency ?? DEFAULT_MIN
    this.maxConcurrency = options?.maxConcurrency ?? DEFAULT_MAX
    this.thresholdBytesPerSec = options?.thresholdBytesPerSec ?? DEFAULT_THRESHOLD
    this.currentConcurrency = options?.initialConcurrency ?? DEFAULT_INITIAL
    this.samples = new Map()
    this.lastAdjustment = 0
  }

  recordSpeed(downloadId: string, bytesPerSec: number): void {
    const list = this.samples.get(downloadId) ?? []
    list.push({ bytesPerSec, timestamp: Date.now() })
    if (list.length > MAX_SAMPLES) list.shift()
    this.samples.set(downloadId, list)
  }

  removeDownload(downloadId: string): void {
    this.samples.delete(downloadId)
  }

  getSuggestedConcurrency(): number {
    const now = Date.now()
    if (now - this.lastAdjustment < EVAL_INTERVAL_MS) return this.currentConcurrency
    this.lastAdjustment = now

    const activeSpeeds = this.getActiveSpeeds()
    if (activeSpeeds.length === 0) return this.currentConcurrency

    const allSlow = activeSpeeds.every(s => s < LOW_BPS_THRESHOLD)
    if (allSlow && this.currentConcurrency > this.minConcurrency) {
      this.currentConcurrency--
    }

    const allFast = activeSpeeds.every(s => s > HIGH_BPS_THRESHOLD)
    if (allFast && this.currentConcurrency < this.maxConcurrency) {
      this.currentConcurrency++
    }

    return Math.max(this.minConcurrency, Math.min(this.maxConcurrency, this.currentConcurrency))
  }

  getCurrentConcurrency(): number {
    return this.currentConcurrency
  }

  reset(config?: AdaptiveConfig): void {
    this.currentConcurrency = config?.initialConcurrency ?? DEFAULT_INITIAL
    this.minConcurrency = config?.minConcurrency ?? DEFAULT_MIN
    this.maxConcurrency = config?.maxConcurrency ?? DEFAULT_MAX
    this.thresholdBytesPerSec = config?.thresholdBytesPerSec ?? DEFAULT_THRESHOLD
    this.samples.clear()
    this.lastAdjustment = 0
  }

  private getActiveSpeeds(): number[] {
    const speeds: number[] = []
    for (const list of this.samples.values()) {
      if (list.length === 0) continue
      const avg = list.reduce((sum, s) => sum + s.bytesPerSec, 0) / list.length
      speeds.push(avg)
    }
    return speeds
  }
}