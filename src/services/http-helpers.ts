export function createSoupSession(userAgent: string): SoupSession {
  const Soup = imports.gi.Soup
  const session = new Soup.Session()
  session.user_agent = userAgent
  session.timeout = 30
  return session
}

export async function checkLatency(session: SoupSession, url: string, cache?: Map<string, { latency: number; ts: number }>): Promise<number> {
  if (cache) {
    const cached = cache.get(url)
    const now = Date.now()
    if (cached && now - cached.ts < 60_000) return cached.latency
  }
  const start = Date.now()
  try {
    const Soup = imports.gi.Soup
    const msg = new Soup.Message({ method: 'HEAD', uri: url })
    session.send(msg, null)
    const lat = Date.now() - start
    cache?.set(url, { latency: lat, ts: Date.now() })
    return lat
  } catch {
    cache?.set(url, { latency: Infinity, ts: Date.now() })
    return Infinity
  }
}

export async function rankMirrorsByLatency(session: SoupSession, mirrors: string[]): Promise<string[]> {
  if (mirrors.length <= 1) return [...mirrors]
  const results = await Promise.all(mirrors.map(async m => ({ url: m, lat: await checkLatency(session, m) })))
  results.sort((a, b) => a.lat - b.lat)
  return results.map(r => r.url)
}

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