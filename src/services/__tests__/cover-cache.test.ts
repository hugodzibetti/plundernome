import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCacheDir, coverPath, cacheExists, ensureCached } from '../cover-cache'

const mockGLib = (globalThis as any).mockGLib
const mockGio = (globalThis as any).mockGio

describe('cover-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getCacheDir creates and returns cache path', () => {
    const dir = getCacheDir()
    expect(dir).toBe('/home/user/.cache/plundernome/covers')
    expect(mockGio.File.new_for_path).toHaveBeenCalledWith('/home/user/.cache/plundernome/covers')
  })

  it('coverPath generates deterministic paths', () => {
    const path1 = coverPath('game1', 'http://example.com/cover.jpg')
    const path2 = coverPath('game1', 'http://example.com/cover.jpg')
    expect(path1).toBe(path2)
    expect(path1).toContain('/home/user/.cache/plundernome/covers/')
    expect(path1).toContain('.jpg')
  })

  it('cacheExists checks file existence', () => {
    mockGLib.file_test.mockReturnValueOnce(true)
    expect(cacheExists('game1', 'http://example.com/cover.jpg')).toBe(true)
    expect(mockGLib.file_test).toHaveBeenCalled()
  })

  it('cacheExists returns false for missing cache', () => {
    mockGLib.file_test.mockReturnValueOnce(false)
    expect(cacheExists('game1', 'http://example.com/cover.jpg')).toBe(false)
  })

  it('ensureCached returns path for existing cache', async () => {
    mockGLib.file_test.mockReturnValue(true)
    const path = await ensureCached('game1', 'http://example.com/cover.jpg')
    expect(path).toContain('mock-cover-hash')
  })

  it('ensureCached downloads and caches when not present', async () => {
    mockGLib.file_test.mockReturnValue(false)
    const httpService = {
      download: vi.fn(() => Promise.resolve({ success: true, bytesDownloaded: 100, totalBytes: 100, elapsedMs: 0 })),
    }
    const path = await ensureCached('game1', 'http://example.com/cover.jpg', httpService)
    expect(httpService.download).toHaveBeenCalled()
    expect(path).toContain('mock-cover-hash')
  })

  it('ensureCached returns empty when download fails', async () => {
    mockGLib.file_test.mockReturnValue(false)
    const httpService = {
      download: vi.fn(() => Promise.resolve({ success: false, bytesDownloaded: 0, totalBytes: 0, elapsedMs: 0, errorMessage: 'fail' })),
    }
    const path = await ensureCached('game1', 'http://example.com/cover.jpg', httpService)
    expect(path).toBe('')
  })
})
