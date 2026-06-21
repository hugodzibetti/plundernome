import { renderGamesToBoxes } from './catalog-render'
import { sortGames, type SortKey } from './catalog-sort'
import { buildLoadingOverlay, buildErrorPage, buildEmptyPage } from './catalog-loading'
import { GameDetailDialog } from '../game-detail-dialog'
import { buildFilterToolbar, populateSourceFilters, applyFilters, type CatalogFilterState } from './catalog-filters'
import { ScrollManager, buildFlowView, buildListView } from './catalog-scroll'
import type { Game } from '../../domain/models'
import { _t } from '../../domain/i18n'
const { Gtk, Adw, GObject, GLib } = imports.gi
export const CatalogView = GObject.registerClass({
  GTypeName: 'CatalogView',
}, class CatalogView extends Adw.Bin {
  private games: Game[] = []
  private flowBox: GtkFlowBox
  private listBox: GtkListBox
  private viewStack: GtkStack
  private mainStack: GtkStack
  private searchEntry: GtkSearchEntry
  private searchBar: GtkSearchBar
  private currentMode: 'grid' | 'list' = 'grid'
  private currentSort: SortKey = 'name-asc'
  private dlHandler: ((gameId: string) => void) | null = null
  private wishlistHandler: ((gameId: string, wishlisted: boolean) => void) | null = null
  private detailHandler: ((gameId: string) => void) | null = null
  private resultCountLbl: GtkLabel
  private emptyPage: GtkBox
  private errorPage: AdwStatusPage | null = null
  private loadingOverlay: GtkBox | null = null
  private openSettingsHandler: (() => void) | null = null
  private nameIndex: Map<string, string> = new Map()
  private debTimer: number | null = null
  private filterState: CatalogFilterState
  private filterEmit: () => void
  private sourceBox: GtkBox
  private filterSpinner: GtkSpinner
  private scrollMgr: ScrollManager
  private gridClamp: AdwClampScrollable
  private listClamp: AdwClampScrollable
  private allFiltered: Game[] = []
  constructor() {
    super(); this.add_css_class('catalog-view')
    this.scrollMgr = new ScrollManager()
    const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 })
    this.searchBar = new Gtk.SearchBar()
    this.searchBar.add_css_class('catalog-search-bar')
    this.searchEntry = new Gtk.SearchEntry({ placeholder_text: _t('catalog.search.placeholder') })
    this.searchEntry.add_css_class('catalog-search-entry')
    this.searchBar.set_child(this.searchEntry); this.searchBar.set_key_capture_widget(this)
    this.filterSpinner = new Gtk.Spinner()
    this.filterSpinner.add_css_class('catalog-filter-spinner')
    this.filterSpinner.set_visible(false)
    const searchRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 })
    searchRow.append(this.searchBar); searchRow.append(this.filterSpinner)
    const searchHeader = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 })
    searchHeader.append(searchRow)
    this.resultCountLbl = new Gtk.Label({ label: '', xalign: 0, css_classes: ['search-result-count'] })
    searchHeader.append(this.resultCountLbl)
    const f = buildFilterToolbar((st) => { this.filterState = st; this.scheduleFilter() })
    this.filterState = f.state; this.filterEmit = f.emit; this.sourceBox = f.sourceBox
    searchHeader.append(f.bar); outer.append(searchHeader)
    this.viewStack = new Gtk.Stack(); this.viewStack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)
    this.flowBox = new Gtk.FlowBox()
    this.flowBox.set_max_children_per_line(4); this.flowBox.set_min_children_per_line(2)
    this.flowBox.set_homogeneous(false); this.flowBox.set_selection_mode(Gtk.SelectionMode.NONE)
    const gv = buildFlowView(this.flowBox); this.gridClamp = gv.clamp; this.viewStack.add_named(gv.clamp, 'grid')
    this.listBox = new Gtk.ListBox({ css_classes: ['boxed-list', 'catalog-list'] }); const lv = buildListView(this.listBox); this.listClamp = lv.clamp; this.viewStack.add_named(lv.clamp, 'list')
    this.scrollMgr.connectScroll(this.gridClamp, () => this.loadMore()); this.scrollMgr.connectScroll(this.listClamp, () => this.loadMore())
    this.emptyPage = buildEmptyPage(() => this.openSettingsHandler?.())
    this.mainStack = new Gtk.Stack(); this.mainStack.set_vexpand(true)
    this.mainStack.add_named(this.viewStack, 'content')
    this.mainStack.add_named(this.emptyPage, 'empty')
    this.mainStack.set_visible_child_name('empty')
    outer.append(this.mainStack); this.set_child(outer)
    this.searchEntry.connect('search-changed', () => this.scheduleFilter())
    this.detailHandler = (id: string) => this.showGameDetail(id)
  }

  setSort(key: SortKey): void { this.currentSort = key; this.filterAndRender() }
  setGames(games: Game[]): void {
    this.games = games
    this.nameIndex = new Map(games.map(g => [g.id, g.name.toLowerCase()]))
    populateSourceFilters(this.sourceBox, [...new Set(games.map(g => g.sourceId))], this.filterState, this.filterEmit)
    this.filterAndRender()
  }

  private scheduleFilter(): void {
    this.filterSpinner.set_visible(true); this.filterSpinner.start()
    if (this.debTimer !== null) GLib.source_remove(this.debTimer)
    this.debTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
      this.debTimer = null; this.filterAndRender(); return GLib.SOURCE_REMOVE
    })
  }

  private filterAndRender(): void {
    this.filterSpinner.stop(); this.filterSpinner.set_visible(false)
    const q = this.searchEntry.get_text().toLowerCase()
    this.allFiltered = sortGames(applyFilters(this.games, q, this.filterState, this.nameIndex), this.currentSort)
    this.scrollMgr.reset(); this.renderChunk()
    this.updateEmptyState(this.allFiltered.length); this.updateResultCount(this.allFiltered.length)
  }

  private renderChunk(): void {
    renderGamesToBoxes(this.allFiltered, this.flowBox, this.listBox, this.dlHandler, this.detailHandler, null, this.scrollMgr.getRange(), this.wishlistHandler)
  }

  private loadMore(): void {
    if (this.scrollMgr.renderedCount >= this.allFiltered.length) return
    this.scrollMgr.loadMore(); this.renderChunk()
  }
  private updateResultCount(n: number): void {
    const fmt = this.games.length === 1 ? _t('catalog.result.count-one') : _t('catalog.result.count')
    this.resultCountLbl.set_label(fmt.replace('{0}', String(n)).replace('{1}', String(this.games.length)))
  }

  private updateEmptyState(n: number): void {
    if (n > 0) { this.mainStack.set_visible_child_name('content'); return }
    const q = this.searchEntry.get_text().toLowerCase()
    let child: unknown = this.emptyPage.get_first_child(); let idx = 0
    while (child) {
      if (idx === 1 && child instanceof Gtk.Label) child.set_label(q ? _t('catalog.empty.title') : _t('catalog.empty.title-empty'))
      if (idx === 2 && child instanceof Gtk.Label) child.set_label(q ? _t('catalog.empty.no-results').replace('{0}', q) : _t('catalog.empty.description-empty'))
      child = (child as GtkWidget).get_next_sibling(); idx++
    }
    this.mainStack.set_visible_child_name('empty')
  }
  focusSearch(): void { this.searchBar.set_search_mode(true); this.searchEntry.grab_focus() }
  closeSearch(): boolean { if (!this.searchBar.get_search_mode()) return false; this.searchBar.set_search_mode(false); return true }
  setViewMode(mode: 'grid' | 'list'): void { this.currentMode = mode; this.viewStack.set_visible_child_name(mode) }
  toggleViewMode(): 'grid' | 'list' { this.setViewMode(this.currentMode === 'grid' ? 'list' : 'grid'); return this.currentMode }
  onDownloadGame(cb: (gameId: string) => void): void { this.dlHandler = cb }
  onToggleWishlist(cb: (gameId: string, wishlisted: boolean) => void): void { this.wishlistHandler = cb }
  onOpenSettings(cb: () => void): void { this.openSettingsHandler = cb }
  setLoading(loading: boolean): void {
    if (loading) {
      if (!this.loadingOverlay) this.loadingOverlay = buildLoadingOverlay()
      this.mainStack.add_named(this.loadingOverlay, 'loading'); this.mainStack.set_visible_child_name('loading')
    } else if (this.loadingOverlay) {
      this.mainStack.remove(this.loadingOverlay); this.loadingOverlay = null
    }
  }
  showError(msg: string): void {
    if (!this.errorPage) { this.errorPage = buildErrorPage(msg); this.mainStack.add_named(this.errorPage, 'error') }
    this.errorPage.set_description(msg); this.mainStack.set_visible_child_name('error')
  }
  private showGameDetail(gameId: string): void {
    const game = this.games.find(g => g.id === gameId)
    if (game) GameDetailDialog(game, undefined, this, (id) => this.dlHandler?.(id))
  }
})
