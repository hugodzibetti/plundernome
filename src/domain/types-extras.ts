import type { SourceID, Game } from './models'

export type DepType = 'vcredist' | 'directx' | 'dotnet' | 'xna' | 'physx' | 'openal' | 'other'

export interface CompatProfile {
  needsWine: boolean
  needsProton: boolean
  launcherType?: string
  wineVersion?: string
  prefixArch: 'win32' | 'win64'
  deps: Dependency[]
  env: Record<string, string>
  launchCommand?: string
  mainExecutable?: string
  isLinuxNative: boolean
}

export interface Dependency {
  id: string
  name: string
  type: DepType
  required: boolean
  bundledPath?: string
  installCommand?: string
  downloadUrl?: string
}

export type Result<T, E = string> =
  | { ok: true; value: T }
  | { ok: false; error: E }

export interface ScrapeResult {
  sourceId: SourceID
  games: Game[]
  scrapedAt: string
  totalGames: number
  success: boolean
  errorMessage?: string
}

export interface FileEntry {
  path: string
  name: string
  size: number
  isDirectory: boolean
  extension: string
}
