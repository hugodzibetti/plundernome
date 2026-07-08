import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Launcher } from '../launcher/launcher'
import { DatabaseService } from '../database/database'

const mockGLib = (globalThis as any).mockGLib
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

describe('Launcher', () => {
  let launcher: Launcher
  let db: DatabaseService

  beforeEach(async () => {
    vi.clearAllMocks()
    db = new DatabaseService()
    mockGda.Connection.open_from_string.mockReturnValue(mockGdaConnection)
    await db.connect(':memory:')
    launcher = new Launcher(db)
  })

  it('constructor accepts database service', () => {
    expect(launcher).toBeInstanceOf(Launcher)
  })

  it('launch returns error for missing executable', async () => {
    mockGLib.file_test.mockReturnValue(false)
    const result = await launcher.launch('/nonexistent/game.exe', { needsWine: true, needsProton: false, prefixArch: 'win64', deps: [], env: {}, isLinuxNative: false }, 'game1')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('not found')
  })

  it('launch checks wine availability', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.find_program_in_path.mockReturnValue(null)
    const result = await launcher.launch('/game.exe', { needsWine: true, needsProton: false, prefixArch: 'win64', deps: [], env: {}, isLinuxNative: false }, 'game1')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('Wine not found')
  })

  it('launch checks proton availability', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.glob.mockReturnValue([])
    const result = await launcher.launch('/game.exe', { needsWine: true, needsProton: true, prefixArch: 'win64', deps: [], env: {}, isLinuxNative: false }, 'game1')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('Proton not found')
  })

  it('launch calls spawn_async with correct command', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.find_program_in_path.mockReturnValue('/usr/bin/wine')
    const result = await launcher.launch('/game.exe', { needsWine: true, needsProton: false, prefixArch: 'win64', deps: [], env: {}, isLinuxNative: false }, 'game1')
    expect(result.success).toBe(true)
    expect(mockGLib.spawn_async).toHaveBeenCalled()
  })

  it('launch tracks play session', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.find_program_in_path.mockReturnValue('/usr/bin/wine')
    mockGdaConnection.execute_select_command.mockReturnValue(null)
    await launcher.launch('/game.exe', { needsWine: true, needsProton: false, prefixArch: 'win64', deps: [], env: {}, isLinuxNative: false }, 'game1')
    expect(mockGLib.child_watch_add).toHaveBeenCalled()
  })

  it('createDesktopEntry writes .desktop file', async () => {
    const game = {
      id: 'g1', name: 'Test Game', sourceId: 'fitgirl' as const,
      sourceGameId: 'sg1', url: '', description: '', size: '10GB',
      sizeBytes: 1000, lastUpdated: '', downloadType: 'direct' as const,
      imageUrl: 'http://example.com/icon.png', tags: [],
    }
    await launcher.createDesktopEntry(game, '/game.exe')
    expect(mockGLib.file_set_contents).toHaveBeenCalledWith(
      '/home/user/.local/share/applications/plundernome-g1.desktop',
      expect.stringContaining('Test Game')
    )
  })

  it('custom launch options merge env and args', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.find_program_in_path.mockReturnValue('/usr/bin/wine')
    mockGdaConnection.execute_select_command.mockReturnValue(createMockModel([{ env_json: '{"MY_VAR":"value"}', args: '--windowed' }]))
    const result = await launcher.launch('/game.exe', { needsWine: true, needsProton: false, prefixArch: 'win64', deps: [], env: { DXVK_HUD: '1' }, isLinuxNative: false }, 'game1')
    expect(result.success).toBe(true)
  })
})
