import type { ISteamService } from '../types'
import type { SteamLibraryFolder, SteamApp, SteamShortcut } from '../../domain/steam/types'
import type { Game } from '../../domain/models'
import type { Achievement } from '../../domain/achievements/types'
import type { VdfEntry } from './vdf-parser'
import { parseVdf } from './vdf-parser'
import type { DatabaseService } from '../database/database'
import { readBinVdf, writeBinVdf, readFileBytes, writeFileBytes } from './vdf-binary'

const GLib = imports.gi.GLib

export class SteamService implements ISteamService {
  constructor(
    private db: DatabaseService,
    private apiKey = '',
    private steamId = ''
  ) {}

  private steamPath = `${GLib.get_home_dir()}/.steam/steam`

  async scanLibrary(): Promise<SteamLibraryFolder[]> {
    const vdfPath = `${this.steamPath}/steamapps/libraryfolders.vdf`
    if (!GLib.file_test(vdfPath, GLib.G_FILE_TEST_EXISTS)) return []
    const raw = readFileBytes(vdfPath)
    if (!raw) return []
    const vdf = parseVdf(new TextDecoder().decode(raw))
    const folders = vdf.libraryfolders as VdfEntry | undefined
    if (!folders) return []
    const results: SteamLibraryFolder[] = []
    for (const entry of Object.values(folders)) {
      if (typeof entry !== 'object') continue
      const f = entry as VdfEntry
      const path = f.path as string
      if (!path) continue
      results.push({ path, label: f.label as string, apps: this.scanAcf(path) })
    }
    return results
  }

  private scanAcf(libPath: string): SteamApp[] {
    const apps: SteamApp[] = []
    const acfDir = `${libPath}/steamapps`
    const acfFiles = GLib.glob(`${acfDir}/*.acf`, 0)
    if (!acfFiles) return apps
    for (const acfPath of acfFiles) {
      const raw = readFileBytes(acfPath as string)
      if (!raw) continue
      const acf = parseVdf(new TextDecoder().decode(raw))
      const s = acf.AppState as VdfEntry | undefined
      if (!s) continue
      const appId = parseInt(s.appid as string, 10)
      if (isNaN(appId)) continue
      apps.push({
        appId,
        name: s.name as string ?? '',
        installDir: s.installdir as string ?? '',
        libraryFolder: libPath,
        sizeBytes: parseInt(s.SizeOnDisk as string ?? '0', 10),
      })
    }
    return apps
  }

  async importApp(gameId: string, appId: number): Promise<void> {
    const game: Game = {
      id: gameId,
      name: `Steam App ${appId}`,
      sourceId: 'steam',
      sourceGameId: String(appId),
      url: `https://store.steampowered.com/app/${appId}`,
      description: '',
      size: '',
      sizeBytes: 0,
      lastUpdated: new Date().toISOString(),
      downloadType: 'direct',
      tags: [],
    }
    await (this.db as any).insertGame(game)
  }

  async createShortcut(shortcut: SteamShortcut): Promise<boolean> {
    const paths = GLib.glob(`${GLib.get_home_dir()}/.steam/steam/userdata/*/config/shortcuts.vdf`, 0)
    if (!paths || paths.length === 0) return false
    const raw = readFileBytes(paths[0] as string)
    if (!raw) return false
    const root = readBinVdf(raw).e
    const shortcuts = root.shortcuts as VdfEntry ?? {}
    const idx = String(Object.keys(shortcuts).length)
    shortcuts[idx] = Object.fromEntries(
      Object.entries({
        appid: shortcut.appId,
        appname: shortcut.name,
        exe: shortcut.exePath,
        StartDir: shortcut.startDir,
        LaunchOptions: shortcut.launchOptions ?? '',
        icon: shortcut.iconPath ?? '',
        grid: shortcut.grid ?? '',
      }).filter(([_, v]) => v !== '')
    ) as unknown as VdfEntry
    root.shortcuts = shortcuts
    writeFileBytes(paths[0] as string, writeBinVdf(root))
    return true
  }

  async removeShortcut(appId: number): Promise<boolean> {
    const paths = GLib.glob(`${GLib.get_home_dir()}/.steam/steam/userdata/*/config/shortcuts.vdf`, 0)
    if (!paths || paths.length === 0) return false
    const raw = readFileBytes(paths[0] as string)
    if (!raw) return false
    const root = readBinVdf(raw).e
    const shortcuts = root.shortcuts as VdfEntry ?? {}
    for (const [key, val] of Object.entries(shortcuts)) {
      if (typeof val === 'object' && (val as VdfEntry).appid === appId) delete shortcuts[key]
    }
    root.shortcuts = shortcuts
    writeFileBytes(paths[0] as string, writeBinVdf(root))
    return true
  }

  async fetchAchievements(appId: number): Promise<Achievement[]> {
    if (!this.apiKey || !this.steamId) return []
    const url = `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${this.apiKey}&steamid=${this.steamId}&appid=${appId}`
    const Soup = imports.gi.Soup
    const session = new Soup.Session()
    const msg = new Soup.Message({ method: 'GET', uri: url })
    const status = session.send(msg, null)
    if (status !== 200) return []
    const body = new TextDecoder().decode(msg.response_body.flatten())
    const data = JSON.parse(body)
    const achievements = data?.playerstats?.achievements ?? []
    return achievements.map((a: Record<string, unknown>) => ({
      id: `steam-${a.apiname}`,
      gameId: String(appId),
      name: a.name as string,
      description: a.description as string,
      unlocked: a.achieved === 1,
      unlockedAt: a.unlocktime ? new Date((a.unlocktime as number) * 1000).toISOString() : undefined,
      source: 'steam' as const,
      steamApiName: a.apiname as string,
      hidden: false,
    }))
  }
}
