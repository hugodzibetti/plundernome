import { SOURCE_DEFINITIONS } from '../../sources'
import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings'
import { createButton } from '../factory'
import { createScrollContent } from '../templates/scroll-content'
import { pickFileOrDir } from '../welcome-picker-utils'

const { Gtk, Adw, GLib, Gio, GObject } = imports.gi

const WINE_PATHS = ['/usr/bin/wine', '/usr/local/bin/wine', '/usr/bin/wine64']

export const WelcomeView = GObject.registerClass({
  GTypeName: 'WelcomeView',
}, class WelcomeView extends Adw.Bin {
  private sourceCheckboxes = new Map<string, GtkCheckButton>()
  private getStartedBtn: GtkButton
  private dlDir: string
  private winePath: string
  private onComplete: (() => void) | null = null
  private dlDirRow: AdwActionRow
  private wineRow: AdwActionRow
  private showToast: (msg: string) => void

  constructor(toastFn?: (msg: string) => void) {
    super()
    this.showToast = toastFn ?? (() => {})
    this.add_css_class('welcome-view')

    const settings = new SettingsManager()
    this.dlDir = settings.getString(GSETTINGS_KEYS.INSTALL_PATH) || `${GLib.get_home_dir()}/Games/Plundernome`
    this.winePath = settings.getString(GSETTINGS_KEYS.WINE_PATH) || ''

    const rootBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 24 })
    rootBox.add_css_class('welcome-content')
    rootBox.set_valign(Gtk.Align.START)

    const headerBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 })
    const icon = new Gtk.Image({ icon_name: 'applications-games-symbolic', pixel_size: 64 })
    icon.add_css_class('welcome-icon')
    headerBox.append(icon)
    const title = new Gtk.Label({ label: 'Welcome to Plundernome', xalign: 0 })
    title.add_css_class('title-1')
    headerBox.append(title)
    const subtitle = new Gtk.Label({ label: 'Set up your game downloader in a few steps. You can change these settings later.', xalign: 0, wrap: true })
    subtitle.add_css_class('welcome-subtitle')
    headerBox.append(subtitle)
    rootBox.append(headerBox)

    const sourcesGroup = new Adw.PreferencesGroup({ title: 'Step 1: Select Download Sources (choose at least 2)' })
    for (const src of SOURCE_DEFINITIONS) {
      const check = new Gtk.CheckButton({ label: src.name, active: src.enabled })
      check.connect('toggled', () => this.validateSteps())
      this.sourceCheckboxes.set(src.id, check)
      const row = new Adw.ActionRow({ title: src.name, subtitle: src.baseUrl })
      row.add_prefix(check)
      row.set_activatable_widget(check)
      sourcesGroup.add(row)
    }
    rootBox.append(sourcesGroup)

    const dirGroup = new Adw.PreferencesGroup({ title: 'Step 2: Choose Download Directory' })
    this.dlDirRow = new Adw.ActionRow({ title: 'Download Folder', subtitle: this.dlDir })
    const browseBtn = createButton({ label: 'Browse\u2026', onClick: () => this.pickDownloadDir() })
    this.dlDirRow.add_suffix(browseBtn)
    this.dlDirRow.set_activatable_widget(browseBtn)
    dirGroup.add(this.dlDirRow)
    rootBox.append(dirGroup)

    const wineGroup = new Adw.PreferencesGroup({ title: 'Step 3: Wine / Proton Path' })
    this.wineRow = new Adw.ActionRow({ title: 'Wine Binary', subtitle: this.winePath || '/usr/bin/wine (auto-detected)' })
    const detectBtn = createButton({ label: 'Auto-Detect', onClick: () => this.autoDetectWine() })
    this.wineRow.add_suffix(detectBtn)
    const wineBrowseBtn = createButton({ label: 'Browse\u2026', onClick: () => this.pickWinePath() })
    this.wineRow.add_suffix(wineBrowseBtn)
    wineGroup.add(this.wineRow)
    rootBox.append(wineGroup)

    this.getStartedBtn = createButton({ label: 'Get Started', cssClass: 'suggested-action', onClick: () => this.finishWizard() })
    this.getStartedBtn.set_sensitive(false)
    this.getStartedBtn.set_halign(Gtk.Align.CENTER)
    rootBox.append(this.getStartedBtn)

    const clamp = createScrollContent(rootBox)
    clamp.set_maximum_size(600)
    this.set_child(clamp)

    this.validateSteps()
    this.autoDetectWine()
  }

  onWizardComplete(cb: () => void): void {
    this.onComplete = cb
  }

  private pickDownloadDir(): void {
    pickFileOrDir(this.get_root() as unknown as GtkWidget, Gtk.FileChooserAction.SELECT_FOLDER, 'Select Download Directory',
      (path) => { this.dlDir = path; this.dlDirRow.set_subtitle(path); this.validateSteps() })
  }

  private pickWinePath(): void {
    pickFileOrDir(this.get_root() as unknown as GtkWidget, Gtk.FileChooserAction.OPEN, 'Select Wine/Proton Binary',
      (path) => { this.winePath = path; this.wineRow.set_subtitle(path); this.validateSteps() })
  }

  private autoDetectWine(): void {
    for (const p of WINE_PATHS) {
      const f = Gio.File.new_for_path(p)
      if (f.query_exists(null)) {
        this.winePath = p
        this.wineRow.set_subtitle(p)
        this.validateSteps()
        this.showToast(`Wine found at ${p}`)
        return
      }
    }
    this.winePath = ''
    this.wineRow.set_subtitle('Not found — set manually in Settings')
    this.validateSteps()
    this.showToast('Wine not found — use Browse to set path manually')
  }

  private validateSteps(): void {
    let checked = 0
    for (const cb of this.sourceCheckboxes.values()) {
      if (cb.get_active()) checked++
    }
    this.getStartedBtn.set_sensitive(checked >= 2 && this.dlDir.length > 0)
  }

  private finishWizard(): void {
    const settings = new SettingsManager()
    settings.setString(GSETTINGS_KEYS.INSTALL_PATH, this.dlDir)
    if (this.winePath) settings.setString(GSETTINGS_KEYS.WINE_PATH, this.winePath)
    const enabledIds: string[] = []
    for (const [id, cb] of this.sourceCheckboxes) {
      if (cb.get_active()) enabledIds.push(id)
    }
    settings.setString('enabled-sources', enabledIds.join(','))
    settings.setBool(GSETTINGS_KEYS.FIRST_RUN_COMPLETE, true)
    this.onComplete?.()
  }
})
