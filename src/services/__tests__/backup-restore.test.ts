import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BackupRestoreService } from '../backup-restore'
import { DatabaseService } from '../database'

const mockGLib = (globalThis as any).mockGLib
const mockGio = (globalThis as any).mockGio
const mockGda = (globalThis as any).mockGda
const mockGdaConnection = (globalThis as any).mockGdaConnection

function createMockModel(rows: Record<string, unknown>[]): any {
  if (rows.length === 0) return null
  const columns = Object.keys(rows[0]!)
  return {
    get_n_columns: () => columns.length,
    get_n_rows: () => rows.length,
    get_column_name: (j: number) => columns[j]!,
    get_value_at: (j: number, i: number) => {
      const val = rows[i]![columns[j]!]
      return {
        is_null: () => val === null || val === undefined,
        get_string: () => String(val),
        get_int: () => Number(val),
        get_double: () => Number(val),
        get_boolean: () => Boolean(val),
        to_string: () => String(val),
      }
    },
  }
}

describe('BackupRestoreService', () => {
  let service: BackupRestoreService
  let db: DatabaseService

  beforeEach(async () => {
    vi.clearAllMocks()
    db = new DatabaseService()
    mockGda.Connection.open_from_string.mockReturnValue(mockGdaConnection)
    await db.connect(':memory:')
    service = new BackupRestoreService(db)
  })

  it('exportToJson retrieves data and writes file', async () => {
    mockGdaConnection.execute_select_command
      .mockReturnValueOnce(createMockModel([{ id: 'g1', name: 'Game1', source_id: 'fitgirl', source_game_id: 'sg1', url: '', description: '', size_bytes: 0, last_updated: '', download_type: 'direct', image_url: null, installed: 0, install_path: null, created_at: '', checksum: null, resume_offset: 0 }]))
      .mockReturnValueOnce(createMockModel([{ game_id: 'g1', session_start: '2024-01-01', session_end: '2024-01-02' }]))
    await service.exportToJson('/tmp/backup.json')
    expect(mockGio.File.new_for_path).toHaveBeenCalledWith('/tmp/backup.json')
  })

  it('importFromJson reads file and inserts data', async () => {
    const data = JSON.stringify({
      version: 1,
      exportedAt: '2024-01-01',
      games: [{ id: 'g1', name: 'Game1', source_id: 'fitgirl', source_game_id: 'sg1', url: '', description: '', size_bytes: 1000, last_updated: '', download_type: 'direct', image_url: null, installed: false, install_path: null }],
      playSessions: [{ gameId: 'g1', start: '2024-01-01', end: null }],
    })
    mockGio.File.new_for_path.mockReturnValue({
      read: vi.fn(() => ({
        read_bytes: vi.fn(() => ({ toArray: () => new TextEncoder().encode(data) })),
        close: vi.fn(),
      })),
      query_info: vi.fn(() => ({ get_size: () => data.length })),
      query_exists: vi.fn(() => true),
      get_parent: vi.fn(() => null),
      make_directory_with_parents: vi.fn(),
      replace: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      append_to: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      delete: vi.fn(),
      make_symbolic_link: vi.fn(),
      enumerate_children: vi.fn(() => ({ next_file: vi.fn(() => null), close: vi.fn() })),
      get_name: vi.fn(() => 'file'),
      get_file_type: vi.fn(() => 1),
    })
    await service.importFromJson('/tmp/backup.json')
    expect(mockGdaConnection.execute_non_select_command).toHaveBeenCalled()
  })

  it('importFromJson validates version', async () => {
    const data = JSON.stringify({ version: 0, exportedAt: '', games: [], playSessions: [] })
    mockGio.File.new_for_path.mockReturnValue({
      read: vi.fn(() => ({
        read_bytes: vi.fn(() => ({ toArray: () => new TextEncoder().encode(data) })),
        close: vi.fn(),
      })),
      query_info: vi.fn(() => ({ get_size: () => data.length })),
      query_exists: vi.fn(() => true),
      get_parent: vi.fn(() => null),
      make_directory_with_parents: vi.fn(),
      replace: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      append_to: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      delete: vi.fn(),
      make_symbolic_link: vi.fn(),
      enumerate_children: vi.fn(() => ({ next_file: vi.fn(() => null), close: vi.fn() })),
      get_name: vi.fn(() => 'file'),
      get_file_type: vi.fn(() => 1),
    })
    await expect(service.importFromJson('/tmp/backup.json')).rejects.toThrow('Unsupported backup format')
  })
})
