import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseService } from '../database'
import type { GameRow } from '../types'

const $ = (globalThis as any)
const mockGLib = $.mockGLib, mockGda = $.mockGda, mockCxn = $.mockGdaConnection

function createMockModel(rows: Record<string, unknown>[]): any {
  if (rows.length === 0) return null
  const columns = Object.keys(rows[0]!)
  return {
    get_n_columns: () => columns.length,
    get_n_rows: () => rows.length,
    get_column_name: (j: number) => columns[j]!,
    get_value_at: (j: number, i: number) => {
      const val = rows[i]![columns[j]!]
      const base = { is_null: () => false, to_string: () => String(val) }
      if (typeof val === 'number') return { ...base, get_int: () => val, get_double: () => val }
      if (typeof val === 'boolean') return { ...base, get_boolean: () => val }
      return { ...base, get_string: () => String(val) }
    },
  }
}

describe('DatabaseService', () => {
  let db: DatabaseService

  beforeEach(async () => {
    vi.clearAllMocks()
    db = new DatabaseService()
    await db.connect(':memory:')
  })

  it('connect opens GDA connection', () => {
    expect(mockGda.Connection.open_from_string).toHaveBeenCalled()
  })

  it('disconnect closes connection', async () => {
    await db.disconnect()
    expect(mockCxn.close).toHaveBeenCalled()
  })

  it('query executes SELECT and returns typed rows', async () => {
    const mockRows = [{ id: '1', name: 'Game1', source_id: 'fitgirl' }]
    mockCxn.execute_select_command.mockReturnValue(createMockModel(mockRows))
    const rows = await db.query<GameRow>('SELECT * FROM games')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.name).toBe('Game1')
  })

  it('query returns empty when no results', async () => {
    mockCxn.execute_select_command.mockReturnValue(null)
    const rows = await db.query<GameRow>('SELECT * FROM games WHERE id = //1', ['nonexistent'])
    expect(rows).toHaveLength(0)
  })

  it('execute runs non-SELECT command', async () => {
    mockCxn.execute_non_select_command.mockReturnValue(1)
    const affected = await db.execute('DELETE FROM games WHERE id = //1', ['1'])
    expect(affected).toBe(1)
  })

  it('migrate creates tables', async () => {
    expect(mockCxn.execute_non_select_command).toHaveBeenCalled()
  })

  it('insertGame inserts game row', async () => {
    const game = {
      id: 'game1', name: 'Test Game', sourceId: 'fitgirl' as const,
      sourceGameId: 'sg1', url: '', description: '', size: '10GB',
      sizeBytes: 10000000000, lastUpdated: '2024-01-01',
      downloadType: 'direct' as const, imageUrl: undefined, tags: [],
    }
    await db.insertGame(game)
    expect(mockCxn.execute_non_select_command).toHaveBeenCalled()
  })

  it('getGame retrieves single game', async () => {
    const mockRows = [{ id: 'g1', name: 'Game1', source_id: 'fitgirl', source_game_id: 'sg1', url: '', description: '', size_bytes: 1000, last_updated: '', download_type: 'direct', image_url: null, installed: 0, install_path: null, created_at: '2024-01-01', checksum: null, resume_offset: 0 }]
    mockCxn.execute_select_command.mockReturnValue(createMockModel(mockRows))
    const game = await db.getGame('g1')
    expect(game).not.toBeNull()
    expect(game!.name).toBe('Game1')
  })

  it('getAllGames returns all or filtered by source', async () => {
    const mockRows = [{ id: 'g1', name: 'A', source_id: 'fitgirl', source_game_id: 'sg1', url: '', description: '', size_bytes: 0, last_updated: '', download_type: 'direct', image_url: null, installed: 0, install_path: null, created_at: '', checksum: null, resume_offset: 0 }]
    mockCxn.execute_select_command.mockReturnValue(createMockModel(mockRows))
    const all = await db.getAllGames()
    expect(all).toHaveLength(1)
    const filtered = await db.getAllGames('dodi')
    expect(filtered).toHaveLength(1)
  })

  it('logPipelineStep inserts log entry', async () => {
    await db.logPipelineStep('g1', 'downloading', 'running')
    expect(mockCxn.execute_non_select_command).toHaveBeenCalled()
  })

  it('startPlaySession writes session', async () => {
    mockGLib.uuid_string_random.mockReturnValue('session-abc')
    const id = await db.startPlaySession('g1')
    expect(id).toBe('session-abc')
  })

  it('endPlaySession updates session end', async () => {
    await db.endPlaySession('session-abc')
    expect(mockCxn.execute_non_select_command).toHaveBeenCalled()
  })

  it('getPlaytime calculates total from sessions', async () => {
    mockCxn.execute_select_command.mockReturnValue(createMockModel([{ total: 3600 }]))
    const playtime = await db.getPlaytime('g1')
    expect(playtime).toBe(3600)
  })

  it('getLaunchOptions returns empty when none set', async () => {
    mockCxn.execute_select_command.mockReturnValue(null)
    const opts = await db.getLaunchOptions('g1')
    expect(opts).toEqual({ env: {}, args: '' })
  })

  it('setLaunchOptions stores env and args', async () => {
    await db.setLaunchOptions('g1', { DXVK_HUD: '1' }, '--windowed')
    expect(mockCxn.execute_non_select_command).toHaveBeenCalled()
  })

  it('getResumeOffset returns 0 when not set', async () => {
    mockCxn.execute_select_command.mockReturnValue(createMockModel([{ resume_offset: 500 }]))
    const offset = await db.getResumeOffset('g1')
    expect(offset).toBe(500)
  })

  it('setResumeOffset updates offset', async () => {
    await db.setResumeOffset('g1', 1000)
    expect(mockCxn.execute_non_select_command).toHaveBeenCalled()
  })
})
