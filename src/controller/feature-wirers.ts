import type { ControllerDeps } from './types';
import type { AppController } from './index';
import type { Game } from '../domain/models';
import type { GameRow } from '../services/types';
import type { LogFilter } from '../services/database';
import { detectCompat } from '../domain/compat/detector';
import { buildImportHandler, buildPlayHandler, buildRemoveHandler } from './handlers';
import { wireMetadataEnrichment } from './metadata-wirer';
import { wireSteamImport } from './steam-wirer';
import { wireCloudSave } from './cloud-save-wirer';

export function wireCatalogView(ctrl: AppController, deps: ControllerDeps): void {
  deps.catalogView.onDownloadGame(ctrl.downloadHandler);
}
export function wireLibraryView(
  ctrl: AppController,
  deps: ControllerDeps,
  refreshLibrary: () => Promise<void>,
): void {
  const refresh = () => refreshLibrary();
  deps.libraryView.onImportFolder(buildImportHandler(ctrl.db, refresh, deps.window));
  deps.libraryView.onPlayGame(buildPlayHandler(ctrl.db, ctrl.launcher, deps.window));
  deps.libraryView.onRemoveGame(buildRemoveHandler(ctrl.db, refresh, deps.window));
  deps.libraryView.onLaunchOptions(async (gameId: string) => {
    const game = await ctrl.db.getGame(gameId);
    if (!game) return;
    const { showLaunchOptionsEditor } = await import('../ui/widgets/launch-options-editor');
    const opts = await ctrl.db.getLaunchOptions(gameId);
    showLaunchOptionsEditor(gameId, opts.env, opts.args, async (id, env, args) => {
      await ctrl.db.setLaunchOptions(id, env, args);
      deps.window.showToast('Launch options saved');
    });
  });
  deps.libraryView.onRefreshLibrary(() => refresh());
  deps.libraryView.onOpenCatalog(() => deps.window.navigateTo('catalog'));
  deps.libraryView.onSteamImport(() => deps.libraryView.showImportDialog());
  deps.libraryView.onAddToAppMenu(async (gameId: string) => {
    const game = await ctrl.db.getGame(gameId);
    if (!game) return;
    const rows = await ctrl.db.query<{ install_path: string }>('SELECT install_path FROM games WHERE id = //1', [
      gameId,
    ]);
    await ctrl.launcher.createDesktopEntry(game, rows[0]?.install_path || '');
    deps.window.showToast(`Added ${game.name} to applications menu`);
  });
  deps.libraryView.onRemoveFromAppMenu(async (gameId: string) => {
    await ctrl.launcher.removeDesktopEntry(gameId);
    deps.window.showToast('Removed from applications menu');
  });
}
export function wireErrorLog(ctrl: AppController, deps: ControllerDeps): void {
  deps.settingsView.onRefreshLogs(async (filter: LogFilter) => {
    const entries = await ctrl.db.getPipelineLogs(filter);
    deps.settingsView.setLogEntries(entries);
  });
  ctrl.db.getPipelineLogs({ limit: 100 }).then((entries) => deps.settingsView.setLogEntries(entries));
  ctrl.db.getLogGameIds().then((ids) => deps.settingsView.setLogGameIds(ids));
}
export function wireEmulatorDetection(ctrl: AppController, deps: ControllerDeps): void {
  const { GLib } = imports.gi;
  GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
    ctrl.emulatorDetector.detectAll().then((configs) => {
      ctrl.detectedEmulators = configs;
      const results = configs.map((c) => ({
        platformId: c.platformId,
        binaryPath: c.emulatorPath,
        source: 'system',
      }));
      deps.emulatorsView.setPlatforms(results);
    });
    return false;
  });
}
export function wireEmulatorScan(ctrl: AppController, deps: ControllerDeps): void {
  deps.emulatorsView.onScanROMS((folderPath: string) => {
    ctrl.romScanner.scanFolder(folderPath).then((roms) => {
      ctrl.scannedROMs = roms;
      deps.emulatorsView.setROMs(roms);
      deps.window.showToast(`Found ${roms.length} ROMs in folder`);
    });
  });
}
export function wireEmulatorLaunch(ctrl: AppController, deps: ControllerDeps): void {
  deps.emulatorsView.onLaunchROM((romId: string) => {
    const rom = ctrl.scannedROMs.find((r) => r.id === romId);
    if (!rom) {
      deps.window.showToast('ROM not found', 'high');
      return;
    }
    const config = ctrl.detectedEmulators.find((c) => c.platformId === rom.platformId);
    if (!config) {
      deps.window.showToast('No emulator found for platform', 'high');
      return;
    }
    ctrl.emulatorLauncher.launchWithConfig(rom, config).then((result) => {
      if (result.success) {
        deps.window.showToast(`Launched ${rom.name}`);
      } else {
        deps.window.showToast(`Launch failed: ${result.errorMessage ?? 'unknown'}`, 'high');
      }
    });
  });
}
export async function refreshLibrary(ctrl: AppController): Promise<void> {
  const rows = await ctrl.db.query<GameRow>('SELECT * FROM games ORDER BY name');
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
      const playtime = await ctrl.db.getPlaytime(row.id as string);
      return {
        game,
        profile: detectCompat([], game.name),
        playtime,
        protonRating: ctrl.protonRatings.get(game.name),
      };
    }),
  );
  ctrl.deps.libraryView.setGames(entries);
}
export function wireAllFeatures(ctrl: AppController, deps: ControllerDeps): void {
  wireMetadataEnrichment(ctrl.metadataProvider, ctrl.allGames, deps.catalogView);
  wireSteamImport(ctrl.steamService, deps.libraryView, ctrl.db);
  wireCloudSave(ctrl.cloudSaveService, deps.libraryView, deps.window);
  deps.libraryView.onAchievements(async (gameId: string) => {
    const game = await ctrl.db.getGame(gameId);
    if (!game) return;
    deps.window.showToast(`Achievements: ${game.name} — coming soon`);
  });
  wireEmulatorDetection(ctrl, deps);
  wireEmulatorScan(ctrl, deps);
  wireEmulatorLaunch(ctrl, deps);
}
