import type { LaunchResult } from './launcher-types'

export interface IEmulatorDetector {
  detectAll(): Promise<import('../domain/emulator/types').EmulatorConfig[]>
  detectBinary(binaryName: string): Promise<string | null>
  detectEmulator(platformId: import('../domain/emulator/types').PlatformID): Promise<string | null>
}

export interface IROMScanner {
  scanFolder(path: string): Promise<import('../domain/emulator/types').ROMEntry[]>
  scanAllFolders(folders: string[]): Promise<import('../domain/emulator/types').ROMEntry[]>
}

export interface IEmulatorLauncher {
  launch(romPath: string, platformId: import('../domain/emulator/types').PlatformID, emulatorPath: string): Promise<LaunchResult>
  launchWithConfig(romEntry: import('../domain/emulator/types').ROMEntry, config: import('../domain/emulator/types').EmulatorConfig): Promise<LaunchResult>
}

export interface IBIOSDetector {
  check(path: string): Promise<import('../domain/emulator/types').BIOSInfo[]>
  verifyChecksum(filePath: string): Promise<boolean>
}
