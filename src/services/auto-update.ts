import type { ICatalogSource } from '../domain/catalog/types'
import type { IHttpService, SourceHealth } from './types'

export class AutoUpdateService {
  private timers: Map<string, number> = new Map()
  private http: IHttpService
  private sources: ICatalogSource[]
  private onUpdate: ((sourceId: string, rawHtml: string) => void) | null = null
  private healthCache: Map<string, SourceHealth> = new Map()
  private onHealth: ((health: SourceHealth) => void) | null = null

  constructor(http: IHttpService, sources: ICatalogSource[]) {
    this.http = http
    this.sources = sources
  }

  onSourceUpdate(cb: (sourceId: string, rawHtml: string) => void): void {
    this.onUpdate = cb
  }

  onHealthChange(cb: (health: SourceHealth) => void): void {
    this.onHealth = cb
  }

  startAutoUpdate(source: ICatalogSource): void {
    if (this.timers.has(source.definition.id)) return
    const interval = (source.definition.updateIntervalMinutes || 360) * 60 * 1000
    const timer = imports.gi.GLib.timeout_add(
      imports.gi.GLib.PRIORITY_DEFAULT,
      interval,
      () => {
        this.pollSource(source)
        this.checkSourceHealthAndEmit(source)
        return true
      }
    )
    this.timers.set(source.definition.id, timer)
  }

  stopAutoUpdate(sourceId: string): void {
    const timer = this.timers.get(sourceId)
    if (timer !== undefined) {
      imports.gi.GLib.source_remove(timer)
      this.timers.delete(sourceId)
    }
  }

  stopAll(): void {
    for (const [id] of this.timers) this.stopAutoUpdate(id)
  }

  async checkSourceHealth(source: ICatalogSource): Promise<SourceHealth> {
    const start = Date.now()
    let status: 'up' | 'slow' | 'down' = 'down'
    let latencyMs = 0
    let consecutiveTimeouts = 0
    const prev = this.healthCache.get(source.definition.id)
    if (prev) consecutiveTimeouts = prev.consecutiveTimeouts

    try {
      const response = await this.http.fetch(source.definition.baseUrl, {
        method: 'HEAD',
        timeoutMs: 10000,
      })
      latencyMs = Date.now() - start
      if (latencyMs < 1000) {
        status = 'up'
        consecutiveTimeouts = 0
      } else if (latencyMs < 5000) {
        status = 'slow'
        consecutiveTimeouts = 0
      } else {
        status = 'down'
        consecutiveTimeouts++
      }
    } catch {
      latencyMs = Date.now() - start
      status = 'down'
      consecutiveTimeouts++
    }

    const health: SourceHealth = {
      sourceId: source.definition.id,
      status,
      latencyMs,
      lastChecked: new Date().toISOString(),
      consecutiveTimeouts,
    }
    this.healthCache.set(source.definition.id, health)
    return health
  }

  getHealth(sourceId: string): SourceHealth | undefined {
    return this.healthCache.get(sourceId)
  }

  async checkAllSourcesHealth(sources: Array<{ id: string; url: string }>): Promise<SourceHealth[]> {
    const results: SourceHealth[] = []
    for (const s of sources) {
      const start = Date.now()
      let status: 'up' | 'slow' | 'down' = 'down'
      let latencyMs = 0
      let consecutiveTimeouts = 0
      const prev = this.healthCache.get(s.id)
      if (prev) consecutiveTimeouts = prev.consecutiveTimeouts
      try {
        const response = await this.http.fetch(s.url, { method: 'HEAD', timeoutMs: 10000 })
        latencyMs = Date.now() - start
        if (latencyMs < 1000) { status = 'up'; consecutiveTimeouts = 0 }
        else if (latencyMs < 5000) { status = 'slow'; consecutiveTimeouts = 0 }
        else { status = 'down'; consecutiveTimeouts++ }
      } catch {
        latencyMs = Date.now() - start
        status = 'down'
        consecutiveTimeouts++
      }
      const health: SourceHealth = {
        sourceId: s.id, status, latencyMs,
        lastChecked: new Date().toISOString(), consecutiveTimeouts,
      }
      this.healthCache.set(s.id, health)
      results.push(health)
    }
    return results
  }

  private async checkSourceHealthAndEmit(source: ICatalogSource): Promise<void> {
    const health = await this.checkSourceHealth(source)
    if (this.onHealth) this.onHealth(health)
  }

  private async pollSource(source: ICatalogSource): Promise<void> {
    try {
      const response = await this.http.fetch(source.definition.baseUrl)
      if (response.status === 200 && this.onUpdate) {
        this.onUpdate(source.definition.id, response.body)
      }
    } catch {
    }
  }
}
