import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import type { IHttpService, SourceHealth } from '../services/types'
import type { ProtonDB, ProtonDBRating } from '../services/protondb'
import type { ICatalogView, ISettingsView, IWindow } from './view-interfaces'

export async function fetchProtonRatingsBg(
  allGames: Game[],
  protonDB: ProtonDB,
  protonRatings: Map<string, ProtonDBRating>,
): Promise<void> {
  try {
    const names = [...new Set(allGames.map(g => g.name))]
    const results = await Promise.allSettled(
      names.map(name => protonDB.getRating(name).then(r => ({ name, rating: r }))),
    )
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.rating) {
        protonRatings.set(result.value.name, result.value.rating)
      }
    }
  } catch {
    // ProtonDB fetch failed silently
  }
}

export async function startHealthChecks(
  http: IHttpService,
  sources: SourceDefinition[],
  settingsView: ISettingsView,
  window: IWindow,
  healthTimers: number[],
  catalogView?: ICatalogView,
): Promise<void> {
  const { GLib } = imports.gi
  const healthMap = new Map<string, SourceHealth>()

  const updateCatalog = (): void => {
    if (!catalogView) return
    const allStatuses = sources.map(s =>
      healthMap.get(s.id) ?? {
        sourceId: s.id, status: 'down' as const, latencyMs: 0,
        lastChecked: new Date().toISOString(), consecutiveTimeouts: 0,
      },
    )
    catalogView.setSourceHealth(allStatuses)
  }

  const checkOne = async (source: SourceDefinition) => {
    const start = Date.now()
    let status: 'up' | 'slow' | 'down' = 'down'
    let latencyMs = 0
    let consecutiveTimeouts = 0
    try {
      const resp = await http.fetch(source.baseUrl, { method: 'HEAD', timeoutMs: 10000 })
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
      sourceId: source.id, status, latencyMs,
      lastChecked: new Date().toISOString(), consecutiveTimeouts,
    }
    healthMap.set(source.id, health)
    settingsView.updateSourceHealth(source.id, health)
    updateCatalog()
    if (consecutiveTimeouts >= 3) {
      source.enabled = false
      window.showToast(`Source "${source.name}" auto-disabled (3 timeouts)`)
    }
    return health
  }
  for (const source of sources) {
    checkOne(source)
  }
  const intervalId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300000, () => {
    for (const source of sources) checkOne(source)
    return true
  })
  healthTimers.push(intervalId)
}
