import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import type { IHttpService } from '../services/types'
import type { DatabaseService } from '../services/database'
import { deduplicateGames } from '../domain/dedup'
import { cacheSourceGames } from '../services/cached-games'

type ParserFn = (html: string, source: SourceDefinition) => Game[]

export async function scrapeAllSources(
  sources: SourceDefinition[],
  http: IHttpService,
  parsers: Record<string, ParserFn>,
  db?: DatabaseService,
): Promise<Game[]> {
  const enabled = sources.filter(s => s.enabled)
  const results = await Promise.all(enabled.map(s => scrapeSource(s, http, parsers)))
  const flat = results.flat()
  const deduped = deduplicateGames(flat)
  const games = deduped.ok ? deduped.value : flat

  // cache each source's games for offline fallback
  if (db) {
    for (let i = 0; i < enabled.length; i++) {
      const sourceId = enabled[i]!.id
      const sourceGames = results[i] ?? []
      if (sourceGames.length > 0) {
        await cacheSourceGames(db, sourceId, sourceGames)
      }
    }
  }

  return games
}

async function scrapeSource(
  source: SourceDefinition,
  http: IHttpService,
  parsers: Record<string, ParserFn>
): Promise<Game[]> {
  try {
    const response = await http.fetch(source.baseUrl)
    if (response.status !== 200) return []
    const parser = parsers[source.id]
    return parser ? parser(response.body, source) : []
  } catch { return [] }
}
