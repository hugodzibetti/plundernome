import type { ControllerDeps, IAppController } from './types';
import type { Game } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';
import type { GameRow } from '../services/types';
import type { LogFilter } from '../services/database';
import type { ProtonDBRating } from '../services/protondb';
import type { EmulatorConfig, ROMEntry } from '../domain/emulator/types';
import {
  HttpService,
  DatabaseService,
  NotificationService,
  Launcher,
  PipelineOrchestrator,
  SyncService,
  ExtractorService,
  ProtonDB,
  TorrentService,
  DependencyInstaller,
  SettingsManager,
  GSETTINGS_KEYS,
  MetadataProvider,
  SteamService,
  CloudSaveService,
} from '../services';
import { EmulatorDetector, ROMScanner, EmulatorLauncher } from '../services/emulator';
import { HtmlParserServiceNew2 } from '../services/html-parser-new2';
import { detectCompat } from '../domain/compat/detector';
import { loadSourceDefinitions } from './source-loader';
import { buildParsersMap } from './parser-map';
import { buildImportHandler, buildPlayHandler, buildRemoveHandler } from './handlers';
import { buildDownloadHandler } from './download-handlers';
import { scrapeAllSources } from './scraper';
import { startAutoUpdate } from './auto-updater';
import { wireLANSync } from './lansync-wirer';
import { wireWishlist } from './wishlist-wirer';
import { wireSources, wireBackup } from './settings-wirer';
import { wirePipelineEvents } from './pipeline-wirer';
import { fetchProtonRatingsBg, startHealthChecks } from './health-wirer';
import { wireMetadataEnrichment } from './metadata-wirer';
import { wireSteamImport } from './steam-wirer';
import { wireCloudSave } from './cloud-save-wirer';
import { GjsSystem } from './system';
import type { ISystem } from './system';

export class AppController implements IAppController {
  private http: HttpService;
  private db: DatabaseService;
  private notifications: NotificationService;
  private launcher: Launcher;
  private sources: SourceDefinition[] = [];
  private autoUpdateTimers: number[] = [];
  private healthTimers: number[] = [];
  private allGames: Game[] = [];
  private pipeline: PipelineOrchestrator;
  private syncService: SyncService;
  private protonDB: ProtonDB;
  private protonRatings = new Map<string, ProtonDBRating>();
  private downloadHandler: (gameId: string) => void;
  private sys: ISystem;
  private metadataProvider: MetadataProvider;
  private emulatorDetector: EmulatorDetector;
  private romScanner: ROMScanner;
  private emulatorLauncher: EmulatorLauncher;
  private steamService: SteamService;
  private cloudSaveService: CloudSaveService;
  private detectedEmulators: EmulatorConfig[] = [];
  private scannedROMs: ROMEntry[] = [];

  constructor(private deps: ControllerDeps) {
    this.sys = new GjsSystem();
    this.http = new HttpService('Plundernome/0.1');
    this.db = new DatabaseService();
    this.notifications = new NotificationService();
    this.launcher = new Launcher(this.db);
    this.syncService = new SyncService(this.db);
    const extractor = new ExtractorService();
    this.pipeline = new PipelineOrchestrator(this.db, this.http, extractor, {
      torrent: new TorrentService(),
      depInstaller: new DependencyInstaller(),
    });
    this.protonDB = new ProtonDB((url) => this.http.fetch(url).then((r) => ({ status: r.status, body: r.body })));
    this.metadataProvider = new MetadataProvider(this.http);
    this.emulatorDetector = new EmulatorDetector();
    this.romScanner = new ROMScanner();
    this.emulatorLauncher = new EmulatorLauncher(this.db);
    this.steamService = new SteamService(this.db);
    this.cloudSaveService = new CloudSaveService(this.http, this.db);
    try {
      const s = new SettingsManager();
      const dlDir = s.getString(GSETTINGS_KEYS.INSTALL_PATH) || `${this.sys.getHomeDir()}/Downloads/plundernome`;
      this.downloadHandler = buildDownloadHandler(
        () => this.allGames,
        this.pipeline,
        this.deps.window,
        dlDir,
        (id: string) => this.sources.find((s) => s.id === id)?.mirrors ?? [],
      );
    } catch {
      this.downloadHandler = buildDownloadHandler(
        () => this.allGames,
        this.pipeline,
        this.deps.window,
        `${this.sys.getHomeDir()}/Downloads/plundernome`,
        (id: string) => this.sources.find((s) => s.id === id)?.mirrors ?? [],
      );
    }
  }

  async init(): Promise<void> {
    try {
      await this.db.connect();
      await this.db.migrate();
      this.sources = loadSourceDefinitions();
      this.deps.settingsView.addSources(this.sources);
      this.wireCatalogView();
      this.wireLibraryView();
      wirePipelineEvents(
        this.pipeline,
        this.db,
        this.deps.window,
        this.deps.libraryView,
        this.notifications,
        this.sources,
        () => this.refreshLibrary(),
      );
      this.allGames = await scrapeAllSources(this.sources, this.http, buildParsersMap(new HtmlParserServiceNew2()));
      this.deps.catalogView.setGames(this.allGames);
      fetchProtonRatingsBg(this.allGames, this.protonDB, this.protonRatings);
      await this.refreshLibrary();
      const incomplete = await this.db.getAllIncompletePipelines();
      if (incomplete.length > 0) this.deps.window.showToast(`${incomplete.length} pipeline(s) incomplete — retry`);
      wireLANSync(this.syncService, this.deps.settingsView, this.deps.window);
      wireWishlist(this.deps.catalogView, this.db);
      wireSources(this.deps.settingsView, this.deps.window);
      wireBackup(this.deps.settingsView, this.db, this.deps.window);
      this.autoUpdateTimers = startAutoUpdate(
        this.sources,
        () => scrapeAllSources(this.sources, this.http, buildParsersMap(new HtmlParserServiceNew2())),
        this.deps.catalogView,
      );
      await startHealthChecks(this.http, this.sources, this.deps.settingsView, this.deps.window, this.healthTimers);
      this.wireErrorLog();
      this.wireAllFeatures();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.deps.window.showToast(`Init error: ${msg}`, 'high');
    }
  }

  async shutdown(): Promise<void> {
    for (const id of this.autoUpdateTimers) this.sys.sourceRemove(id);
    this.autoUpdateTimers = [];
    for (const id of this.healthTimers) this.sys.sourceRemove(id);
    this.healthTimers = [];
    await this.db.disconnect();
  }
  private wireCatalogView(): void {
    this.deps.catalogView.onDownloadGame(this.downloadHandler);
  }
  private wireLibraryView(): void {
    const refresh = () => this.refreshLibrary();
    this.deps.libraryView.onImportFolder(buildImportHandler(this.db, refresh, this.deps.window));
    this.deps.libraryView.onPlayGame(buildPlayHandler(this.db, this.launcher, this.deps.window));
    this.deps.libraryView.onRemoveGame(buildRemoveHandler(this.db, refresh, this.deps.window));
    this.deps.libraryView.onLaunchOptions(async (gameId: string) => {
      const game = await this.db.getGame(gameId);
      if (!game) return;
      const { showLaunchOptionsEditor } = await import('../ui/widgets/launch-options-editor');
      const opts = await this.db.getLaunchOptions(gameId);
      showLaunchOptionsEditor(gameId, opts.env, opts.args, async (id, env, args) => {
        await this.db.setLaunchOptions(id, env, args);
        this.deps.window.showToast('Launch options saved');
      });
    });
    this.deps.libraryView.onRefreshLibrary(() => refresh());
    this.deps.libraryView.onOpenCatalog(() => this.deps.window.navigateTo('catalog'));
    this.deps.libraryView.onSteamImport(() => this.deps.libraryView.showImportDialog());
    this.deps.libraryView.onAddToAppMenu(async (gameId: string) => {
      const game = await this.db.getGame(gameId);
      if (!game) return;
      const rows = await this.db.query<{ install_path: string }>('SELECT install_path FROM games WHERE id = //1', [
        gameId,
      ]);
      await this.launcher.createDesktopEntry(game, rows[0]?.install_path || '');
      this.deps.window.showToast(`Added ${game.name} to applications menu`);
    });
    this.deps.libraryView.onRemoveFromAppMenu(async (gameId: string) => {
      await this.launcher.removeDesktopEntry(gameId);
      this.deps.window.showToast('Removed from applications menu');
    });
  }
  private async refreshLibrary(): Promise<void> {
    const rows = await this.db.query<GameRow>('SELECT * FROM games ORDER BY name');
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
        };
        const playtime = await this.db.getPlaytime(row.id as string);
        return {
          game,
          profile: detectCompat([], game.name),
          playtime,
          protonRating: this.protonRatings.get(game.name),
        };
      }),
    );
    this.deps.libraryView.setGames(entries);
  }
  private wireErrorLog(): void {
    this.deps.settingsView.onRefreshLogs(async (filter: LogFilter) => {
      const entries = await this.db.getPipelineLogs(filter);
      this.deps.settingsView.setLogEntries(entries);
    });
    this.db.getPipelineLogs({ limit: 100 }).then((entries) => this.deps.settingsView.setLogEntries(entries));
    this.db.getLogGameIds().then((ids) => this.deps.settingsView.setLogGameIds(ids));
  }
  private wireAllFeatures(): void {
    wireMetadataEnrichment(this.metadataProvider, this.allGames, this.deps.catalogView);
    wireSteamImport(this.steamService, this.deps.libraryView, this.db);
    wireCloudSave(this.cloudSaveService, this.deps.libraryView, this.deps.window);
    this.deps.libraryView.onAchievements(async (gameId: string) => {
      const game = await this.db.getGame(gameId);
      if (!game) return;
      this.deps.window.showToast(`Achievements: ${game.name} — coming soon`);
    });
    this.wireEmulatorDetection();
    this.wireEmulatorScan();
    this.wireEmulatorLaunch();
  }
  private wireEmulatorDetection(): void {
    const { GLib } = imports.gi;
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
      this.emulatorDetector.detectAll().then((configs) => {
        this.detectedEmulators = configs;
        const results = configs.map((c) => ({
          platformId: c.platformId,
          binaryPath: c.emulatorPath,
          source: 'system',
        }));
        this.deps.emulatorsView.setPlatforms(results);
      });
      return false;
    });
  }
  private wireEmulatorScan(): void {
    this.deps.emulatorsView.onScanROMS((folderPath: string) => {
      this.romScanner.scanFolder(folderPath).then((roms) => {
        this.scannedROMs = roms;
        this.deps.emulatorsView.setROMs(roms);
        this.deps.window.showToast(`Found ${roms.length} ROMs in folder`);
      });
    });
  }
  private wireEmulatorLaunch(): void {
    this.deps.emulatorsView.onLaunchROM((romId: string) => {
      const rom = this.scannedROMs.find((r) => r.id === romId);
      if (!rom) {
        this.deps.window.showToast('ROM not found', 'high');
        return;
      }
      const config = this.detectedEmulators.find((c) => c.platformId === rom.platformId);
      if (!config) {
        this.deps.window.showToast('No emulator found for platform', 'high');
        return;
      }
      this.emulatorLauncher.launchWithConfig(rom, config).then((result) => {
        if (result.success) {
          this.deps.window.showToast(`Launched ${rom.name}`);
        } else {
          this.deps.window.showToast(`Launch failed: ${result.errorMessage ?? 'unknown'}`, 'high');
        }
      });
    });
  }
}
