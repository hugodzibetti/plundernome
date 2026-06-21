import type { PlatformID, ROMEntry } from '../../domain/emulator/types'
import type { IROMScanner } from '../types'

const EXT_MAP: Record<string, PlatformID> = {
  '.ps1': 'ps1', '.ps2': 'ps2', '.ps3': 'ps3',
  '.psv': 'psvita',
  '.nes': 'nes', '.sfc': 'snes', '.smc': 'snes',
  '.n64': 'n64', '.z64': 'n64', '.v64': 'n64',
  '.gcm': 'gamecube', '.gcz': 'gamecube', '.wbfs': 'wii', '.ciso': 'wii',
  '.wud': 'wiiu', '.wux': 'wiiu', '.wua': 'wiiu',
  '.nsp': 'switch', '.xci': 'switch', '.nca': 'switch',
  '.gb': 'gb', '.gbc': 'gbc', '.gba': 'gba',
  '.nds': 'nds', '.3ds': '3ds', '.cia': '3ds',
  '.md': 'genesis', '.gen': 'genesis',
  '.cdi': 'dreamcast', '.gdi': 'dreamcast',
  '.cso': 'psp', '.pbp': 'psp',
  '.chd': 'ps1',
}

const SHARED_EXT_MAP: Record<string, PlatformID> = {
  '.iso': 'ps1', '.bin': 'ps1', '.cue': 'ps1', '.img': 'ps1',
}

export class ROMScanner implements IROMScanner {
  async scanFolder(folderPath: string): Promise<ROMEntry[]> {
    return this.walkDir(folderPath)
  }

  async scanAllFolders(folders: string[]): Promise<ROMEntry[]> {
    const results: ROMEntry[] = []
    for (const folder of folders) {
      const entries = await this.scanFolder(folder)
      results.push(...entries)
    }
    return results
  }

  private walkDir(dirPath: string): ROMEntry[] {
    const { Gio } = imports.gi
    const results: ROMEntry[] = []
    try {
      const dir = Gio.File.new_for_path(dirPath)
      const enumerator = dir.enumerate_children(
        'standard::name,standard::type,standard::size,time::modified',
        Gio.FileQueryInfoFlags.NONE,
        null
      )
      if (!enumerator) return results
      while (true) {
        const info = enumerator.next_file(null)
        if (!info) break
        const name = info.get_name()
        if (name === '.' || name === '..') continue
        const child = dir.get_child(name)
        const fullPath = child.get_path()
        const fileType = info.get_file_type()
        if (fileType === Gio.FileType.DIRECTORY) {
          results.push(...this.walkDir(fullPath))
        } else if (fileType === Gio.FileType.REGULAR) {
          const entry = this.matchFile(name, fullPath, info)
          if (entry) results.push(entry)
        }
      }
      enumerator.close(null)
    } catch { }
    return results
  }

  private matchFile(name: string, fullPath: string, info: GioFileInfo): ROMEntry | null {
    const dotIdx = name.lastIndexOf('.')
    if (dotIdx < 0) return null
    const ext = name.substring(dotIdx).toLowerCase()
    const baseName = dotIdx > 0 ? name.substring(0, dotIdx) : name
    let platformId = EXT_MAP[ext]
    if (!platformId) {
      platformId = SHARED_EXT_MAP[ext]
      if (platformId) {
        const size = info.get_size()
        platformId = this.disambiguateShared(ext, size)
      }
    }
    if (!platformId) return null
    const microsec = info.get_attribute_uint64('time::modified')
    const lastModified = new Date(microsec / 1000).toISOString()
    return {
      id: `${platformId}:${fullPath}`,
      path: fullPath,
      name: baseName,
      platformId,
      sizeBytes: info.get_size(),
      lastModified,
    }
  }

  private disambiguateShared(ext: string, size: number): PlatformID {
    if (ext === '.iso') {
      if (size > 4_700_000_000) return 'ps3'
      return 'ps1'
    }
    if (ext === '.bin') {
      if (size < 700_000_000) return 'ps1'
      if (size < 1_500_000_000) return 'ps2'
      return 'genesis'
    }
    if (ext === '.cue') return 'ps1'
    if (ext === '.img') return 'ps1'
    return 'ps1'
  }
}
