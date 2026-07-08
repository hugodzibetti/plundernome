import type { PlatformID, BIOSInfo } from '../../domain/emulator/types'
import type { IBIOSDetector } from '../types'
import type { DatabaseService } from '../database/database'

const KNOWN_BIOS: Array<{ filename: string; platformId: PlatformID; expectedCrc32: string }> = [
  { filename: 'SCPH1001.BIN', platformId: 'ps1', expectedCrc32: '924e392e' },
  { filename: 'SCPH5500.BIN', platformId: 'ps1', expectedCrc32: '8dd7d529' },
  { filename: 'SCPH5501.BIN', platformId: 'ps1', expectedCrc32: '490f666e' },
  { filename: 'SCPH5502.BIN', platformId: 'ps1', expectedCrc32: '32736f86' },
  { filename: 'SCPH70012.BIN', platformId: 'ps2', expectedCrc32: 'a013b0f3' },
  { filename: 'SCPH39001.BIN', platformId: 'ps2', expectedCrc32: '68c652b4' },
  { filename: 'dc_boot.bin', platformId: 'dreamcast', expectedCrc32: 'e10c28c3' },
  { filename: 'dc_flash.bin', platformId: 'dreamcast', expectedCrc32: '0a93bc94' },
]

const CRC_TABLE: number[] = Array.from({ length: 256 }, (_, i) => {
  let crc = i
  for (let j = 0; j < 8; j++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
  return crc
})

function crc32(data: Uint8Array): string {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    const idx = (crc ^ (data[i] as number)) & 0xff
    crc = (CRC_TABLE[idx] as number) ^ (crc >>> 8)
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0')
}

export class BIOSDetector implements IBIOSDetector {
  constructor(private readonly db: DatabaseService) {}

  async check(path: string): Promise<BIOSInfo[]> {
    const { Gio } = imports.gi
    const results: BIOSInfo[] = []
    try {
      const dir = Gio.File.new_for_path(path)
      const enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null)
      if (!enumerator) return results
      const files: string[] = []
      while (true) {
        const info = enumerator.next_file(null)
        if (!info) break
        const name = info.get_name()
        if (info.get_file_type() === Gio.FileType.REGULAR) files.push(name)
      }
      enumerator.close(null)
      for (const bios of KNOWN_BIOS) {
        const found = files.find(f => f.toLowerCase() === bios.filename.toLowerCase())
        if (found) {
          const fullPath = `${path}/${found}`
          const actualCrc = this.computeFileCrc32(fullPath)
          const match = actualCrc === bios.expectedCrc32
          results.push({
            platformId: bios.platformId,
            filename: bios.filename,
            expectedCrc32: bios.expectedCrc32,
            found: match,
            path: match ? fullPath : undefined,
          })
        } else {
          results.push({
            platformId: bios.platformId,
            filename: bios.filename,
            expectedCrc32: bios.expectedCrc32,
            found: false,
          })
        }
      }
      return results
    } catch {
      return results
    }
  }

  async verifyChecksum(filePath: string): Promise<boolean> {
    try {
      const actual = this.computeFileCrc32(filePath)
      return KNOWN_BIOS.some(b => b.expectedCrc32 === actual)
    } catch {
      return false
    }
  }

  private computeFileCrc32(filePath: string): string {
    const { Gio } = imports.gi
    const file = Gio.File.new_for_path(filePath)
    const [, contents] = file.load_contents(null)
    if (!contents) throw new Error(`Cannot read ${filePath}`)
    const data = contents instanceof Uint8Array ? contents : new Uint8Array(contents)
    return crc32(data)
  }
}
