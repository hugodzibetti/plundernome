import { renderGameToBox } from '../widgets/game-card'
import type { Game } from '../../domain/models'
import { _t } from '../../domain/i18n'
import { ScrollManager, buildFlowView, buildListView } from './catalog-scroll'
import { buildFilterToolbar, type CatalogFilterState } from './catalog-filters'
import { buildEmptyPage, updateEmptyState } from './catalog-loading'
import { showGameDetailDialog } from '../widgets/game-detail-dialog'
import { createGridContent } from '../templates'

const { Gtk } = imports.gi

export function renderChunk(
  games: Game[], flowBox: GtkFlowBox, listBox: GtkListBox,
  dlHandler: ((gameId: string) => void) | null,
  detailHandler: ((gameId: string) => void) | null | undefined,
  wishlistHandler: ((gameId: string, wishlisted: boolean) => void) | null | undefined,
  scrollMgr: ScrollManager,
): void {
  renderGamesToBoxes(games, flowBox, listBox, dlHandler, detailHandler, null, scrollMgr.getRange(), wishlistHandler)
}

export function loadMore(scrollMgr: ScrollManager, games: Game[], flowBox: GtkFlowBox, listBox: GtkListBox,
  dlHandler: ((gameId: string) => void) | null,
  detailHandler: ((gameId: string) => void) | null | undefined,
  wishlistHandler: ((gameId: string, wishlisted: boolean) => void) | null | undefined): void {
  if (scrollMgr.renderedCount >= games.length) return
  scrollMgr.loadMore()
  renderGamesToBoxes(games, flowBox, listBox, dlHandler, detailHandler, null, scrollMgr.getRange(), wishlistHandler)
}

export function updateResultCount(lbl: GtkLabel, total: number, filtered: number): void {
  const fmt = total === 1 ? _t('catalog.result.count-one') : _t('catalog.result.count')
  lbl.set_label(fmt.replace('{0}', String(filtered)).replace('{1}', String(total)))
}

export function buildCatalogViewUI(
  onLoadMore: () => void,
  onFilterChange: (st: CatalogFilterState) => void,
  onOpenSettings: () => void,
  onSearchChange?: () => void,
): {
  outer: GtkBox;
  searchBar: GtkSearchBar;
  searchEntry: GtkSearchEntry;
  filterSpinner: GtkSpinner;
  resultCountLbl: GtkLabel;
  viewStack: GtkStack;
  mainStack: GtkStack;
  flowBox: GtkFlowBox;
  listBox: GtkListBox;
  filterState: CatalogFilterState;
  filterEmit: () => void;
  sourceBox: GtkBox;
  emptyPage: GtkBox;
  scrollMgr: ScrollManager;
} {
  const scrollMgr = new ScrollManager();
  const outer = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
  const searchBar = new Gtk.SearchBar();
  searchBar.add_css_class('catalog-search-bar');
  const searchEntry = new Gtk.SearchEntry({ placeholder_text: _t('catalog.search.placeholder') });
  searchEntry.add_css_class('catalog-search-entry');
  searchBar.set_child(searchEntry);
  const filterSpinner = new Gtk.Spinner();
  filterSpinner.add_css_class('catalog-filter-spinner');
  filterSpinner.set_visible(false);
  const searchRow = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 });
  searchRow.append(searchBar);
  searchRow.append(filterSpinner);
  const searchHeader = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 0 });
  searchHeader.append(searchRow);
  const resultCountLbl = new Gtk.Label({ label: '', xalign: 0, css_classes: ['search-result-count'] });
  searchHeader.append(resultCountLbl);
  const f = buildFilterToolbar(() => onFilterChange(f.state));
  searchHeader.append(f.bar);
  outer.append(searchHeader);
  const viewStack = new Gtk.Stack();
  viewStack.set_transition_type(Gtk.StackTransitionType.CROSSFADE);
  const flowBox = createGridContent()
  const gv = buildFlowView(flowBox)
  viewStack.add_named(gv.clamp, 'grid');
  const listBox = new Gtk.ListBox({ css_classes: ['boxed-list', 'catalog-list'] });
  const lv = buildListView(listBox);
  viewStack.add_named(lv.clamp, 'list');
  scrollMgr.connectScroll(gv.clamp, onLoadMore);
  scrollMgr.connectScroll(lv.clamp, onLoadMore);
  const emptyPage = buildEmptyPage(onOpenSettings);
  const mainStack = new Gtk.Stack();
  mainStack.set_vexpand(true);
  mainStack.add_named(viewStack, 'content');
  mainStack.add_named(emptyPage, 'empty');
  mainStack.set_visible_child_name('empty');
  outer.append(mainStack);
  return { outer, searchBar, searchEntry, filterSpinner, resultCountLbl, viewStack, mainStack, flowBox, listBox, filterState: f.state, filterEmit: f.emit, sourceBox: f.sourceBox, emptyPage, scrollMgr };
}

export function showGameDetail(
  games: Game[],
  gameId: string,
  enrichedMap: Map<string, any>,
  dlHandler: ((gameId: string) => void) | null,
  wishlistHandler: ((gameId: string, wishlisted: boolean) => void) | null,
): void {
  const game = games.find((g) => g.id === gameId);
  if (!game) return;
  const wishlisted = !!game.wishlisted;
  showGameDetailDialog(
    game,
    enrichedMap.get(gameId),
    () => dlHandler?.(game.id),
    () => wishlistHandler?.(gameId, !wishlisted),
  );
}

export function renderGamesToBoxes(
  games: Game[], flowBox: GtkFlowBox, listBox: GtkListBox,
  downloadHandler: ((gameId: string) => void) | null,
  detailHandler?: ((gameId: string) => void) | null,
  getCoverPath?: ((gameId: string) => string | undefined) | null,
  range?: { start: number; end: number },
  wishlistHandler?: ((gameId: string, wishlisted: boolean) => void) | null,
): void {
  let child: unknown = flowBox.get_child_at_index(0)
  while (child) { flowBox.remove(child); child = flowBox.get_child_at_index(0) }

  let row = listBox.get_first_child() as GtkWidget | null
  while (row) { const next = row.get_next_sibling(); listBox.remove(row); row = next as GtkWidget | null }

  const slice = range ? games.slice(range.start, range.end) : games

  for (const game of slice) {
    const coverPath = getCoverPath?.(game.id)
    renderGameToBox(game, flowBox, listBox, downloadHandler, detailHandler, coverPath, wishlistHandler)
  }
}
