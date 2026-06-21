import { formatDuration } from '../helpers'

export interface PlaytimeSummary {
  totalSeconds: number
  totalGames: number
  topGame: string
  topGameSeconds: number
}

export function computePlaytimeSummary(
  entries: Array<{ game: { name: string }; playtime?: number }>,
): PlaytimeSummary {
  let totalSeconds = 0
  let topGame = ''
  let topGameSeconds = 0
  let count = 0
  for (const e of entries) {
    const pt = e.playtime ?? 0
    if (pt > 0) {
      totalSeconds += pt
      count++
      if (pt > topGameSeconds) {
        topGameSeconds = pt
        topGame = e.game.name
      }
    }
  }
  return { totalSeconds, totalGames: count, topGame, topGameSeconds }
}

export function formatPlaytimeSummary(summary: PlaytimeSummary): string {
  if (summary.totalGames === 0) return ''
  const total = formatDuration(summary.totalSeconds)
  const top = summary.topGame
    ? ` \u00B7 Most played: ${summary.topGame} (${formatDuration(summary.topGameSeconds)})`
    : ''
  return `${summary.totalGames} games played \u00B7 ${total}${top}`
}
