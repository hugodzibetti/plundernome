import type { Game, SourceID, Result } from './models'

export interface SteamApp {
  appId: string
  name: string
  installDir: string
  compatTool?: string
}

export interface SteamLibraryConfig {
  libraryFolders: string[]
}

const STEAM_DEFAULT_PATHS = [
  '~/.local/share/Steam',
  '~/.steam/steam',
  '/usr/share/steam',
]

export function getDefaultSteamPaths(): string[] {
  return STEAM_DEFAULT_PATHS
}

export function parseSteamLibraryFolders(acfContent: string): string[] {
  const folders: string[] = []
  const mountMatch = acfContent.match(/"mount"(?:\s*)"([^"]+)"/g)
  if (mountMatch) {
    for (const m of mountMatch) {
      const val = m.match(/"([^"]+)"$/)
      if (val?.[1]) folders.push(val[1])
    }
  }
  return folders
}

export function parseSteamAppManifest(acfContent: string): SteamApp | null {
  const appId = acfContent.match(/"appid"\s*"(\d+)"/)
  const name = acfContent.match(/"name"\s*"([^"]+)"/)
  const installDir = acfContent.match(/"installdir"\s*"([^"]+)"/)
  if (!appId?.[1] || !name?.[1]) return null

  return {
    appId: appId[1],
    name: name[1],
    installDir: installDir?.[1] ?? name[1],
    compatTool: undefined,
  }
}

export function steamAppToGame(app: SteamApp, sourceId: SourceID): Game {
  return {
    id: `steam-${app.appId}`,
    name: app.name,
    sourceId,
    sourceGameId: app.appId,
    url: `https://store.steampowered.com/app/${app.appId}`,
    description: '',
    size: '',
    sizeBytes: 0,
    lastUpdated: new Date().toISOString(),
    downloadType: 'direct',
    tags: ['steam'],
    imageUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${app.appId}/header.jpg`,
  }
}
