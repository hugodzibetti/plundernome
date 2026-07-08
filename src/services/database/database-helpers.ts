import type { Game } from '../../domain/models'
import type { GameRow } from '../types'

export function parseDbPath(dbPath: string): string {
  if (dbPath === ':memory:') {
    return 'DB_DIR=/tmp;DB_NAME=:memory:'
  }
  const lastSlash = dbPath.lastIndexOf('/')
  const dir = lastSlash === -1 ? '.' : dbPath.substring(0, lastSlash)
  const name = lastSlash === -1 ? dbPath : dbPath.substring(lastSlash + 1)
  return `DB_DIR=${dir};DB_NAME=${name}`
}

function quoteValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'boolean') return val ? '1' : '0'
  const s = String(val)
  return `'${s.replace(/'/g, "''")}'`
}

export function embedParams(sql: string, params?: unknown[]): string {
  if (!params || params.length === 0) return sql
  let result = sql
  for (let i = 0; i < params.length; i++) {
    const placeholder = `//${i + 1}`
    result = result.replace(placeholder, quoteValue(params[i]))
  }
  return result
}

export function rowToGame(row: GameRow): Game {
  return {
    id: row.id,
    name: row.name,
    sourceId: row.source_id,
    sourceGameId: row.source_game_id,
    url: row.url ?? '',
    description: row.description ?? '',
    size: '',
    sizeBytes: row.size_bytes ?? 0,
    lastUpdated: row.last_updated ?? '',
    downloadType: (row.download_type ?? 'direct') as Game['downloadType'],
    imageUrl: row.image_url ?? undefined,
    wishlisted: row.wishlisted ?? undefined,
    tags: [],
  }
}

export function gameToRow(game: Game): Record<string, unknown> {
  return {
    id: game.id,
    name: game.name,
    source_id: game.sourceId,
    source_game_id: game.sourceGameId,
    url: game.url,
    description: game.description,
    size_bytes: game.sizeBytes,
    last_updated: game.lastUpdated,
    download_type: game.downloadType,
    image_url: game.imageUrl ?? null,
    wishlisted: game.wishlisted ? 1 : 0,
    installed: 0,
    install_path: null,
  }
}

export function extractValue(val: unknown): unknown {
  if (val === null || val === undefined) return null
  if (typeof val === 'object') {
    const v = val as GdaValue
    if (v.is_null && v.is_null()) return null
    if (v.get_string) return v.get_string()
    if (v.get_int) return v.get_int()
    if (v.get_double) return v.get_double()
    if (v.get_boolean) return !!v.get_boolean()
    if (v.to_string) return v.to_string()
  }
  return val
}
