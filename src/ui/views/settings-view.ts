import { SourceConfigRow } from '../widgets/source-config';
import type { SourceDefinition } from '../../domain/catalog/types';
import type { SyncPeer } from '../../services/sync-service';
import type { LogEntry, LogFilter } from '../../services/database';
import { ErrorLogView } from '../widgets/error-log-view';
import type { SourceHealth } from '../../services/types';
import { _t } from '../../domain/i18n';
import { SettingsSourcesView } from './settings-sources';
import { SettingsBackupView } from './settings-backup';
import { DownloadSettingsGroup } from '../widgets/download-settings-group';
import { WineSettingsGroup } from '../widgets/wine-settings-group';
import { SteamSettingsGroup } from '../widgets/steam-settings-group';
import { LanSyncSettingsGroup } from '../widgets/lan-sync-settings-group';
import { AppearanceGroup } from '../widgets/appearance-group';
import { createSettingsPage } from '../templates/settings-page';

const { Gtk, Adw, GObject } = imports.gi;
export const SettingsView = GObject.registerClass(
  { GTypeName: 'SettingsView' },
  class SettingsView extends Adw.Bin {
    private sourcesGroup: AdwPreferencesGroup;
    private sourceRows = new Map<string, InstanceType<typeof SourceConfigRow>>();
    private errorLogView: ErrorLogView;
    private sourcesSubView: SettingsSourcesView;
    private backupView: SettingsBackupView;
    private steamGroup: SteamSettingsGroup;
    private lanGroup: LanSyncSettingsGroup;

    constructor() {
      super();
      this.add_css_class('settings-view');
      const { page, container } = createSettingsPage();

      this.sourcesGroup = new Adw.PreferencesGroup({ title: _t('settings.sources') });
      page.add(this.sourcesGroup);
      this.sourcesSubView = new SettingsSourcesView();
      page.add(this.sourcesSubView.group);

      page.add(new DownloadSettingsGroup().group);
      this.backupView = new SettingsBackupView();
      page.add(this.backupView.group);
      page.add(new WineSettingsGroup().group);

      this.steamGroup = new SteamSettingsGroup();
      page.add(this.steamGroup.group);
      this.lanGroup = new LanSyncSettingsGroup();
      page.add(this.lanGroup.group);
      page.add(new AppearanceGroup().group);

      const abGroup = new Adw.PreferencesGroup({ title: _t('settings.about') });
      abGroup.add(new Adw.ActionRow({ title: _t('settings.about-plundernome'), subtitle: 'v0.1.0' }));
      page.add(abGroup);

      this.errorLogView = new ErrorLogView();
      page.add(this.errorLogView.group);

      this.set_child(container);
    }

    onSteamImport(cb: () => void): void {
      this.steamGroup.onSteamImport(cb);
    }
    addSources(sources: SourceDefinition[]): void {
      for (const source of sources) {
        const row = new SourceConfigRow(source);
        this.sourceRows.set(source.id, row);
        this.sourcesGroup.add(row);
      }
    }
    updateSourceHealth(sourceId: string, health: SourceHealth): void {
      this.sourceRows.get(sourceId)?.updateHealth(health);
    }
    onLANSyncToggle(cb: (enabled: boolean) => void): void {
      this.lanGroup.onLANSyncToggle(cb);
    }
    setPeers(peers: SyncPeer[]): void {
      this.lanGroup.setPeers(peers);
    }
    onSyncWithPeer(cb: (peer: SyncPeer) => void): void {
      this.lanGroup.onSyncWithPeer(cb);
    }
    onExportToPeer(cb: (peer: SyncPeer) => void): void {
      this.lanGroup.onExportToPeer(cb);
    }
    setLogEntries(entries: LogEntry[]): void {
      this.errorLogView.setLogEntries(entries);
    }
    setLogGameIds(ids: string[]): void {
      this.errorLogView.setGameIds(ids);
    }
    onRefreshLogs(cb: (filter: LogFilter) => void): void {
      this.errorLogView.onRefreshLogs(cb);
    }
    getSourcesView(): SettingsSourcesView {
      return this.sourcesSubView;
    }
    getBackupView(): SettingsBackupView {
      return this.backupView;
    }
  },
);
