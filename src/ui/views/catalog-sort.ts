import type { Game } from '../../domain/models'
import { _t } from '../../domain/i18n'

export type SortKey = 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc' | 'source'

export const SORT_OPTS: { label: string; key: SortKey }[] = [
  { label: _t('catalog.sort.name-asc'), key: 'name-asc' },
  { label: _t('catalog.sort.name-desc'), key: 'name-desc' },
  { label: _t('catalog.sort.size-desc'), key: 'size-desc' },
  { label: _t('catalog.sort.size-asc'), key: 'size-asc' },
  { label: _t('catalog.sort.source'), key: 'source' },
]

export function sortGames(games: Game[], key: SortKey): Game[] {
  return [...games].sort((a, b) => {
    switch (key) {
      case 'name-asc': return a.name.localeCompare(b.name)
      case 'name-desc': return b.name.localeCompare(a.name)
      case 'size-desc': return b.sizeBytes - a.sizeBytes
      case 'size-asc': return a.sizeBytes - b.sizeBytes
      case 'source': return a.sourceId.localeCompare(b.sourceId)
    }
  })
}
