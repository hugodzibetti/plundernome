import type { Game } from '../domain/models'
import type { GameRow } from './types'

export function computeRecommendations(
  allGames: Game[],
  installedGames: GameRow[],
  wishlistedIds: Set<string>,
  limit = 8,
): Game[] {
  const knownGenres = new Set<string>()
  for (const game of installedGames) {
    const tags = game.description?.toLowerCase().split(/\s+/) ?? []
    for (const t of tags) { if (t.length > 3) knownGenres.add(t) }
  }

  const scored = allGames
    .filter((g) => !installedGames.some((ig) => ig.id === g.id))
    .map((g) => {
      let score = 0
      const desc = (g.description ?? '').toLowerCase()
      for (const genre of knownGenres) {
        if (desc.includes(genre)) score += 1
      }
      if (wishlistedIds.has(g.id)) score += 5
      score += Math.min(g.sizeBytes / 1_000_000_000, 3)
      return { game: g, score }
    })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.game)
}

export function computeTrending(allGames: Game[], limit = 8): Game[] {
  return [...allGames]
    .sort((a, b) => {
      const dateA = new Date(a.lastUpdated).getTime()
      const dateB = new Date(b.lastUpdated).getTime()
      return dateB - dateA
    })
    .slice(0, limit)
}
