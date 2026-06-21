import type { Game } from '../models'

export interface SearchOptions {
  query: string
  threshold?: number
  keys?: ('name' | 'description' | 'tags')[]
}

type Field = string | string[]

function tokenScore(field: string, token: string): number {
  const f = field.toLowerCase()
  if (f === token) return 100
  if (f.startsWith(token)) return 80
  if (f.includes(token)) return 60
  let ti = 0
  for (let i = 0; i < f.length && ti < token.length; i++) {
    if (f[i] === token[ti]) ti++
  }
  return ti === token.length ? 40 : 0
}

function fieldScore(field: Field, token: string): number {
  if (Array.isArray(field)) return Math.max(...field.map(s => tokenScore(s, token)), 0)
  return tokenScore(field, token)
}

function fieldHas(field: Field, token: string): boolean {
  if (Array.isArray(field)) return field.some(s => s.toLowerCase().includes(token))
  return field.toLowerCase().includes(token)
}

export function fuzzySearch(games: Game[], options: SearchOptions): Game[] {
  const { query, threshold = 0.4, keys = ['name', 'description', 'tags'] } = options
  const q = query.trim().toLowerCase()
  if (!q) return [...games]

  const tokens = q.split(/\s+/)
  const minScore = threshold * 100

  return games
    .filter(g => tokens.every(t => keys.some(k => fieldHas(g[k] as Field, t))))
    .map(g => ({
      game: g,
      score: tokens.reduce((s, t) => s + keys.reduce((a, k) => a + fieldScore(g[k] as Field, t), 0), 0),
    }))
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .map(s => s.game)
}
