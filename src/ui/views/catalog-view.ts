import type { Game } from '../../domain/models'
import type { EnrichedMetadata } from '../../services/metadata-provider'
import { showGameDetailDialog } from '../widgets/game-detail-dialog'
import { createScrollContent } from '../templates/scroll-content'
import { GameCard } from '../widgets/game-card'

const { Gtk, Adw, GObject, GLib } = imports.gi

export const CatalogView = GObject.registerClass(
  { GTypeName: 'CatalogView' },
  class CatalogView extends Adw.Bin {
    private games: Game[] = []
    private flowBox: GtkFlowBox
    private searchEntry: GtkSearchEntry
    private mainStack: GtkStack
    private loadingPage: GtkBox
    private errorPage: AdwStatusPage | null = null
    private dlHandler: ((gameId: string) => void) | null = null
    private searchHandler: ((query: string) => void) | null = null
    private settingsHandler: (() => void) | null = null
    private debTimer: number | null = null
    private enrichedMap: Map<string, EnrichedMetadata> = new Map()

    constructor() {
      super()
      this.add_css_class('catalog-view')

      this.searchEntry = new Gtk.SearchEntry({ placeholder_text: 'Search games…' })
      this.searchEntry.add_css_class('catalog-search-entry')
      this.searchEntry.connect('search-changed', () => this.debouncedSearch())

      this.flowBox = new Gtk.FlowBox()
      this.flowBox.set_max_children_per_line(3)
      this.flowBox.set_min_children_per_line(1)
      this.flowBox.set_homogeneous(true)
      this.flowBox.set_selection_mode(Gtk.SelectionMode.NONE)
      this.flowBox.add_css_class('catalog-flowbox')

      const clamp = createScrollContent(this.flowBox, { expand: true })

      const content = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 })
      content.append(this.searchEntry)
      content.append(clamp)
      content.add_css_class('catalog-content')

      this.loadingPage = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL })
      this.loadingPage.set_valign(Gtk.Align.CENTER)
      this.loadingPage.set_halign(Gtk.Align.CENTER)
      this.loadingPage.add_css_class('catalog-loading')
      const spinner = new Gtk.Spinner()
      spinner.start()
      this.loadingPage.append(spinner)

      this.mainStack = new Gtk.Stack()
      this.mainStack.set_vexpand(true)
      this.mainStack.add_named(content, 'content')
      this.mainStack.add_named(this.loadingPage, 'loading')
      this.mainStack.set_visible_child_name('content')
      this.set_child(this.mainStack)
    }

    onSearchChanged(cb: (query: string) => void): void {
      this.searchHandler = cb
    }

    private debouncedSearch(): void {
      if (this.debTimer !== null) GLib.source_remove(this.debTimer)
      this.debTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
        this.debTimer = null
        this.searchHandler?.(this.searchEntry.get_text())
        return GLib.SOURCE_REMOVE
      })
    }

    setGames(games: Game[]): void {
      this.games = games
      let child: unknown = this.flowBox.get_child_at_index(0)
      while (child) { this.flowBox.remove(child); child = this.flowBox.get_child_at_index(0) }
      for (const game of games) {
        const card = new GameCard(game)
        card.connect('show-detail', (_w: unknown, id: unknown) => {
          const g = this.games.find(g2 => g2.id === id)
          if (!g) return
          const meta = this.enrichedMap.get(id as string)
          const sourceIds = [...new Set(this.games.filter(g2 => g2.name === g.name).map(g2 => g2.sourceId))]
          showGameDetailDialog(g, meta, () => this.dlHandler?.(g.id), undefined, sourceIds)
        })
        card.connect('play-game', (_w: unknown, id: unknown) => this.dlHandler?.(id as string))
        this.flowBox.append(card)
      }
    }

    focusSearch(): void { this.searchEntry.grab_focus() }
    closeSearch(): boolean { return false }
    onDownloadGame(cb: (gameId: string) => void): void { this.dlHandler = cb }
    onOpenSettings(cb: () => void): void { this.settingsHandler = cb }
    setEnrichedMetadata(gameId: string, meta: EnrichedMetadata): void { this.enrichedMap.set(gameId, meta) }
    setLoading(loading: boolean): void { this.mainStack.set_visible_child_name(loading ? 'loading' : 'content') }
    showError(message: string): void {
      if (!this.errorPage) {
        this.errorPage = new Adw.StatusPage({ title: 'Error', description: message })
        this.errorPage.add_css_class('catalog-error')
        this.mainStack.add_named(this.errorPage, 'error')
      }
      this.errorPage.set_description(message)
      this.mainStack.set_visible_child_name('error')
    }
  },
)
