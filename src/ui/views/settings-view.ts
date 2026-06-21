import { SourceConfigRow } from '../widgets/source-config'
import type { SourceDefinition } from '../../domain/catalog/types'
import type { SyncPeer } from '../../services/sync-service'
import type { LogEntry, LogFilter } from '../../services/database'
import { ErrorLogView } from '../widgets/error-log-view'
import type { SourceHealth } from '../../services/types'
import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings'
import { SPEED_PRESETS } from '../../domain/queue'
import { createButton, createSwitchRow, createSpinRow, createEntryRow } from '../factory'
import { _t, setLocale, getCurrentLocale } from '../../domain/i18n'
import { availableLocales } from '../../domain/translations'
import { SettingsSourcesView } from './settings-sources'
import { SettingsBackupView } from './settings-backup'
import { createScrollContent } from '../templates/scroll-content'

const { Gtk, Adw, GLib, GObject } = imports.gi
export const SettingsView = GObject.registerClass({
  GTypeName: 'SettingsView',
}, class SettingsView extends Adw.Bin {
  private sourcesGroup: AdwPreferencesGroup
  private sourceRows = new Map<string, InstanceType<typeof SourceConfigRow>>()
  private steamImportHandler: (() => void) | null = null
  private lanSyncEnabled = false
  private peers: SyncPeer[] = []
  private lanToggleHandler: ((enabled: boolean) => void) | null = null
  private syncPeerHandler: ((peer: SyncPeer) => void) | null = null
  private exportToPeerHandler: ((peer: SyncPeer) => void) | null = null
  private peersRow: AdwActionRow | null = null
  private errorLogView: ErrorLogView | null = null
  private sourcesSubView: SettingsSourcesView
  private backupView: SettingsBackupView

  constructor() {
    super()
    this.add_css_class('settings-view')
    const settings = new SettingsManager()
    const page = new Adw.PreferencesPage()
    this.sourcesGroup = new Adw.PreferencesGroup({ title: _t('settings.sources') })
    page.add(this.sourcesGroup)
    this.sourcesSubView = new SettingsSourcesView()
    page.add(this.sourcesSubView.group)
    const pathsGroup = new Adw.PreferencesGroup({ title: _t('settings.paths') })
    const dlRow = new Adw.ActionRow({ title: _t('settings.download-dir'), subtitle: settings.getString(GSETTINGS_KEYS.INSTALL_PATH) })
    const dlBtn = createButton({ label: _t('common.browse'), onClick: () => {
      const p = new Gtk.FileChooserNative({ action: Gtk.FileChooserAction.SELECT_FOLDER, title: _t('settings.select-download-dir'), transient_for: this.get_root() as unknown as GtkWidget })
      p.connect('response', (_d: unknown, r: number) => {
        if (r === Gtk.ResponseType.ACCEPT) {
          const path = p.get_file()?.get_path() ?? GLib.get_home_dir()
          dlRow.set_subtitle(path); settings.setString(GSETTINGS_KEYS.INSTALL_PATH, path)
        }
      })
      p.present()
    }})
    dlRow.add_suffix(dlBtn); dlRow.set_activatable_widget(dlBtn); pathsGroup.add(dlRow)
    const wRow = createEntryRow({
      title: _t('settings.wine-path'), subtitle: settings.getString(GSETTINGS_KEYS.WINE_PATH) || '/usr/bin/wine',
      value: settings.getString(GSETTINGS_KEYS.WINE_PATH), placeholder: '/usr/bin/wine', browseLabel: _t('common.browse'),
      onChanged: (t) => { settings.setString(GSETTINGS_KEYS.WINE_PATH, t); wRow.set_subtitle(t || '/usr/bin/wine') },
      onBrowse: () => {
        const p = new Gtk.FileChooserNative({ action: Gtk.FileChooserAction.OPEN, title: _t('settings.select-wine-binary'), transient_for: this.get_root() as unknown as GtkWidget })
        p.connect('response', (_d: unknown, r: number) => {
          if (r === Gtk.ResponseType.ACCEPT) { const path = p.get_file()?.get_path() ?? ''; settings.setString(GSETTINGS_KEYS.WINE_PATH, path); wRow.set_subtitle(path || '/usr/bin/wine') }
        })
        p.present()
      },
    })
    pathsGroup.add(wRow); page.add(pathsGroup)
    const dGroup = new Adw.PreferencesGroup({ title: _t('settings.downloads') })
    dGroup.add(createSpinRow({ title: _t('settings.max-concurrent'), value: settings.getInt(GSETTINGS_KEYS.DOWNLOAD_CONCURRENCY), min: 1, max: 10, step: 1, onChanged: (v) => settings.setInt(GSETTINGS_KEYS.DOWNLOAD_CONCURRENCY, v) }))
    const spdIdx = Math.max(0, SPEED_PRESETS.findIndex(p => p.value === settings.getInt(GSETTINGS_KEYS.SPEED_LIMIT)))
    const sRow = new Adw.ComboRow({ title: _t('settings.speed-limit'), subtitle: SPEED_PRESETS[spdIdx]?.label ?? _t('settings.unlimited'), model: new Gtk.StringList({ strings: SPEED_PRESETS.map(p => p.label) }), selected: spdIdx })
    sRow.connect('notify::selected', () => { const p = SPEED_PRESETS[sRow.get_selected()]; settings.setInt(GSETTINGS_KEYS.SPEED_LIMIT, p?.value ?? 0); sRow.set_subtitle(p?.label ?? _t('settings.unlimited')) })
    dGroup.add(sRow)
    dGroup.add(createSwitchRow({ title: _t('settings.adaptive-concurrency'), subtitle: _t('settings.adaptive-concurrency.subtitle'), active: settings.getBool(GSETTINGS_KEYS.ADAPTIVE_CONCURRENCY), onToggle: (a) => settings.setBool(GSETTINGS_KEYS.ADAPTIVE_CONCURRENCY, a) }))
    page.add(dGroup)
    this.backupView = new SettingsBackupView()
    page.add(this.backupView.group)
    const stGroup = new Adw.PreferencesGroup({ title: _t('settings.steam-integration') })
    const iRow = new Adw.ActionRow({ title: _t('settings.import-games'), subtitle: _t('settings.import-games.subtitle') })
    const iBtn = createButton({ label: _t('settings.scan-steam'), cssClass: 'suggested-action', onClick: () => this.steamImportHandler?.() })
    iRow.add_suffix(iBtn); iRow.set_activatable_widget(iBtn); stGroup.add(iRow); page.add(stGroup)
    const lGroup = new Adw.PreferencesGroup({ title: _t('settings.lan-sync') })
    lGroup.add(createSwitchRow({ title: _t('settings.lan-discovery'), subtitle: _t('settings.lan-discovery.subtitle'), onToggle: (a) => { this.lanSyncEnabled = a; this.lanToggleHandler?.(a) } }))
    this.peersRow = new Adw.ActionRow({ title: _t('settings.peer-library'), subtitle: _t('settings.no-peers') }); lGroup.add(this.peersRow)
    const ipBtn = createButton({ label: _t('common.import'), cssClass: 'suggested-action', onClick: () => { const p = this.peers[0]; if (p && this.syncPeerHandler) this.syncPeerHandler(p) } })
    const ipRow = new Adw.ActionRow({ title: _t('settings.import-from-peer') }); ipRow.add_suffix(ipBtn); ipRow.set_activatable_widget(ipBtn); lGroup.add(ipRow)
    const epBtn = createButton({ label: _t('common.export'), onClick: () => { const p = this.peers[0]; if (p && this.exportToPeerHandler) this.exportToPeerHandler(p) } })
    const epRow = new Adw.ActionRow({ title: _t('settings.export-to-peer') }); epRow.add_suffix(epBtn); epRow.set_activatable_widget(epBtn); lGroup.add(epRow)
    page.add(lGroup)
    const aGroup = new Adw.PreferencesGroup({ title: _t('settings.appearance') })
    const tRow = new Adw.ComboRow({ title: _t('settings.theme'), selected: settings.getInt(GSETTINGS_KEYS.COLOR_SCHEME), model: new Gtk.StringList({ strings: [_t('settings.theme.system'), _t('settings.theme.light'), _t('settings.theme.dark')] }) })
    tRow.connect('notify::selected', () => { const v = tRow.get_selected(); settings.setInt(GSETTINGS_KEYS.COLOR_SCHEME, v); const cs: number[] = [Adw.ColorScheme.DEFAULT, Adw.ColorScheme.FORCE_LIGHT, Adw.ColorScheme.FORCE_DARK]; Adw.StyleManager.get_default().set_color_scheme(cs[v] ?? Adw.ColorScheme.DEFAULT) })
    aGroup.add(tRow)
    const lRow = new Adw.ComboRow({ title: _t('settings.locale'), model: new Gtk.StringList({ strings: availableLocales.map(l => l.name) }), selected: Math.max(0, availableLocales.findIndex(l => l.code === getCurrentLocale())) })
    lRow.connect('notify::selected', () => { const i = lRow.get_selected(); setLocale(availableLocales[i]?.code ?? 'en') })
    aGroup.add(lRow); page.add(aGroup)
    const abGroup = new Adw.PreferencesGroup({ title: _t('settings.about') })
    abGroup.add(new Adw.ActionRow({ title: _t('settings.about-plundernome'), subtitle: 'v0.1.0' }))
    page.add(abGroup)
    const logView = new ErrorLogView()
    this.errorLogView = logView
    page.add(logView.group)
    this.set_child(createScrollContent(page))
  }

  onSteamImport(cb: () => void): void { this.steamImportHandler = cb }
  addSources(sources: SourceDefinition[]): void {
    for (const source of sources) {
      const row = new SourceConfigRow(source)
      this.sourceRows.set(source.id, row)
      this.sourcesGroup.add(row)
    }
  }
  updateSourceHealth(sourceId: string, health: SourceHealth): void { this.sourceRows.get(sourceId)?.updateHealth(health) }
  onLANSyncToggle(cb: (enabled: boolean) => void): void { this.lanToggleHandler = cb }
  setPeers(peers: SyncPeer[]): void {
    this.peers = peers
    this.peersRow?.set_subtitle(peers.length > 0 ? peers.map(p => `${p.name}@${p.address}:${p.port}`).join(', ') : _t('settings.no-peers'))
  }
  onSyncWithPeer(cb: (peer: SyncPeer) => void): void { this.syncPeerHandler = cb }
  onExportToPeer(cb: (peer: SyncPeer) => void): void { this.exportToPeerHandler = cb }
  setLogEntries(entries: LogEntry[]): void { this.errorLogView?.setLogEntries(entries) }
  setLogGameIds(ids: string[]): void { this.errorLogView?.setGameIds(ids) }
  onRefreshLogs(cb: (filter: LogFilter) => void): void { this.errorLogView?.onRefreshLogs(cb) }
  getSourcesView(): SettingsSourcesView { return this.sourcesSubView }
  getBackupView(): SettingsBackupView { return this.backupView }
})
