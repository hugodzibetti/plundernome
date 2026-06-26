import { loadAppCss } from '../window-css'
import { createButton } from '../factory'
import { CatalogView } from '../views/catalog-view'
import { LibraryView } from '../views/library-view'
import { DownloadsView } from '../views/downloads-view'
import { SettingsView } from '../views/settings-view'
import { EmulatorView } from '../views/emulator-view'
import type { IHomeView, ICatalogView, ILibraryView, IDownloadsView, ISettingsView, IWindow } from '../../controller/view-interfaces'
const { Gtk, Adw, GObject, Gio, GLib } = imports.gi

export const BigPictureApp = GObject.registerClass({
  GTypeName: 'BigPictureApp',
}, class BigPictureApp extends Adw.Application {
  constructor() {
    super({
      application_id: 'io.github.plundernome',
      flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
    })
    GLib.set_prgname('plundernome')
    GLib.set_application_name('Plundernome')
    imports.gi.Adw.StyleManager.get_default().set_color_scheme(imports.gi.Adw.ColorScheme.DEFAULT)
    this.connect('activate', this.onActivate.bind(this))
  }

  private onActivate(): void {
    const win = new BigPictureWindow(this)
    win.present()
  }
})

export const BigPictureWindow = GObject.registerClass({
  GTypeName: 'BigPictureWindow',
}, class BigPictureWindow extends Adw.ApplicationWindow implements IWindow {
  private stack: GtkStack
  private catalogView: ICatalogView
  private libraryView: ILibraryView
  private downloadsView: IDownloadsView
  private settingsView: ISettingsView
  private toastOverlay: AdwToastOverlay

  constructor(app: AdwApplication) {
    super({ application: app })
    ;(this as unknown as { fullscreen(): void }).fullscreen()
    this.add_css_class('big-picture')
    loadAppCss(this.get_display() as GdkDisplay)

    const toolbar = new Adw.ToolbarView()
    this.set_content(toolbar)

    const header = new Adw.HeaderBar()
    ;(header as unknown as GtkWidget).add_css_class('big-picture-header')
    const closeBtn = createButton({
      iconName: 'window-close-symbolic',
      tooltip: 'Close',
      onClick: () => (this as unknown as { destroy(): void }).destroy(),
    })
    header.pack_end(closeBtn)
    toolbar.add_top_bar(header)

    this.stack = new Gtk.Stack()
    this.stack.set_transition_type(Gtk.StackTransitionType.SLIDE_LEFT_RIGHT)
    this.stack.set_vexpand(true)
    this.stack.set_hexpand(true)

    this.catalogView = new CatalogView()
    this.libraryView = new LibraryView()
    this.downloadsView = new DownloadsView()
    this.settingsView = new SettingsView()
    new EmulatorView()

    this.stack.add_named(this.catalogView as unknown as GtkWidget, 'catalog')
    this.stack.add_named(this.libraryView as unknown as GtkWidget, 'library')
    this.stack.add_named(this.downloadsView as unknown as GtkWidget, 'downloads')
    this.stack.add_named(this.settingsView as unknown as GtkWidget, 'settings')
    this.stack.set_visible_child_name('catalog')

    this.toastOverlay = new Adw.ToastOverlay()
    this.toastOverlay.set_child(this.stack)

    const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 })
    outer.append(this.toastOverlay)
    outer.append(this.buildNavBar())
    toolbar.set_content(outer)

    this.setupKeyboardNav()
  }

  private buildNavBar(): GtkBox {
    const navBar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 0, homogeneous: true })
    navBar.add_css_class('big-picture-nav')
    const items = [
      { id: 'catalog', icon: 'folder-symbolic', label: 'Catalog' },
      { id: 'library', icon: 'computer-symbolic', label: 'Library' },
      { id: 'downloads', icon: 'emblem-downloads-symbolic', label: 'Downloads' },
      { id: 'settings', icon: 'emblem-system-symbolic', label: 'Settings' },
    ]
    for (const item of items) {
      const btn = createButton({
        iconName: item.icon, label: item.label, tooltip: item.label,
        onClick: () => this.navigateTo(item.id),
      })
      btn.add_css_class('big-picture-nav-btn')
      btn.set_hexpand(true)
      navBar.append(btn)
    }
    return navBar
  }

  private setupKeyboardNav(): void {
    const controller = new Gtk.ShortcutController()
    controller.set_scope(Gtk.ShortcutScope.GLOBAL)
    const ids = ['catalog', 'library', 'downloads', 'settings']
    for (let i = 0; i < ids.length; i++) {
      const idx = i
      controller.add_shortcut(
        new Gtk.Shortcut({
          trigger: Gtk.ShortcutTrigger.parse_string(`<Control>${idx + 1}`),
          action: new Gtk.CallbackAction(() => { this.navigateTo(ids[idx]!); return true }),
        }),
      )
    }
    this.add_controller(controller)
  }

  navigateTo(viewId: string): void {
    this.stack.set_visible_child_name(viewId)
  }

  getHomeView(): IHomeView { return this.catalogView as unknown as IHomeView }
  getCatalogView(): ICatalogView { return this.catalogView }
  getLibraryView(): ILibraryView { return this.libraryView }
  getDownloadsView(): IDownloadsView { return this.downloadsView }
  getSettingsView(): ISettingsView { return this.settingsView }

  showToast(title: string): void {
    this.toastOverlay.add_toast(new Adw.Toast({ title }))
  }

  showActionToast(title: string, actionLabel: string, onAction: () => void): void {
    const toast = new Adw.Toast({ title, priority: Adw.ToastPriority.HIGH })
    toast.set_button_label(actionLabel)
    toast.set_timeout(8)
    const handler = toast.connect('button-clicked', () => { onAction(); toast.dismiss() })
    toast.connect('dismissed', () => { try { toast.disconnect(handler) } catch {} })
    this.toastOverlay.add_toast(toast)
  }

  showToastWithAction(title: string, actionLabel: string, onAction: () => void): void {
    this.showActionToast(title, actionLabel, onAction)
  }
})
