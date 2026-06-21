import type { Game, SourceID, Result } from './models'

export interface DedupGroup {
  canonicalId: string
  games: Game[]
  primarySource: SourceID
}

export function createDedupKey(game: Game): string {
  const name = game.name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/v?\d+\.\d+.*$/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return name
}

export function groupByDedupKey(games: Game[]): Map<string, Game[]> {
  const groups = new Map<string, Game[]>()
  for (const game of games) {
    const key = createDedupKey(game)
    const existing = groups.get(key) ?? []
    existing.push(game)
    groups.set(key, existing)
  }
  return groups
}

export function pickCanonicalGame(games: Game[]): Game | null {
  if (games.length === 0) return null
  return games.reduce((best, curr) => {
    const bestScore = (best.description ? 1 : 0) + (best.imageUrl ? 1 : 0) + (best.repackNotes ? 1 : 0)
    const currScore = (curr.description ? 1 : 0) + (curr.imageUrl ? 1 : 0) + (curr.repackNotes ? 1 : 0)
    if (currScore > bestScore) return curr
    if (currScore === bestScore && curr.lastUpdated > best.lastUpdated) return curr
    return best
  })
}

export function deduplicateGames(games: Game[]): Result<Game[]> {
  if (games.length === 0) return { ok: true, value: [] }
  const groups = groupByDedupKey(games)
  const result: Game[] = []
  for (const [, group] of groups) {
    if (group.length === 1 && group[0]) {
      result.push(group[0])
    } else {
      const canonical = pickCanonicalGame(group)
      if (canonical) result.push(canonical)
    }
  }
  return { ok: true, value: result }
}
