import type { SourceDefinition } from '../domain/catalog/types'
import type { ICatalogView } from './view-interfaces'
import type { Game } from '../domain/models'

export function startAutoUpdate(
  sources: SourceDefinition[],
  scrapeAll: () => Promise<Game[]>,
  catalogView: ICatalogView
): number[] {
  const { GLib } = imports.gi
  const timers: number[] = []
  for (const source of sources) {
    if (!source.enabled) continue
    const ms = (source.updateIntervalMinutes || 360) * 60 * 1000
    const id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      scrapeAll().then(games => {
        if (games.length > 0) catalogView.setGames(games)
      })
      return true
    })
    timers.push(id)
  }
  return timers
}
