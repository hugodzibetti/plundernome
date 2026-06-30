import type { ControllerDeps } from './types'
import type { AppController } from './index'
import type { Game } from '../domain/models'
import type { GameRow } from '../services/types'
import { detectCompat } from '../domain/compat/detector'
import { buildPlayHandler, buildRemoveHandler } from './handlers'
import { wireMetadataEnrichment } from './metadata-wirer'
import { wirePipelineEvents } from './pipeline-wirer'
import { wireSources, wireBackup } from './settings-wirer'
import { fetchProtonRatingsBg, startHealthChecks } from './health-wirer'
import { computeRecommendations } from '../services/recommendations'
import { scrapeAllSources } from './scraper'
import { buildParsersMap } from './parser-map'
import { HtmlParserServiceNew2 } from '../services/html-parser-new2'

export function wireCatalogView(ctrl: AppController, deps: ControllerDeps): void {
  deps.catalogView.onDownloadGame(ctrl.downloadHandler)
  deps.catalogView.onOpenSettings(() => deps.window.navigateTo('settings'))
  deps.catalogView.onRetryFetch(async () => {
    const sources = (ctrl as unknown as { sources: import('../domain/catalog/types').SourceDefinition[] }).sources
    const http = (ctrl as unknown as { http: import('../services/types').IHttpService }).http
    ctrl.allGames = await scrapeAllSources(sources, http, buildParsersMap(new HtmlParserServiceNew2()), ctrl.db)
    deps.catalogView.setGames(ctrl.allGames)
  })
}

export function wireLibraryView(
  ctrl: AppController,
  deps: ControllerDeps,
  refreshLibrary: () => Promise<void>,
): void {
  const refresh = () => refreshLibrary()
  deps.libraryView.onPlayGame(buildPlayHandler(ctrl.db, ctrl.launcher, deps.window, ctrl.protonRatings, ctrl.wineManager, ctrl.cloudSaveService))
  deps.libraryView.onRemoveGame(buildRemoveHandler(ctrl.db, refresh, deps.window))
  deps.libraryView.onLaunchOptions(async (gameId: string) => {
    const opts = await ctrl.db.getLaunchOptions(gameId)
    const game = ctrl.allGames.find(g => g.id === gameId)
    if (!game) return
    deps.launchOptionsEditor.show(game, { env: opts.env, args: opts.args }, async (id, env, args) => {
      await ctrl.db.setLaunchOptions(id, env, args)
      deps.window.showToast('Launch options saved')
    })
  })
  deps.libraryView.onOpenCatalog(() => deps.window.navigateTo('catalog'))
}

export function wireErrorLog(ctrl: AppController, deps: ControllerDeps): void {
  deps.settingsView.onRefreshLogs(async (filter) => {
    const entries = await ctrl.db.getPipelineLogs(filter)
    deps.settingsView.setLogEntries(entries)
  })
  ctrl.db.getPipelineLogs({ limit: 100 }).then((entries) => deps.settingsView.setLogEntries(entries))
  ctrl.db.getLogGameIds().then((ids) => deps.settingsView.setLogGameIds(ids))
}

export function wireEmulatorDetection(ctrl: AppController, deps: ControllerDeps): void {
  const { GLib } = imports.gi
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
    ctrl.emulatorDetector.detectAll().then((configs) => {
      ctrl.detectedEmulators = configs
      const results = configs.map((c) => ({
        platformId: c.platformId,
        binaryPath: c.emulatorPath,
        source: 'system',
      }))
      deps.emulatorsView.setPlatforms(results)
    })
    return false
  })
}

export function wireEmulatorScan(ctrl: AppController, deps: ControllerDeps): void {
  deps.emulatorsView.onScanROMS((folderPath: string) => {
    ctrl.romScanner.scanFolder(folderPath).then((roms) => {
      ctrl.scannedROMs = roms
      deps.emulatorsView.setROMs(roms)
      deps.window.showToast(`Found ${roms.length} ROMs in folder`)
    })
  })
}

export async function wireHomeView(ctrl: AppController, deps: ControllerDeps): Promise<void> {
  const recentlyPlayedIds = await ctrl.db.getRecentlyPlayedGames()
  const recentlyPlayed = recentlyPlayedIds
    .map((r) => ctrl.allGames.find((g) => g.id === r.gameId))
    .filter((g): g is Game => g !== undefined)
  deps.homeView.setContinuePlaying(recentlyPlayed)

  const sorted = [...ctrl.allGames].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
  deps.homeView.setRecentlyAdded(sorted.slice(0, 8))

  const installedRows = await ctrl.db.query<GameRow>("SELECT * FROM games WHERE install_path IS NOT NULL")
  const wishlistedIds = new Set(await ctrl.db.getWishlisted())
  const recommended = computeRecommendations(ctrl.allGames, installedRows, wishlistedIds)
  deps.homeView.setTrending(recommended)

  deps.homeView.onDownloadGame(ctrl.downloadHandler)
  deps.homeView.onNavigate('catalog', () => deps.window.navigateTo('catalog'))
  deps.homeView.onNavigate('library', () => deps.window.navigateTo('library'))
  deps.homeView.onNavigate('downloads', () => deps.window.navigateTo('downloads'))
  deps.homeView.onNavigate('settings', () => deps.window.navigateTo('settings'))
}

export function wireEmulatorLaunch(ctrl: AppController, deps: ControllerDeps): void {
  deps.emulatorsView.onLaunchROM((romId: string) => {
    const rom = ctrl.scannedROMs.find((r) => r.id === romId)
    if (!rom) { deps.window.showToast('ROM not found', 'high'); return }
    const config = ctrl.detectedEmulators.find((c) => c.platformId === rom.platformId)
    if (!config) { deps.window.showToast('No emulator found for platform', 'high'); return }
    ctrl.emulatorLauncher.launchWithConfig(rom, config).then((result) => {
      deps.window.showToast(result.success ? `Launched ${rom.name}` : `Launch failed: ${result.errorMessage ?? 'unknown'}`, result.success ? 'normal' : 'high')
    })
  })
}

export async function refreshLibrary(ctrl: AppController): Promise<void> {
  const rows = await ctrl.db.query<GameRow>('SELECT * FROM games ORDER BY name')
  const entries = await Promise.all(
    rows.map(async (row) => {
      const game: Game & { installPath?: string } = {
        id: row.id,
        name: row.name,
        sourceId: row.source_id,
        sourceGameId: row.source_game_id,
        url: row.url ?? '',
        description: row.description ?? '',
        size: '',
        sizeBytes: row.size_bytes ?? 0,
        lastUpdated: row.last_updated ?? '',
        downloadType: (row.download_type ?? 'direct') as Game['downloadType'],
        imageUrl: row.image_url ?? undefined,
        tags: [],
        installPath: row.install_path ?? undefined,
      }
      const playtime = await ctrl.db.getPlaytime(row.id)
      return {
        game,
        profile: detectCompat([], game.name),
        playtime,
        protonRating: ctrl.protonRatings.get(game.name),
      }
    }),
  )
  ctrl.deps.libraryView.setGames(entries)
}

export function wireDiscoverView(ctrl: AppController, deps: ControllerDeps): void {
  const games = ctrl.allGames

  const featured = [...games].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 5)
  deps.discoverView.setFeatured(featured)

  deps.discoverView.setTrending(featured.slice(0, 24))

  const tags = [...new Set(games.flatMap(g => g.tags))].sort()
  deps.discoverView.setCategories(tags)

  deps.discoverView.onSelectCategory(tag => {
    const filtered = games.filter(g => g.tags.includes(tag))
    deps.discoverView.setCategory(tag, filtered)
  })

  deps.discoverView.onDownloadGame(ctrl.downloadHandler)
}

export function wireAllFeatures(ctrl: AppController, deps: ControllerDeps): void {
  wireMetadataEnrichment(ctrl.metadataProvider, ctrl.allGames, deps.catalogView)
  wireEmulatorDetection(ctrl, deps)
  wireEmulatorScan(ctrl, deps)
  wireEmulatorLaunch(ctrl, deps)
  wireHomeView(ctrl, deps)
  wireDiscoverView(ctrl, deps)
}
