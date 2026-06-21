import { _t } from '../../domain/i18n';

const { Gtk } = imports.gi;

export type SortKey = 'name' | 'size' | 'date' | 'lastPlayed';

export const SORT_OPTS: { label: string; key: SortKey }[] = [
  { label: _t('library.sort.name'), key: 'name' },
  { label: _t('library.sort.size'), key: 'size' },
  { label: _t('library.sort.date'), key: 'date' },
  { label: _t('library.sort.last-played'), key: 'lastPlayed' },
];

export function createSortDropdown(onChange: (key: SortKey) => void): GtkDropDown {
  const store = new Gtk.StringList({ strings: SORT_OPTS.map((o) => o.label) });
  const dd = new Gtk.DropDown({ model: store, selected: 0 });
  dd.add_css_class('library-sort');
  dd.connect('notify::selected', () => {
    const idx = dd.get_selected();
    const opt = SORT_OPTS[idx];
    if (opt) onChange(opt.key);
  });
  return dd;
}

export function sortEntries<T extends { game: { name: string; sizeBytes: number }; playtime?: number }>(
  entries: T[],
  key: SortKey,
): T[] {
  return [...entries].sort((a, b) => {
    switch (key) {
      case 'name':
        return a.game.name.localeCompare(b.game.name);
      case 'size':
        return (b.game.sizeBytes ?? 0) - (a.game.sizeBytes ?? 0);
      case 'date':
        return 0;
      case 'lastPlayed': {
        const aTime = a.playtime ?? 0;
        const bTime = b.playtime ?? 0;
        return bTime - aTime;
      }
    }
  });
}
