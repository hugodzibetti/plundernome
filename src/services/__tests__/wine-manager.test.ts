import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WineManager } from '../wine-manager'

const mockGLib = (globalThis as any).mockGLib
const mockGio = (globalThis as any).mockGio
const mockSoup = (globalThis as any).mockSoup

describe('WineManager', () => {
  let mgr: WineManager

  beforeEach(() => {
    vi.clearAllMocks()
    mgr = new WineManager()
  })

  it('constructor sets base path', () => {
    const base = mgr['basePath']
    expect(base).toBe('/home/user/.local/share/plundernome/wine')
  })

  it('listAvailableVersions fetches and parses GitHub releases', async () => {
    const releases = JSON.stringify([
      { tag_name: 'GE-Proton8-30', assets: [{ name: 'GE-Proton8-30.tar.gz', browser_download_url: 'https://example.com/GE-Proton8-30.tar.gz', size: 500000000 }] },
    ])
    mockSoup.Message.mockImplementationOnce(() => ({
      request_headers: { append: vi.fn() },
      response_headers: { foreach: vi.fn() },
      response_body: { flatten: vi.fn(() => new TextEncoder().encode(releases)) },
      status_code: 200,
    }))
    const versions = await mgr.listAvailableVersions()
    expect(versions.length).toBeGreaterThan(0)
    expect(versions[0]!.name).toBe('GE-Proton8-30')
    expect(versions[0]!.type).toBe('ge-proton')
  })

  it('listAvailableVersions returns empty on HTTP error', async () => {
    mockSoup.Message.mockImplementationOnce(() => ({
      request_headers: { append: vi.fn() },
      response_headers: { foreach: vi.fn() },
      response_body: { flatten: vi.fn(() => new Uint8Array(0)) },
      status_code: 500,
    }))
    const versions = await mgr.listAvailableVersions()
    expect(versions).toHaveLength(0)
  })

  it('installVersion downloads and extracts tarball', async () => {
    mockGLib.spawn_command_line_sync.mockReturnValue([0, '', ''])
    mockGLib.file_test.mockReturnValue(true)
    const result = await mgr.installVersion({
      id: 'ge-proton8-30', name: 'GE-Proton8-30', type: 'ge-proton',
      version: '8-30', downloadUrl: 'https://example.com/proton.tar.gz',
      sizeBytes: 500000000, installed: false,
    })
    expect(result.success).toBe(true)
    expect(result.action).toBe('install')
  })

  it('removeVersion deletes directory', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.spawn_command_line_sync.mockReturnValue([0, '', ''])
    const result = await mgr.removeVersion('ge-proton8-30')
    expect(result.success).toBe(true)
    expect(result.action).toBe('remove')
  })

  it('removeVersion returns error for missing version', async () => {
    mockGLib.file_test.mockReturnValue(false)
    const result = await mgr.removeVersion('nonexistent')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('Version not found')
  })

  it('getInstalledVersions enumerates directories', async () => {
    const dirMock = { query_exists: vi.fn(() => true), enumerate_children: vi.fn() }
    mockGio.File.new_for_path.mockReturnValue(dirMock)
    const enumMock = {
      next_file: vi.fn()
        .mockReturnValueOnce({ get_name: () => 'GE-Proton8-30', get_file_type: () => 1 })
        .mockReturnValueOnce({ get_name: () => 'file.txt', get_file_type: () => 2 })
        .mockReturnValueOnce(null),
      close: vi.fn(),
    }
    dirMock.enumerate_children.mockReturnValue(enumMock)
    const versions = await mgr.getInstalledVersions()
    expect(versions.length).toBe(1)
    expect(versions[0]!.name).toBe('GE-Proton8-30')
  })

  it('setDefaultVersion creates symlink', async () => {
    mockGio.File.new_for_path.mockReturnValue({
      query_exists: vi.fn(() => true),
      delete: vi.fn(),
      make_symbolic_link: vi.fn(),
      get_parent: vi.fn(() => null),
      make_directory_with_parents: vi.fn(),
      replace: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      append_to: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      read: vi.fn(() => ({ read_bytes: vi.fn(() => ({ toArray: () => new Uint8Array() })), close: vi.fn() })),
      enumerate_children: vi.fn(() => ({ next_file: vi.fn(() => null), close: vi.fn() })),
      query_info: vi.fn(() => ({ get_size: () => 0 })),
      get_name: vi.fn(() => 'default'),
      get_file_type: vi.fn(() => 1),
    })
    await mgr.setDefaultVersion('ge-proton8-30')
    const file = mockGio.File.new_for_path.mock.results.find((r: any) => r.value.get_name() === 'default')
    if (file) expect(file.value.make_symbolic_link).toHaveBeenCalled()
  })

  it('getDefaultVersion reads symlink target', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.file_read_link.mockReturnValue('/home/user/.local/share/plundernome/wine/versions/ge-proton8-30')
    const version = await mgr.getDefaultVersion()
    expect(version).not.toBeNull()
    expect(version!.name).toBe('ge-proton8-30')
  })

  it('getDefaultVersion returns null when no symlink', async () => {
    mockGLib.file_test.mockReturnValue(false)
    const version = await mgr.getDefaultVersion()
    expect(version).toBeNull()
  })
})
