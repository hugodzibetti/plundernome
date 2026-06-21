import type { EmulatorDef, PlatformID } from './types'

export interface EmulatorMatch {
  binary: string
  platformId: PlatformID
  confidence: number
}

const knownEmulators: EmulatorDef[] = [
  { platformId: 'ps1', name: 'DuckStation', binaryName: 'duckstation-qt', romExtensions: ['.bin', '.cue', '.iso', '.chd', '.pbp', '.img'], needsBios: true, biosFiles: ['scph5500.bin', 'scph5501.bin', 'scph5502.bin'] },
  { platformId: 'ps2', name: 'PCSX2', binaryName: 'pcsx2-qt', romExtensions: ['.iso', '.bin', '.cue', '.chd', '.cso'], needsBios: true, biosFiles: ['scph39001.bin', 'scph70001.bin'] },
  { platformId: 'psp', name: 'PPSSPP', binaryName: 'ppsspp', romExtensions: ['.iso', '.cso', '.pbp'], needsBios: false },
  { platformId: 'nes', name: 'Mesen', binaryName: 'mesen', romExtensions: ['.nes', '.unf'], needsBios: false },
  { platformId: 'snes', name: 'Snes9x', binaryName: 'snes9x-gtk', romExtensions: ['.sfc', '.smc', '.fig', '.bs'], needsBios: false },
  { platformId: 'n64', name: 'Mupen64Plus', binaryName: 'mupen64plus', romExtensions: ['.n64', '.z64', '.v64'], needsBios: false },
  { platformId: 'gamecube', name: 'Dolphin', binaryName: 'dolphin-emu', romExtensions: ['.iso', '.gcm', '.gcz'], needsBios: false },
  { platformId: 'wii', name: 'Dolphin', binaryName: 'dolphin-emu', romExtensions: ['.iso', '.wbfs', '.ciso', '.gcz'], needsBios: false },
  { platformId: 'gba', name: 'mGBA', binaryName: 'mgba-qt', romExtensions: ['.gba', '.agb'], needsBios: false },
  { platformId: 'nds', name: 'DeSmuME', binaryName: 'desmume', romExtensions: ['.nds', '.rom'], needsBios: false },
  { platformId: 'genesis', name: 'Genesis Plus GX', binaryName: 'genesis-plus-gx', romExtensions: ['.bin', '.gen', '.md', '.smd'], needsBios: false },
  { platformId: 'dreamcast', name: 'Flycast', binaryName: 'flycast', romExtensions: ['.cdi', '.gdi', '.chd', '.cue'], needsBios: true, biosFiles: ['dc_boot.bin', 'dc_flash.bin'] },
  { platformId: 'mame', name: 'MAME', binaryName: 'mame', romExtensions: ['.zip'], needsBios: false },
]

export function matchEmulatorToPlatform(binaryName: string): EmulatorMatch | null {
  const lower = binaryName.toLowerCase()
  for (const def of knownEmulators) {
    const binary = def.binaryName.toLowerCase()
    if (lower === binary || lower.startsWith(binary + ' ') || lower.endsWith('/' + binary)) {
      return { binary: def.binaryName, platformId: def.platformId, confidence: 1 }
    }
    const altBinary = binary.split('-')[0]
    if (lower === altBinary || lower.startsWith(altBinary + ' ')) {
      return { binary: def.binaryName, platformId: def.platformId, confidence: 0.8 }
    }
  }
  return null
}

export function getEmulatorDefs(): EmulatorDef[] {
  return knownEmulators
}

export function getAllROMExtensions(): Map<PlatformID, string[]> {
  const map = new Map<PlatformID, string[]>()
  for (const def of knownEmulators) {
    const existing = map.get(def.platformId)
    if (existing) {
      for (const ext of def.romExtensions) {
        if (!existing.includes(ext)) existing.push(ext)
      }
    } else {
      map.set(def.platformId, [...def.romExtensions])
    }
  }
  return map
}
