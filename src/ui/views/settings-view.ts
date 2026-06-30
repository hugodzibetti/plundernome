import { SourceConfigRow } from '../widgets/source-config'
import type { SourceDefinition } from '../../domain/catalog/types'
import type { SyncPeer } from '../../services/sync-service'
import type { LogEntry, LogFilter } from '../../services/database'
import { ErrorLogView } from '../widgets/error-log-view'
import type { SourceHealth } from '../../services/types'
import { _t } from '../../domain/i18n'
import { SettingsSourcesView } from './settings-sources'
import { SettingsBackupView } from './settings-backup'
import { DownloadSettingsGroup } from '../widgets/download-settings-group'
import { WineSettingsGroup } from '../widgets/wine-settings-group'
import { SteamSettingsGroup } from '../widgets/steam-settings-group'
import { HeroicSettingsGroup } from '../widgets/heroic-settings-group'
import { CloudSaveSettingsGroup } from '../widgets/cloud-save-settings-group'
import { DebridSettingsGroup } from '../widgets/debrid-settings-group'
import { LanSyncSettingsGroup } from '../widgets/lan-sync-settings-group'
import { MetadataSettingsGroup } from '../widgets/metadata-settings-group'
import { AppearanceGroup } from '../widgets/appearance-group'
import { createSettingsPage } from '../templates/settings-page'

const { Gtk, Adw, GObject } = imports.gi

export const SettingsView = GObject.registerClass(
  { GTypeName: 'SettingsView' },
  class SettingsView extends Adw.Bin {
    private sourcesGroup: AdwPreferencesGroup
    private sourceRows = new Map<string, InstanceType<typeof SourceConfigRow>>()
    private errorLogView: ErrorLogView
    private sourcesSubView: SettingsSourcesView
    private backupView: SettingsBackupView
    private steamGroup: SteamSettingsGroup
    private heroicGroup: HeroicSettingsGroup
    private lanGroup: LanSyncSettingsGroup
    private debridGroup: DebridSettingsGroup
    private cloudSaveGroup: CloudSaveSettingsGroup

    constructor() {
      super()
      this.add_css_class('settings-view')
      const { page, container } = createSettingsPage()

      this.sourcesGroup = new Adw.PreferencesGroup({ title: 'Sources' })
      this.sourcesGroup.add_css_class('settings-sources-group')
      page.add(this.sourcesGroup)
      this.sourcesSubView = new SettingsSourcesView()
      page.add(this.sourcesSubView.group)

      page.add(new DownloadSettingsGroup().group)
      this.backupView = new SettingsBackupView()
      page.add(this.backupView.group)
      page.add(new WineSettingsGroup().group)

      this.steamGroup = new SteamSettingsGroup()
      page.add(this.steamGroup.group)
      this.heroicGroup = new HeroicSettingsGroup()
      page.add(this.heroicGroup.group)
      this.lanGroup = new LanSyncSettingsGroup()
      page.add(this.lanGroup.group)

      this.debridGroup = new DebridSettingsGroup()
      page.add(this.debridGroup.group)
      page.add(new MetadataSettingsGroup().group)
      this.cloudSaveGroup = new CloudSaveSettingsGroup()
      page.add(this.cloudSaveGroup.group)
      page.add(new AppearanceGroup().group)

      const abGroup = new Adw.PreferencesGroup({ title: _t('settings.about') })
      abGroup.add_css_class('settings-about-group')
      const aboutRow = new Adw.ActionRow({ title: _t('about.title'), subtitle: _t('about.description') })
      abGroup.add(aboutRow)
      const verRow = new Adw.ActionRow({ title: _t('about.version'), subtitle: '0.1.0' })
      abGroup.add(verRow)
      const licenseRow = new Adw.ActionRow({ title: _t('about.license') })
      abGroup.add(licenseRow)
      page.add(abGroup)

      this.errorLogView = new ErrorLogView()
      page.add(this.errorLogView.group)

      this.set_child(container)
    }

    addSources(sources: SourceDefinition[]): void {
      for (const source of sources) {
        const row = new SourceConfigRow(source)
        this.sourceRows.set(source.id, row)
        this.sourcesGroup.add(row)
      }
    }

    updateSourceHealth(sourceId: string, health: SourceHealth): void {
      this.sourceRows.get(sourceId)?.updateHealth(health)
    }

    onSteamImport(cb: () => void): void { this.steamGroup.onSteamImport(cb) }
    onHeroicImport(cb: () => void): void { this.heroicGroup.onHeroicImport(cb) }
    onTestDebrid(cb: () => Promise<boolean>): void { this.debridGroup.onTestConnection(cb) }
    onTestWebdav(cb: () => Promise<boolean>): void { this.cloudSaveGroup.onTestWebdav(cb) }
    onLANSyncToggle(cb: (enabled: boolean) => void): void { this.lanGroup.onLANSyncToggle(cb) }
    setPeers(peers: SyncPeer[]): void { this.lanGroup.setPeers(peers) }
    onSyncWithPeer(cb: (peer: SyncPeer) => void): void { this.lanGroup.onSyncWithPeer(cb) }
    onExportToPeer(cb: (peer: SyncPeer) => void): void { this.lanGroup.onExportToPeer(cb) }
    setLogEntries(entries: LogEntry[]): void { this.errorLogView.setLogEntries(entries) }
    setLogGameIds(ids: string[]): void { this.errorLogView.setGameIds(ids) }
    onRefreshLogs(cb: (filter: LogFilter) => void): void { this.errorLogView.onRefreshLogs(cb) }
    getSourcesView(): SettingsSourcesView { return this.sourcesSubView }
    getBackupView(): SettingsBackupView { return this.backupView }
  },
)
