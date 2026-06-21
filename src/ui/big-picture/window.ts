import { loadAppCss } from '../window-css'
import { createButton } from '../factory'
import { BigCatalogView } from './catalog-view'
import { BigLibraryView } from './library-view'
import { BigDownloadsView } from './downloads-view'

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
}, class BigPictureWindow extends Adw.ApplicationWindow {
  private stack: GtkStack
  private catalogView: AdwBin
  private libraryView: AdwBin
  private downloadsView: AdwBin
  private __toastOverlay: AdwToastOverlay | null = null

  constructor(app: unknown) {
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

    this.catalogView = new BigCatalogView()
    this.libraryView = new BigLibraryView()
    this.downloadsView = new BigDownloadsView()
    const settingsView = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
    settingsView.add_css_class('big-picture-settings')

    this.stack.add_named(this.catalogView, 'catalog')
    this.stack.add_named(this.libraryView, 'library')
    this.stack.add_named(this.downloadsView, 'downloads')
    this.stack.add_named(settingsView, 'settings')
    this.stack.set_visible_child_name('catalog')

    const toastOverlay = new Adw.ToastOverlay()
    toastOverlay.set_child(this.stack)
    this.__toastOverlay = toastOverlay

    const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 })
    outer.append(toastOverlay)
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

  navigateTo(viewId: string): void { this.stack.set_visible_child_name(viewId) }
  getCatalogView(): AdwBin { return this.catalogView }
  getLibraryView(): AdwBin { return this.libraryView }
  getDownloadsView(): AdwBin { return this.downloadsView }

  showToast(title: string): void {
    this.__toastOverlay?.add_toast(new Adw.Toast({ title }))
  }
})
