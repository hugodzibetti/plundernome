import type { ControllerDeps, IAppController } from './types';
import type { Game } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';
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
  HeroicService,
  LutrisService,
  CloudSaveService,
  WineManager,
} from '../services';
import { EmulatorDetector, ROMScanner, EmulatorLauncher } from '../services/emulator';
import { HtmlParserServiceNew2 } from '../services/html-parser-new2';
import { loadSourceDefinitions } from './source-loader';
import { buildParsersMap } from './parser-map';
import { buildDownloadHandler } from './download-handlers';
import { buildPlayHandler } from './handlers';
import { createDebridService } from '../services/debrid-resolver';
import type { IDebridService } from '../services/debrid-types';
import { scrapeAllSources } from './scraper';
import { loadCachedGames } from '../services/cached-games';
import { startAutoUpdate } from './auto-updater';
import { wireSources, wireBackup, wireDebridTest, wireWebdavTest } from './settings-wirer';
import { wirePipelineEvents } from './pipeline-wirer';
import { fetchProtonRatingsBg, startHealthChecks } from './health-wirer';
import { GjsSystem, type ISystem } from './system';
import { wireCatalogView, wireLibraryView, wireAllFeatures, wireErrorLog, refreshLibrary } from './feature-wirers';

export class AppController implements IAppController {
  private http: HttpService;
  db: DatabaseService;
  private notifications: NotificationService;
  launcher: Launcher;
  private sources: SourceDefinition[] = [];
  private autoUpdateTimers: number[] = [];
  private healthTimers: number[] = [];
  private debrid: IDebridService | null = null;
  allGames: Game[] = [];
  private pipeline: PipelineOrchestrator;
  private syncService: SyncService;
  private protonDB: ProtonDB;
  protonRatings = new Map<string, ProtonDBRating>();
  downloadHandler: (gameId: string) => void;
  private sys: ISystem;
  metadataProvider: MetadataProvider;
  emulatorDetector: EmulatorDetector;
  romScanner: ROMScanner;
  emulatorLauncher: EmulatorLauncher;
  steamService: SteamService;
  heroicService: HeroicService;
  lutrisService: LutrisService;
  cloudSaveService: CloudSaveService;
  wineManager: WineManager;
  detectedEmulators: EmulatorConfig[] = [];
  scannedROMs: ROMEntry[] = [];

  constructor(readonly deps: ControllerDeps) {
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
    try {
      const s2 = new SettingsManager();
      const igdbId = s2.getString(GSETTINGS_KEYS.IGDB_CLIENT_ID);
      const igdbSecret = s2.getString(GSETTINGS_KEYS.IGDB_CLIENT_SECRET);
      if (igdbId && igdbSecret) {
        this.metadataProvider = new MetadataProvider(this.http, igdbId, igdbSecret);
      }
    } catch { /* settings not available, use default */ }
    this.emulatorDetector = new EmulatorDetector();
    this.romScanner = new ROMScanner();
    this.emulatorLauncher = new EmulatorLauncher(this.db);
    this.steamService = new SteamService(this.db);
    this.heroicService = new HeroicService(this.db);
    this.lutrisService = new LutrisService(this.db);
    this.cloudSaveService = new CloudSaveService(this.http, this.db);
    this.wineManager = new WineManager();
    try {
      const s = new SettingsManager();
      const dlDir = s.getString(GSETTINGS_KEYS.INSTALL_PATH) || `${this.sys.getHomeDir()}/Downloads/plundernome`;
      const provider = s.getString(GSETTINGS_KEYS.DEBRID_PROVIDER);
      const apiKey = s.getString(GSETTINGS_KEYS.DEBRID_API_KEY);
      this.debrid = createDebridService(provider, apiKey, this.http);
      this.downloadHandler = buildDownloadHandler(
        () => this.allGames,
        this.pipeline,
        this.deps.window,
        dlDir,
        this.http,
        (id: string) => this.sources.find((s) => s.id === id)?.mirrors ?? [],
        this.debrid,
      );
    } catch {
      this.downloadHandler = buildDownloadHandler(
        () => this.allGames,
        this.pipeline,
        this.deps.window,
        `${this.sys.getHomeDir()}/Downloads/plundernome`,
        this.http,
        (id: string) => this.sources.find((s) => s.id === id)?.mirrors ?? [],
        null,
      );
    }
  }

  async init(): Promise<void> {
    try {
      await this.db.connect();
      await this.db.migrate();
      this.sources = loadSourceDefinitions();
      this.deps.settingsView.addSources(this.sources);
      wireCatalogView(this, this.deps);
      wireLibraryView(this, this.deps, () => refreshLibrary(this));
      wirePipelineEvents(
        this.pipeline,
        this.db,
        this.deps.window,
        this.deps.dialogService,
        this.notifications,
        this.sources,
        () => refreshLibrary(this),
        (gameId) => buildPlayHandler(this.db, this.launcher, this.deps.window, this.protonRatings, this.wineManager, this.cloudSaveService)(gameId),
      );
      try {
        this.allGames = await scrapeAllSources(this.sources, this.http, buildParsersMap(new HtmlParserServiceNew2()), this.db);
      } catch {
        const cached = await loadCachedGames(this.db);
        this.allGames = cached;
        if (cached.length > 0) {
          this.deps.window.showToast('Using cached catalog — sources unreachable', 'normal', 5);
        } else {
          this.deps.window.showToast('Could not load catalog — check your connection', 'high');
        }
      }
      this.deps.catalogView.setGames(this.allGames);
      fetchProtonRatingsBg(this.allGames, this.protonDB, this.protonRatings);
      await refreshLibrary(this);
      const incomplete = await this.db.getAllIncompletePipelines();
      if (incomplete.length > 0) this.deps.window.showToast(`${incomplete.length} pipeline(s) incomplete — retry`);
      wireSources(this.deps.settingsView, this.deps.window);
      wireBackup(this.deps.settingsView, this.db, this.deps.window);
      wireDebridTest(this.deps.settingsView, this.debrid, this.deps.window);
      wireWebdavTest(this.deps.settingsView, this.cloudSaveService, this.deps.window);
      this.deps.settingsView.onLutrisImport(async () => {
        try {
          const count = await this.lutrisService.importLibrary();
          this.deps.window.showToast(`Imported ${count} games from Lutris`);
          await refreshLibrary(this);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          this.deps.window.showToast(`Lutris import failed: ${msg}`, 'high');
        }
      });
      this.deps.settingsView.setLutrisInstalled(this.lutrisService.isLutrisInstalled());

      this.deps.settingsView.onHeroicImport(async () => {
        try {
          const count = await this.heroicService.importLibrary();
          this.deps.window.showToast(`Imported ${count} games from Heroic`);
          await refreshLibrary(this);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          this.deps.window.showToast(`Heroic import failed: ${msg}`, 'high');
        }
      });
      this.autoUpdateTimers = startAutoUpdate(
        this.sources,
        () => scrapeAllSources(this.sources, this.http, buildParsersMap(new HtmlParserServiceNew2()), this.db),
        this.deps.catalogView,
      );
      await startHealthChecks(this.http, this.sources, this.deps.settingsView, this.deps.window, this.healthTimers);
      wireErrorLog(this, this.deps);
      wireAllFeatures(this, this.deps);
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
}
