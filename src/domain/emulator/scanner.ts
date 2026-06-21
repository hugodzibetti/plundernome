import type { PlatformID, ROMEntry } from './types'

export interface PlatformROMConfig {
  platformId: PlatformID
  extensions: string[]
}

export function matchPlatformByExtension(filename: string, platformDefs: PlatformROMConfig[]): PlatformID | null {
  const ext = '.' + filename.split('.').pop()?.toLowerCase()
  if (!ext || ext === '.') return null

  for (const def of platformDefs) {
    if (def.extensions.some(e => e.toLowerCase() === ext)) {
      return def.platformId
    }
  }
  return null
}

export function createROMEntry(path: string, name: string, sizeBytes: number, platformId: PlatformID): ROMEntry {
  const id = `${platformId}:${path}`
  return {
    id,
    path,
    name,
    platformId,
    sizeBytes,
    lastModified: new Date().toISOString()
  }
}
