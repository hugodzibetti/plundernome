import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computeHash, verifyChecksum } from '../sha256'

const mockGLib = (globalThis as any).mockGLib
const mockGio = (globalThis as any).mockGio

describe('sha256', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computeHash reads file and returns hash', () => {
    const hash = computeHash('/path/to/file.bin')
    expect(mockGio.File.new_for_path).toHaveBeenCalledWith('/path/to/file.bin')
    expect(typeof hash).toBe('string')
    expect(hash.length).toBe(64)
  })

  it('verifyChecksum matches correct hash', async () => {
    mockGLib.Checksum.mockImplementation(() => ({
      update: vi.fn(),
      get_string: () => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    }))
    const result = await verifyChecksum('/path/to/file.bin', 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
    expect(result).toBe(true)
  })

  it('verifyChecksum rejects wrong hash', async () => {
    mockGLib.Checksum.mockImplementation(() => ({
      update: vi.fn(),
      get_string: () => 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    }))
    const result = await verifyChecksum('/path/to/file.bin', '0000000000000000000000000000000000000000000000000000000000000000')
    expect(result).toBe(false)
  })

  it('verifyChecksum handles errors gracefully', async () => {
    mockGLib.Checksum.mockImplementation(() => { throw new Error('read error') })
    const result = await verifyChecksum('/bad/path', 'any')
    expect(result).toBe(false)
  })
})
