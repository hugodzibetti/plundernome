export type DepType = 'vcredist' | 'directx' | 'dotnet' | 'xna' | 'physx' | 'openal' | 'other';

export interface Dependency {
  id: string;
  name: string;
  type: DepType;
  required: boolean;
  bundledPath?: string;
  installCommand?: string;
  downloadUrl?: string;
}

export interface CompatProfile {
  needsWine: boolean;
  needsProton: boolean;
  launcherType?: string;
  wineVersion?: string;
  prefixArch: 'win32' | 'win64';
  deps: Dependency[];
  env: Record<string, string>;
  launchCommand?: string;
  mainExecutable?: string;
  isLinuxNative: boolean;
  /** Path to custom Proton binary, overrides auto-detection */
  protonOverridePath?: string;
}

export interface ICompatDetector {
  detect(files: FileEntry[], gameName: string): CompatProfile;
}

export interface IDependencyResolver {
  resolve(deps: Dependency[]): Promise<ResolvedDep[]>;
}

export interface ResolvedDep {
  dep: Dependency;
  resolved: boolean;
  action: 'bundled' | 'download' | 'winetricks' | 'skip' | 'missing';
  details?: string;
}

export interface PrefixConfig {
  path: string;
  arch: 'win32' | 'win64';
  wineVersion: string;
  overrides: Record<string, string>;
}

import type { FileEntry } from '../library-types';
export type { FileEntry };
