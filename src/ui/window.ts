import { setupWindowShortcuts } from './shortcuts'
import { PAGE_DEFS, type PageDef } from './window-page-defs'
import { loadAppCss } from './window-css'
import { buildSidebarAndPages } from './window-page-builder'
import type { ICatalogView, ILibraryView, IDownloadsView, ISettingsView, IEmulatorView } from '../controller/view-interfaces'
import { createButton } from './factory'
import { WelcomeView } from './views/welcome-view'
import { SettingsManager, GSETTINGS_KEYS } from '../services/gsettings'

const { Gtk, Adw, GObject } = imports.gi

export const PlundernomeWindow = GObject.registerClass({
  GTypeName: 'PlundernomeWindow',
}, class PlundernomeWindow extends Adw.ApplicationWindow {
  private stack: GtkStack
  private header: AdwHeaderBar
  private contentNavPage: AdwNavigationPage
  private currentSuffix: unknown = null
  private __toastOverlay: AdwToastOverlay | null = null
  private catalogView: ICatalogView | null = null
  private libraryView: ILibraryView | null = null
  private downloadsView: IDownloadsView | null = null
  private settingsView: ISettingsView | null = null
  private emulatorView: IEmulatorView | null = null

  constructor(app: unknown) {
    super({ application: app, title: 'Plundernome', default_width: 960, default_height: 560 })

    loadAppCss(this.get_display() as GdkDisplay)

    const toolbar = new Adw.ToolbarView()
    this.set_content(toolbar)
    this.header = new Adw.HeaderBar()
    this.header.set_title_widget(new Adw.WindowTitle({ title: 'Plundernome' }))

    const searchBtn = createButton({ iconName: 'edit-find-symbolic', tooltip: 'Search (Ctrl+F)', onClick: () => (this.stack.get_child_by_name('catalog') as ICatalogView | null)?.focusSearch?.() })
    this.header.pack_start(searchBtn)
    toolbar.add_top_bar(this.header)

    const { sidebar, stack: pageStack, catalogView, libraryView, downloadsView, settingsView, emulatorView } = buildSidebarAndPages((id) => this.navigateTo(id))
    this.stack = pageStack
    this.catalogView = catalogView
    this.libraryView = libraryView
    this.downloadsView = downloadsView
    this.settingsView = settingsView
    this.emulatorView = emulatorView

    const sidebarPage = new Adw.NavigationPage({ title: 'Plundernome', child: sidebar })
    this.contentNavPage = new Adw.NavigationPage({ title: 'Catalog', child: this.stack })
    const splitView = new Adw.NavigationSplitView()
    splitView.set_sidebar(sidebarPage); splitView.set_content(this.contentNavPage)

    const settings = new SettingsManager()
    const isFirstRun = !settings.getBool(GSETTINGS_KEYS.FIRST_RUN_COMPLETE)

    const rootStack = new Gtk.Stack()
    rootStack.set_hexpand(true); rootStack.set_vexpand(true)

    if (isFirstRun) {
      this.set_default_size(680, 420)
      const welcomeView = new WelcomeView((msg) => this.showToast(msg))
      welcomeView.onWizardComplete(() => {
        rootStack.set_visible_child_name('app')
        this.stack.set_visible_child_name('catalog')
        const def = PAGE_DEFS.find(p => p.id === 'catalog')
        if (def) { this.contentNavPage.set_title(def.label); this.updateHeaderSuffix(def) }
        this.set_default_size(960, 560)
        this.showToast('Setup complete! Browse the catalog to find games.')
        sidebar.select_row(sidebar.get_row_at_index(0))
      })
      rootStack.add_named(welcomeView, 'welcome')
      rootStack.set_visible_child_name('welcome')
    }
    rootStack.add_named(splitView, 'app')
    if (!isFirstRun) rootStack.set_visible_child_name('app')

    const toastOverlay = new Adw.ToastOverlay()
    toastOverlay.set_child(rootStack)
    toolbar.set_content(toastOverlay); this.__toastOverlay = toastOverlay

    sidebar.connect('row-activated', (_l: unknown, row: unknown) => {
      const id = (row as GtkListBoxRow).get_name()
      this.stack.set_visible_child_name(id)
      const def = PAGE_DEFS.find(p => p.id === id)
      if (!def) return
      this.contentNavPage.set_title(def.label)
      this.header.set_title_widget(new Adw.WindowTitle({ title: def.label })); this.updateHeaderSuffix(def)
    })

    setupWindowShortcuts(this, this.stack)
    if (!isFirstRun) {
      sidebar.select_row(sidebar.get_row_at_index(0))
      this.stack.set_visible_child_name('catalog')
      this.updateHeaderSuffix(PAGE_DEFS[0]!)
    }
  }

  private updateHeaderSuffix(def: PageDef): void {
    if (this.currentSuffix) { this.header.remove(this.currentSuffix); this.currentSuffix = null }
    if (def.headerSuffix) {
      this.currentSuffix = def.headerSuffix(this)
      this.header.pack_end(this.currentSuffix)
    }
  }

  navigateTo(viewId: string): void {
    this.stack.set_visible_child_name(viewId)
    const def = PAGE_DEFS.find(p => p.id === viewId)
    if (def) {
      this.contentNavPage.set_title(def.label)
      this.header.set_title_widget(new Adw.WindowTitle({ title: def.label }))
      this.updateHeaderSuffix(def)
    }
  }

  showToast(title: string, priority: 'normal' | 'high' = 'normal', timeout?: number): void {
    const toast = new Adw.Toast({
      title, priority: priority === 'high' ? Adw.ToastPriority.HIGH : Adw.ToastPriority.NORMAL,
    })
    if (timeout) toast.set_timeout(timeout)
    this.__toastOverlay?.add_toast(toast)
  }

  showToastWithAction(title: string, actionLabel: string, onAction: () => void): void {
    const toast = new Adw.Toast({ title, priority: Adw.ToastPriority.HIGH })
    toast.set_button_label(actionLabel)
    toast.set_timeout(8)
    const handler = toast.connect('button-clicked', () => { onAction(); toast.dismiss() })
    toast.connect('dismissed', () => { try { toast.disconnect(handler) } catch { } })
    this.__toastOverlay?.add_toast(toast)
  }

  showActionToast(title: string, actionLabel: string, onAction: () => void): void {
    this.showToastWithAction(title, actionLabel, onAction)
  }

  getCatalogView(): ICatalogView { return this.catalogView!; }
  getLibraryView(): ILibraryView { return this.libraryView!; }
  getDownloadsView(): IDownloadsView { return this.downloadsView!; }
  getSettingsView(): ISettingsView { return this.settingsView!; }
  getEmulatorsView(): IEmulatorView { return this.emulatorView!; }
})
