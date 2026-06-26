import { loadAppCss } from './window-css'
import { createButton } from './factory'
import { setupWindowShortcuts } from './shortcuts'
import { WelcomeView } from './views/welcome-view'
import { HomeView } from './views/home-view'
import { CatalogView } from './views/catalog-view'
import { LibraryView } from './views/library-view'
import { DownloadsView } from './views/downloads-view'
import { SettingsView } from './views/settings-view'
import { EmulatorView } from './views/emulator-view'
import type { IHomeView, ICatalogView, ILibraryView, IDownloadsView, ISettingsView, IEmulatorView } from '../controller/view-interfaces'
import { SettingsManager, GSETTINGS_KEYS } from '../services/gsettings'

const { Gtk, Adw, GObject } = imports.gi

function mkSidebarRow(name: string, icon: string, label: string): GtkListBoxRow {
  const row = new Gtk.ListBoxRow({ css_classes: ['sidebar-row'], name })
  const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 })
  box.append(new Gtk.Image({ icon_name: icon, pixel_size: 16, valign: Gtk.Align.CENTER }))
  box.append(new Gtk.Label({ label, xalign: 0 }))
  row.set_child(box)
  return row
}

export const PlundernomeWindow = GObject.registerClass({
  GTypeName: 'PlundernomeWindow',
}, class PlundernomeWindow extends Adw.ApplicationWindow {
  private stack: GtkStack
  private homeView: IHomeView
  private catalogView: ICatalogView
  private libraryView: ILibraryView
  private downloadsView: IDownloadsView
  private settingsView: ISettingsView
  private emulatorView: IEmulatorView
  private sidebar: GtkListBox & { unselect_all(): void }
  private toastOverlay: AdwToastOverlay

  constructor(app: unknown) {
    super({ application: app, title: 'Plundernome', default_width: 960, default_height: 560 })
    loadAppCss(this.get_display() as GdkDisplay)

    const toolbar = new Adw.ToolbarView()
    this.set_content(toolbar)
    const header = new Adw.HeaderBar()
    toolbar.add_top_bar(header)

    const searchBtn = createButton({ iconName: 'edit-find-symbolic', tooltip: 'Search (Ctrl+F)', onClick: () => (this.stack.get_child_by_name('catalog') as ICatalogView | null)?.focusSearch?.() })
    header.pack_start(searchBtn)
    header.set_title_widget(new Adw.WindowTitle({ title: 'Plundernome' }))

    const downloadsBtn = createButton({ iconName: 'folder-download-symbolic', tooltip: 'Downloads', onClick: () => { this.navigateTo('downloads'); this.sidebar.unselect_all() } })
    header.pack_end(downloadsBtn)
    const settingsBtn = createButton({ iconName: 'preferences-system-symbolic', tooltip: 'Settings', onClick: () => { this.navigateTo('settings'); this.sidebar.unselect_all() } })
    header.pack_end(settingsBtn)

    this.sidebar = new Gtk.ListBox({ css_classes: ['navigation-sidebar'] }) as GtkListBox & { unselect_all(): void }
    this.sidebar.append(mkSidebarRow('home', 'go-home-symbolic', 'Home'))
    this.sidebar.append(mkSidebarRow('catalog', 'package-x-generic-symbolic', 'Catalog'))
    this.sidebar.append(mkSidebarRow('library', 'emblem-library-symbolic', 'Library'))

    this.stack = new Gtk.Stack()
    this.stack.set_hexpand(true); this.stack.set_vexpand(true)
    this.homeView = new HomeView()
    this.stack.add_named(this.homeView, 'home')
    this.catalogView = new CatalogView()
    this.stack.add_named(this.catalogView, 'catalog')
    this.libraryView = new LibraryView()
    this.stack.add_named(this.libraryView, 'library')
    this.downloadsView = new DownloadsView()
    this.stack.add_named(this.downloadsView, 'downloads')
    this.settingsView = new SettingsView()
    this.stack.add_named(this.settingsView, 'settings')
    this.emulatorView = new EmulatorView()
    this.stack.add_named(this.emulatorView, 'emulators')
    this.stack.set_visible_child_name('home')

    const sidebarPage = new Adw.NavigationPage({ title: 'Plundernome', child: this.sidebar })
    const contentPage = new Adw.NavigationPage({ title: 'Catalog', child: this.stack })
    const splitView = new Adw.NavigationSplitView()
    splitView.set_sidebar(sidebarPage); splitView.set_content(contentPage)

    this.toastOverlay = new Adw.ToastOverlay()

    const settings = new SettingsManager()
    const isFirstRun = !settings.getBool(GSETTINGS_KEYS.FIRST_RUN_COMPLETE)

    if (isFirstRun) {
      const rootStack = new Gtk.Stack()
      rootStack.set_hexpand(true); rootStack.set_vexpand(true)
      const welcomeView = new WelcomeView((msg) => this.showToast(msg))
      welcomeView.onWizardComplete(() => {
        rootStack.set_visible_child_name('app')
        this.stack.set_visible_child_name('catalog')
        this.set_default_size(960, 560)
        this.showToast('Setup complete! Browse the catalog to find games.')
        this.sidebar.select_row(this.sidebar.get_row_at_index(0))
      })
      rootStack.add_named(welcomeView, 'welcome')
      rootStack.add_named(splitView, 'app')
      this.toastOverlay.set_child(rootStack)
    } else {
      this.toastOverlay.set_child(splitView)
    }

    toolbar.set_content(this.toastOverlay)
    this.sidebar.connect('row-activated', (_l: unknown, row: unknown) => {
      const id = (row as GtkListBoxRow).get_name()
      this.navigateTo(id)
    })
    setupWindowShortcuts(this, this.stack)
    if (!isFirstRun) this.sidebar.select_row(this.sidebar.get_row_at_index(0))
  }

  navigateTo(viewId: string): void {
    this.stack.set_visible_child_name(viewId)
    if (!['home', 'catalog', 'library'].includes(viewId)) this.sidebar.unselect_all()
  }

  showToast(title: string, priority: 'normal' | 'high' = 'normal', timeout?: number): void {
    const toast = new Adw.Toast({ title, priority: priority === 'high' ? Adw.ToastPriority.HIGH : Adw.ToastPriority.NORMAL })
    if (timeout) toast.set_timeout(timeout)
    this.toastOverlay.add_toast(toast)
  }

  showToastWithAction(title: string, actionLabel: string, onAction: () => void): void {
    const toast = new Adw.Toast({ title, priority: Adw.ToastPriority.HIGH })
    toast.set_button_label(actionLabel)
    toast.set_timeout(8)
    const handler = toast.connect('button-clicked', () => { onAction(); toast.dismiss() })
    toast.connect('dismissed', () => { try { toast.disconnect(handler) } catch {} })
    this.toastOverlay.add_toast(toast)
  }

  showActionToast(title: string, actionLabel: string, onAction: () => void): void {
    this.showToastWithAction(title, actionLabel, onAction)
  }

  getHomeView(): IHomeView { return this.homeView }
  getCatalogView(): ICatalogView { return this.catalogView }
  getLibraryView(): ILibraryView { return this.libraryView }
  getDownloadsView(): IDownloadsView { return this.downloadsView }
  getSettingsView(): ISettingsView { return this.settingsView }
  getEmulatorsView(): IEmulatorView { return this.emulatorView }
})
