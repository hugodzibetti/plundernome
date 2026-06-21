import { buildCatalogViewUI, showGameDetail, renderChunk, loadMore, updateResultCount } from './catalog-render';
import { sortGames, type SortKey } from './catalog-sort';
import { setViewLoading, setViewError, updateEmptyState } from './catalog-loading';
import type { EnrichedMetadata } from '../../services/metadata-provider';
import { populateSourceFilters, applyFilters, type CatalogFilterState } from './catalog-filters';
import type { ScrollManager } from './catalog-scroll';
import type { Game } from '../../domain/models';
const { Gtk, Adw, GObject, GLib } = imports.gi;
export const CatalogView = GObject.registerClass(
  {
    GTypeName: 'CatalogView',
  },
  class CatalogView extends Adw.Bin {
    private games: Game[] = [];
    private flowBox: GtkFlowBox;
    private listBox: GtkListBox;
    private viewStack: GtkStack;
    private mainStack: GtkStack;
    private searchEntry: GtkSearchEntry;
    private searchBar: GtkSearchBar;
    private currentMode: 'grid' | 'list' = 'grid';
    private currentSort: SortKey = 'name-asc';
    private dlHandler: ((gameId: string) => void) | null = null;
    private wishlistHandler: ((gameId: string, wishlisted: boolean) => void) | null = null;
    private detailHandler: ((gameId: string) => void) | null = null;
    private resultCountLbl: GtkLabel;
    private emptyPage: GtkBox;
    private errorPage: AdwStatusPage | null = null;
    private loadingOverlay: GtkBox | null = null;
    private openSettingsHandler: (() => void) | null = null;
    private nameIndex: Map<string, string> = new Map();
    private debTimer: number | null = null;
    private filterState: CatalogFilterState;
    private filterEmit: () => void;
    private sourceBox: GtkBox;
    private filterSpinner: GtkSpinner;
    private scrollMgr: ScrollManager;
    private allFiltered: Game[] = [];
    private enrichedMap: Map<string, EnrichedMetadata> = new Map();
    constructor() {
      super();
      this.add_css_class('catalog-view');
      const ui = buildCatalogViewUI(
        () => loadMore(this.scrollMgr, this.allFiltered, this.flowBox, this.listBox, this.dlHandler, this.detailHandler, this.wishlistHandler),
        (st: CatalogFilterState) => { this.filterState = st; this.debouncedFilter(); },
        () => this.openSettingsHandler?.(),
      );
      this.scrollMgr = ui.scrollMgr;
      this.searchBar = ui.searchBar;
      this.searchBar.set_key_capture_widget(this);
      this.searchEntry = ui.searchEntry;
      this.filterSpinner = ui.filterSpinner;
      this.resultCountLbl = ui.resultCountLbl;
      this.viewStack = ui.viewStack;
      this.mainStack = ui.mainStack;
      this.flowBox = ui.flowBox;
      this.listBox = ui.listBox;
      this.filterState = ui.filterState;
      this.filterEmit = ui.filterEmit;
      this.sourceBox = ui.sourceBox;
      this.emptyPage = ui.emptyPage;
      this.set_child(ui.outer);
      this.detailHandler = (id: string) => showGameDetail(this.games, id, this.enrichedMap, this.dlHandler, this.wishlistHandler);
    }

    setSort(key: SortKey): void {
      this.currentSort = key;
      this.doFilter();
    }
    setGames(games: Game[]): void {
      this.games = games;
      this.nameIndex = new Map(games.map((g) => [g.id, g.name.toLowerCase()]));
      populateSourceFilters(
        this.sourceBox,
        [...new Set(games.map((g) => g.sourceId))],
        this.filterState,
        this.filterEmit,
      );
      this.doFilter();
    }

    private debouncedFilter(): void {
      this.filterSpinner.set_visible(true);
      this.filterSpinner.start();
      if (this.debTimer !== null) GLib.source_remove(this.debTimer);
      this.debTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 150, () => {
        this.debTimer = null;
        this.doFilter();
        return GLib.SOURCE_REMOVE;
      });
    }

    private doFilter(): void {
      this.filterSpinner.stop();
      this.filterSpinner.set_visible(false);
      const q = this.searchEntry.get_text().toLowerCase();
      this.allFiltered = sortGames(applyFilters(this.games, q, this.filterState, this.nameIndex), this.currentSort);
      this.scrollMgr.reset();
      renderChunk(this.allFiltered, this.flowBox, this.listBox, this.dlHandler, this.detailHandler, this.wishlistHandler, this.scrollMgr);
      updateEmptyState(this.mainStack, this.emptyPage, this.searchEntry, this.allFiltered.length);
      updateResultCount(this.resultCountLbl, this.games.length, this.allFiltered.length);
    }

    focusSearch(): void {
      this.searchBar.set_search_mode(true);
      this.searchEntry.grab_focus();
    }
    closeSearch(): boolean {
      if (!this.searchBar.get_search_mode()) return false;
      this.searchBar.set_search_mode(false);
      return true;
    }
    setViewMode(mode: 'grid' | 'list'): void {
      this.currentMode = mode;
      this.viewStack.set_visible_child_name(mode);
    }
    toggleViewMode(): 'grid' | 'list' {
      this.setViewMode(this.currentMode === 'grid' ? 'list' : 'grid');
      return this.currentMode;
    }
    onDownloadGame(cb: (gameId: string) => void): void {
      this.dlHandler = cb;
    }
    onToggleWishlist(cb: (gameId: string, wishlisted: boolean) => void): void {
      this.wishlistHandler = cb;
    }
    onOpenSettings(cb: () => void): void {
      this.openSettingsHandler = cb;
    }
    setLoading(loading: boolean): void {
      this.loadingOverlay = setViewLoading(this.mainStack, this.loadingOverlay, loading);
    }
    showError(msg: string): void {
      this.errorPage = setViewError(this.mainStack, this.errorPage, msg);
    }

    setEnrichedMetadata(gameId: string, meta: EnrichedMetadata): void {
      this.enrichedMap.set(gameId, meta);
    }
  },
);
