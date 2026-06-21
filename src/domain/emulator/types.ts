export type PlatformID =
  | 'ps1' | 'ps2' | 'psp' | 'ps3' | 'psvita'
  | 'nes' | 'snes' | 'n64' | 'gamecube' | 'wii' | 'wiiu' | 'switch'
  | 'gb' | 'gbc' | 'gba' | 'nds' | '3ds'
  | 'mastersystem' | 'genesis' | 'gamegear' | 'saturn' | 'dreamcast'
  | 'pce' | 'ngpocket' | 'wonderswan'
  | 'xbox360' | 'mame'

export interface EmulatorDef {
  platformId: PlatformID
  name: string
  binaryName: string
  flatpakId?: string
  romExtensions: string[]
  needsBios: boolean
  biosFiles?: string[]
  launchArgs?: string[]
}

export interface ROMEntry {
  id: string
  path: string
  name: string
  platformId: PlatformID
  sizeBytes: number
  lastModified: string
  emulatorBinary?: string
  metadataId?: string
}

export interface EmulatorConfig {
  platformId: PlatformID
  emulatorPath: string
  romFolders: string[]
  biosPath?: string
  configPath?: string
  launchArgs?: string[]
}

export interface BIOSInfo {
  platformId: PlatformID
  filename: string
  expectedCrc32: string
  found: boolean
  path?: string
}
