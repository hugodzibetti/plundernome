import { renderGameRows, type LibraryEntry } from '../widgets/library-row';
import { _t } from '../../domain/i18n';
import { createButton, createFilePicker } from '../factory';
import { createSortDropdown, sortEntries, SORT_OPTS, type SortKey } from './library-sort';
import { computePlaytimeSummary, formatPlaytimeSummary } from './library-playtime';
import { createScrollContent } from '../templates/scroll-content';
import { buildEmptyState } from '../templates/empty-state';

const { Gtk, Adw, GObject } = imports.gi;

export const LibraryView = GObject.registerClass(
  {
    GTypeName: 'LibraryView',
  },
  class LibraryView extends Adw.Bin {
    private stack: GtkStack;
    private listBox: GtkListBox;
    private emptyPage: GtkBox;
    private libraryClamp: AdwClampScrollable;
    private importBtn: GtkButton;
    private playHandler: ((gameId: string) => void) | null = null;
    private removeHandler: ((gameId: string) => void) | null = null;
    private launchOptionsHandler: ((gameId: string) => void) | null = null;
    private importHandler: ((path: string) => void) | null = null;
    private steamImportHandler: (() => void) | null = null;
    private refreshHandler: (() => void) | null = null;
    private openCatalogHandler: (() => void) | null = null;
    private sortKey: SortKey = 'name';
    private sortDropdown: GtkDropDown;
    private addToAppMenuHandler: ((gameId: string) => void) | null = null;
    private removeFromAppMenuHandler: ((gameId: string) => void) | null = null;
    private backupHandler: ((gameId: string) => void) | null = null;
    private restoreHandler: ((gameId: string) => void) | null = null;
    private achievementsHandler: ((gameId: string) => void) | null = null;
    private sortChangedHandler: ((key: string) => void) | null = null;
    private cachedGames: LibraryEntry[] = [];

    constructor() {
      super();
      this.add_css_class('library-view');
      this.listBox = new Gtk.ListBox({ css_classes: ['boxed-list'] });
      const listBoxWrap = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
      const headerBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 });
      headerBox.append(
        createButton({
          iconName: 'view-refresh-symbolic',
          tooltip: _t('library.refresh'),
          onClick: () => this.refreshHandler?.(),
        }),
      );
      this.sortDropdown = createSortDropdown((key) => {
        this.sortKey = key;
        this.renderGames();
        this.sortChangedHandler?.(key);
      });
      headerBox.append(this.sortDropdown);
      listBoxWrap.append(headerBox);
      listBoxWrap.append(this.listBox);
      this.importBtn = createButton({
        label: _t('library.steam-import'),
        tooltip: _t('library.steam-import.tooltip'),
        cssClass: 'suggested-action',
        onClick: () => this.steamImportHandler?.(),
      });
      listBoxWrap.append(this.importBtn);
      this.libraryClamp = createScrollContent(listBoxWrap, { expand: true });
      this.stack = new Gtk.Stack();
      this.set_child(this.stack);
      this.emptyPage = buildEmptyState({
        icon: '📚',
        title: _t('library.empty.title'),
        description: _t('library.empty.description'),
        actionLabel: _t('library.empty.action'),
        onAction: () => this.openCatalogHandler?.(),
      });
      this.stack.add_child(this.emptyPage);
      this.stack.add_child(this.libraryClamp);
      this.stack.set_visible_child(this.emptyPage);
    }

    onImportFolder(cb: (path: string) => void): void {
      this.importHandler = cb;
    }
    onSteamImport(cb: () => void): void {
      this.steamImportHandler = cb;
    }
    onRefreshLibrary(cb: () => void): void {
      this.refreshHandler = cb;
    }
    onOpenCatalog(cb: () => void): void {
      this.openCatalogHandler = cb;
    }

    showImportDialog(): void {
      const win = this.get_native() as GtkWidget | null;
      if (!win) return;
      createFilePicker({ action: 'select-folder', title: _t('library.select-folder'), parent: win, onSelect: (p) => this.importHandler?.(p) });
    }

    setGames(games: LibraryEntry[]): void {
      this.cachedGames = games;
      this.renderGames();
    }

    private renderGames(): void {
      const sorted = sortEntries(this.cachedGames, this.sortKey);
      if (sorted.length === 0) {
        this.stack.set_visible_child(this.emptyPage);
        return;
      }
      this.stack.set_visible_child(this.libraryClamp);
      renderGameRows(
        this.listBox, sorted,
        this.launchOptionsHandler!, this.playHandler!, this.removeHandler!,
        this.addToAppMenuHandler ?? undefined,
        this.removeFromAppMenuHandler ?? undefined,
        this.backupHandler ?? undefined,
        this.restoreHandler ?? undefined,
        this.achievementsHandler ?? undefined,
      );
    }

    getSelectedGameId(): string | null {
      const row = this.listBox.get_selected_row() as GtkWidget | null;
      return (row?.get_data?.('gameId') as string) ?? null;
    }
    triggerPlay(gameId: string): void { this.playHandler?.(gameId); }
    triggerRemove(gameId: string): void { this.removeHandler?.(gameId); }
    onPlayGame(cb: (gameId: string) => void): void { this.playHandler = cb; }
    onRemoveGame(cb: (gameId: string) => void): void { this.removeHandler = cb; }
    onLaunchOptions(cb: (gameId: string) => void): void { this.launchOptionsHandler = cb; }
    setSortKey(key: SortKey): void {
      this.sortKey = key;
      this.sortDropdown.set_selected(SORT_OPTS.findIndex((o) => o.key === key));
      this.renderGames();
    }
    onSortChanged(cb: (key: string) => void): void { this.sortChangedHandler = cb; }
    onAddToAppMenu(cb: (gameId: string) => void): void { this.addToAppMenuHandler = cb; }
    onRemoveFromAppMenu(cb: (gameId: string) => void): void { this.removeFromAppMenuHandler = cb; }
    onBackupSave(cb: (gameId: string) => void): void { this.backupHandler = cb; }
    onRestoreSave(cb: (gameId: string) => void): void { this.restoreHandler = cb; }
    onAchievements(cb: (gameId: string) => void): void { this.achievementsHandler = cb; }
    refreshLibrary(): void { this.refreshHandler?.(); }
    getPlaytimeSummary(): string { return formatPlaytimeSummary(computePlaytimeSummary(this.cachedGames)); }
  },
);
