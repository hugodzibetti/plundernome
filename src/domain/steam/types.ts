export interface SteamApp {
  appId: number
  name: string
  installDir: string
  libraryFolder: string
  sizeBytes: number
  lastPlayed?: string
}

export interface SteamLibraryFolder {
  path: string
  label?: string
  apps: SteamApp[]
}

export interface SteamShortcut {
  appId: number
  name: string
  exePath: string
  startDir: string
  launchOptions?: string
  iconPath?: string
  grid?: string
}

export interface VdfEntry {
  [key: string]: string | number | VdfEntry | VdfEntry[]
}
