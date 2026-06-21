import type { FileEntry, CompatProfile, Dependency } from '../models'

export interface ICompatDetector {
  detect(files: FileEntry[], gameName: string): CompatProfile
}

export interface IDependencyResolver {
  resolve(deps: Dependency[]): Promise<ResolvedDep[]>
}

export interface ResolvedDep {
  dep: Dependency
  resolved: boolean
  action: 'bundled' | 'download' | 'winetricks' | 'skip' | 'missing'
  details?: string
}

export interface PrefixConfig {
  path: string
  arch: 'win32' | 'win64'
  wineVersion: string
  overrides: Record<string, string>
}
