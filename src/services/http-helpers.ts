export class RollingSpeedTracker {
  private samples = new Map<string, { values: number[]; lastTime: number }>()
  private readonly maxSamples = 30

  recordSample(id: string, bytesPerSec: number): void {
    const now = Date.now()
    let tracker = this.samples.get(id)
    if (!tracker) {
      tracker = { values: [], lastTime: now }
      this.samples.set(id, tracker)
    }
    if (now - tracker.lastTime >= 1000) {
      tracker.values.push(bytesPerSec)
      tracker.lastTime = now
      if (tracker.values.length > this.maxSamples) tracker.values.shift()
    }
  }

  getRolling(id: string): number {
    const tracker = this.samples.get(id)
    if (!tracker || tracker.values.length === 0) return 0
    const sum = tracker.values.reduce((a, b) => a + b, 0)
    return sum / tracker.values.length
  }

  clear(id: string): void {
    this.samples.delete(id)
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}