import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExtractorService } from '../extractor'

const mockGLib = (globalThis as any).mockGLib

describe('ExtractorService', () => {
  let extractor: ExtractorService

  beforeEach(() => {
    vi.clearAllMocks()
    mockGLib.find_program_in_path.mockImplementation((tool: string) => {
      const map: Record<string, string> = { '7z': '/usr/bin/7z', unzip: '/usr/bin/unzip', unrar: '/usr/bin/unrar', tar: '/usr/bin/tar' }
      return map[tool] ?? null
    })
    extractor = new ExtractorService()
  })

  it('constructor detects tools', () => {
    expect(extractor['tools']['7z']).toBe('/usr/bin/7z')
    expect(extractor['tools'].unzip).toBe('/usr/bin/unzip')
    expect(extractor['tools'].unrar).toBe('/usr/bin/unrar')
    expect(extractor['tools'].tar).toBe('/usr/bin/tar')
  })

  it('getSupportedFormats returns available formats', () => {
    const fmts = extractor.getSupportedFormats()
    expect(fmts).toContain('.7z')
    expect(fmts).toContain('.zip')
    expect(fmts).toContain('.rar')
    expect(fmts).toContain('.tar.gz')
  })

  it('extract returns error for missing archive', async () => {
    mockGLib.file_test.mockReturnValue(false)
    const result = await extractor.extract('/nonexistent/file.zip', '/dest')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('not found')
  })

  it('extract returns error for unsupported format', async () => {
    mockGLib.file_test.mockReturnValue(true)
    const result = await extractor.extract('/file.xyz', '/dest')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('Unsupported format')
  })

  it('extract delegates to unzip for .zip', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.spawn_command_line_sync
      .mockReturnValueOnce([0, 'Archive: /file.zip\n  Length      Date    Time    Name\n---------  ---------- -----  ----\n    10000  01-01-2024 00:00   file1.bin\n    20000  01-01-2024 00:00   file2.bin\n---------                     -------\n    30000                     2 files\n', ''])
      .mockReturnValueOnce([0, 'inflating: file1.bin\nextracting: file2.bin\n', ''])
    const result = await extractor.extract('/file.zip', '/dest')
    expect(result.success).toBe(true)
    expect(result.filesExtracted).toBe(2)
  })

  it('extract handles missing unzip tool', async () => {
    mockGLib.find_program_in_path.mockImplementation((tool: string) => tool === '7z' ? '/usr/bin/7z' : null)
    extractor = new ExtractorService()
    mockGLib.file_test.mockReturnValue(true)
    const result = await extractor.extract('/file.zip', '/dest')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('unzip not available')
  })

  it('extract with progress callback calls progress', async () => {
    mockGLib.file_test.mockReturnValue(true)
    mockGLib.spawn_command_line_sync
      .mockReturnValueOnce([0, 'Archive: /file.zip\n    10000  01-01-2024 00:00   file1.bin\n    20000  01-01-2024 00:00   file2.bin\n                     -------\n    30000                     2 files\n', ''])
      .mockReturnValueOnce([0, 'inflating: file1.bin\nextracting: file2.bin\n', ''])
    const onProgress = vi.fn()
    await extractor.extract('/file.zip', '/dest', onProgress)
    expect(onProgress).toHaveBeenCalled()
  })
})
