import type { ILibraryEntry } from '../../controller/view-interfaces'
import { createButton } from '../factory'

const { Gtk, Adw, GObject } = imports.gi

export const BigLibraryView = GObject.registerClass({
  GTypeName: 'BigLibraryView',
}, class BigLibraryView extends Adw.Bin {
  private flowBox: GtkFlowBox
  private emptyPage: GtkBox
  private stack: GtkStack
  private playHandler: ((gameId: string) => void) | null = null
  private removeHandler: ((gameId: string) => void) | null = null
  private openCatalogHandler: (() => void) | null = null

  constructor() {
    super()
    this.add_css_class('big-library')

    this.flowBox = new Gtk.FlowBox()
    this.flowBox.set_max_children_per_line(3)
    this.flowBox.set_min_children_per_line(1)
    this.flowBox.set_homogeneous(true)
    this.flowBox.set_selection_mode(Gtk.SelectionMode.NONE)
    this.flowBox.set_vexpand(true)
    this.flowBox.set_hexpand(true)

    const clamp = new Adw.ClampScrollable()
    clamp.set_child(this.flowBox)
    clamp.set_vexpand(true)

    const contentPage = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
    contentPage.set_margin_top(12)
    contentPage.set_margin_bottom(12)
    contentPage.set_margin_start(12)
    contentPage.set_margin_end(12)
    contentPage.append(clamp)

    this.emptyPage = this.buildEmptyState()

    this.stack = new Gtk.Stack()
    this.stack.add_named(contentPage, 'content')
    this.stack.add_named(this.emptyPage, 'empty')
    this.stack.set_visible_child_name('empty')
    this.set_child(this.stack)
  }

  private buildEmptyState(): GtkBox {
    const page = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12, halign: Gtk.Align.CENTER, valign: Gtk.Align.CENTER })
    page.add_css_class('empty-state')
    const icon = new Gtk.Label({ label: '📚' })
    icon.add_css_class('empty-icon')
    const title = new Gtk.Label({ label: 'No games installed', xalign: 0 })
    title.add_css_class('empty-title')
    const desc = new Gtk.Label({ label: 'Browse the catalog to find games to install', xalign: 0, wrap: true })
    desc.add_css_class('empty-desc')
    page.append(icon)
    page.append(title)
    page.append(desc)
    page.append(createButton({ label: 'Browse Catalog', cssClass: 'suggested-action', onClick: () => this.openCatalogHandler?.() }))
    return page
  }

  setGames(entries: ILibraryEntry[]): void {
    let child = this.flowBox.get_child_at_index(0)
    while (child) { this.flowBox.remove(child); child = this.flowBox.get_child_at_index(0) }

    if (entries.length === 0) {
      this.stack.set_visible_child_name('empty')
      return
    }

    this.stack.set_visible_child_name('content')
    for (const entry of entries) {
      this.flowBox.append(this.buildCard(entry))
    }
  }

  private buildCard(entry: ILibraryEntry): GtkWidget {
    const card = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 })
    card.add_css_class('big-library-card')
    card.set_hexpand(true)
    card.set_vexpand(true)

    const coverBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
    coverBox.add_css_class('big-game-card-cover')
    coverBox.set_size_request(280, 180)
    const placeholder = new Gtk.Label({ label: '🎮', css_classes: ['big-game-card-icon'] })
    placeholder.set_halign(Gtk.Align.CENTER)
    placeholder.set_valign(Gtk.Align.CENTER)
    coverBox.append(placeholder)
    card.append(coverBox)

    const titleLbl = new Gtk.Label({ label: entry.game.name, wrap: true, css_classes: ['title-1'] })
    titleLbl.set_halign(Gtk.Align.CENTER)
    card.append(titleLbl)

    const actions = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 8, halign: Gtk.Align.CENTER })
    actions.add_css_class('big-library-actions')
    actions.append(createButton({ iconName: 'media-playback-start-symbolic', label: 'Play', tooltip: 'Play game', onClick: () => this.playHandler?.(entry.game.id) }))
    actions.append(createButton({ iconName: 'user-trash-symbolic', label: 'Remove', tooltip: 'Remove game', onClick: () => this.removeHandler?.(entry.game.id) }))
    card.append(actions)

    return card
  }

  onPlayGame(cb: (gameId: string) => void): void { this.playHandler = cb }
  onRemoveGame(cb: (gameId: string) => void): void { this.removeHandler = cb }
  onOpenCatalog(cb: () => void): void { this.openCatalogHandler = cb }
})
