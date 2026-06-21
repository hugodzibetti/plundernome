import type { Game } from '../domain/models'
import type { MetadataProvider, EnrichedMetadata } from '../services/metadata-provider'
import type { ICatalogView } from './view-interfaces'

const { GLib } = imports.gi
const SOURCE_REMOVE = false

export function wireMetadataEnrichment(
  provider: MetadataProvider,
  games: Game[],
  catalogView: ICatalogView,
  onComplete?: (enriched: Map<string, EnrichedMetadata>) => void,
): void {
  let cursor = 0
  const enriched = new Map<string, EnrichedMetadata>()

  function tick(): void {
    const batch = games.slice(cursor, cursor + 3)
    cursor += 3
    if (!batch.length) {
      onComplete?.(enriched)
      return
    }

    let done = 0
    for (const game of batch) {
      provider.enrich(game.id, game.name, game.sourceGameId).then(meta => {
        if (meta) {
          enriched.set(game.id, meta)
          const idx = games.findIndex(g => g.id === game.id)
          if (idx >= 0) {
            games[idx] = {
              ...games[idx]!,
              description: meta.description ?? games[idx]!.description,
              imageUrl: meta.coverUrl ?? games[idx]!.imageUrl,
            }
            catalogView.setGames([...games])
          }
        }
        done++
        if (done === batch.length) GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => { tick(); return SOURCE_REMOVE })
      })
    }
  }

  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => { tick(); return SOURCE_REMOVE })
}
