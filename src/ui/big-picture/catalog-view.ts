import type { Game } from '../../domain/models'
import { showDetailDialog } from '../templates/detail-dialog'

const { Gtk, Adw, GObject, GLib } = imports.gi

export const BigCatalogView = GObject.registerClass({
  GTypeName: 'BigCatalogView',
}, class BigCatalogView extends Adw.Bin {
  private flowBox: GtkFlowBox
  private searchEntry: GtkSearchEntry
  private games: Game[] = []
  private dlHandler: ((gameId: string) => void) | null = null
  private searchHandler: ((query: string) => void) | null = null
  private debTimer: number | null = null

  constructor() {
    super()
    this.add_css_class('big-catalog')

    const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
    outer.set_margin_top(12)
    outer.set_margin_bottom(12)
    outer.set_margin_start(12)
    outer.set_margin_end(12)

    this.searchEntry = new Gtk.SearchEntry({ placeholder_text: 'Search games…', hexpand: true })
    this.searchEntry.add_css_class('big-catalog-search')
    this.searchEntry.connect('search-changed', () => {
      if (this.debTimer !== null) GLib.source_remove(this.debTimer)
      this.debTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
        this.debTimer = null
        this.searchHandler?.(this.searchEntry.get_text())
        return GLib.SOURCE_REMOVE
      })
    })
    outer.append(this.searchEntry)

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
    outer.append(clamp)

    this.set_child(outer)
  }

  setGames(games: Game[]): void {
    this.games = games
    let child = this.flowBox.get_child_at_index(0)
    while (child) { this.flowBox.remove(child); child = this.flowBox.get_child_at_index(0) }
    for (const game of games) {
      this.flowBox.append(this.buildCard(game))
    }
  }

  private buildCard(game: Game): GtkWidget {
    const card = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 })
    card.add_css_class('big-game-card')
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

    const titleLbl = new Gtk.Label({ label: game.name, wrap: true, css_classes: ['title-1'] })
    titleLbl.set_halign(Gtk.Align.CENTER)
    card.append(titleLbl)

    const gesture = new Gtk.GestureClick()
    gesture.connect('pressed', () => {
      const parent = this.get_native() as GtkWidget | null
      showDetailDialog({ game, onDownload: () => this.dlHandler?.(game.id), parent: parent ?? undefined })
    })
    card.add_controller(gesture)

    return card
  }

  onDownloadGame(cb: (gameId: string) => void): void { this.dlHandler = cb }
  onSearch(cb: (query: string) => void): void { this.searchHandler = cb }
})
