import type { Game } from '../domain/models'
import type { SourceDefinition } from '../domain/catalog/types'
import type { IHttpService } from '../services/types'
import { deduplicateGames } from '../domain/dedup'

type ParserFn = (html: string, source: SourceDefinition) => Game[]

export async function scrapeAllSources(
  sources: SourceDefinition[],
  http: IHttpService,
  parsers: Record<string, ParserFn>
): Promise<Game[]> {
  const enabled = sources.filter(s => s.enabled)
  const results = await Promise.all(enabled.map(s => scrapeSource(s, http, parsers)))
  const flat = results.flat()
  const deduped = deduplicateGames(flat)
  return deduped.ok ? deduped.value : flat
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
