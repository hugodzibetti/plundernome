import type { Game, SourceID } from '../../domain/models'
import { fuzzySearch } from '../../domain/catalog/search'
import { _t } from '../../domain/i18n'

const { Gtk } = imports.gi

export interface CatalogFilterState {
  sizeMin: number | null
  sizeMax: number | null
  ageDays: number | null
  sources: SourceID[]
}

export function applyFilters(
  games: Game[],
  query: string,
  state: CatalogFilterState,
  nameIndex: Map<string, string>,
): Game[] {
  let result = fuzzySearch(games, { query })

  if (state.sizeMin !== null && state.sizeMin > 0) {
    const minB = state.sizeMin * 1e9
    result = result.filter(g => g.sizeBytes >= minB)
  }
  if (state.sizeMax !== null && state.sizeMax > 0) {
    const maxB = state.sizeMax * 1e9
    result = result.filter(g => g.sizeBytes <= maxB)
  }
  if (state.ageDays !== null) {
    const cutoff = Date.now() - state.ageDays * 86400000
    result = result.filter(g => {
      const t = new Date(g.lastUpdated).getTime()
      return !isNaN(t) && t >= cutoff
    })
  }
  if (state.sources.length > 0) {
    result = result.filter(g => state.sources.includes(g.sourceId))
  }
  return result
}

const SPIN_ADJ = { lower: 0, upper: 999, step_increment: 1, page_increment: 10, page_size: 1 }

export function buildFilterToolbar(
  onChange: (state: CatalogFilterState) => void,
): { bar: GtkBox; state: CatalogFilterState; emit: () => void; sourceBox: GtkBox } {
  const state: CatalogFilterState = { sizeMin: null, sizeMax: null, ageDays: null, sources: [] }
  const emit = () => onChange({ ...state })

  const bar = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 })
  bar.add_css_class('filter-bar')

  bar.append(new Gtk.Label({ label: _t('catalog.filter.size') }))
  const minSpin = new Gtk.SpinButton({ adjustment: new Gtk.Adjustment(SPIN_ADJ), numeric: true, width_chars: 4 })
  minSpin.connect('value-changed', () => {
    state.sizeMin = minSpin.get_value_as_int() > 0 ? minSpin.get_value_as_int() : null; emit()
  })
  bar.append(minSpin)
  bar.append(new Gtk.Label({ label: '-' }))
  const maxSpin = new Gtk.SpinButton({ adjustment: new Gtk.Adjustment(SPIN_ADJ), numeric: true, width_chars: 4 })
  maxSpin.connect('value-changed', () => {
    state.sizeMax = maxSpin.get_value_as_int() > 0 ? maxSpin.get_value_as_int() : null; emit()
  })
  bar.append(maxSpin)

  bar.append(new Gtk.Label({ label: _t('catalog.filter.age') }))
  const ageModel = new Gtk.StringList({
    strings: [_t('catalog.filter.age-any'), _t('catalog.filter.age-7d'), _t('catalog.filter.age-30d'), _t('catalog.filter.age-90d')],
  })
  const ageDrop = new Gtk.DropDown({ model: ageModel, selected: 0 })
  ageDrop.connect('notify::selected', () => {
    const idx = ageDrop.get_selected()
    state.ageDays = idx === 0 ? null : idx === 1 ? 7 : idx === 2 ? 30 : 90; emit()
  })
  bar.append(ageDrop)

  const sourceBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 })
  bar.append(sourceBox)

  return { bar, state, emit, sourceBox }
}

export function populateSourceFilters(
  sourceBox: GtkBox,
  sources: SourceID[],
  state: CatalogFilterState,
  emit: () => void,
): void {
  let c: unknown = sourceBox.get_first_child()
  while (c) { sourceBox.remove(c); c = sourceBox.get_first_child() }

  if (sources.length === 0) return

  sourceBox.append(new Gtk.Label({ label: _t('catalog.filter.source') }))
  const checks = new Map<SourceID, GtkCheckButton>()
  for (const src of sources) {
    const check = new Gtk.CheckButton({ label: src, active: true })
    checks.set(src, check)
    check.connect('toggled', () => {
      const checked = sources.filter(s => checks.get(s)?.get_active())
      state.sources = checked.length === sources.length ? [] : checked; emit()
    })
    sourceBox.append(check)
  }
}
