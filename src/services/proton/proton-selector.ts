import type { ProtonDBRating } from '../proton/protondb'
import type { WineVersion } from '../wine/wine-types'

export interface ProtonSelection {
  version: WineVersion | null
  reason: string
}

export function selectProtonVersion(
  rating: ProtonDBRating | null | undefined,
  available: WineVersion[],
): ProtonSelection {
  const ge = available.filter(v => v.name.toLowerCase().includes('ge-proton'))
    .sort((a, b) => b.name.localeCompare(a.name))
  const stable = available.filter(v => !v.name.toLowerCase().includes('ge'))
    .sort((a, b) => b.name.localeCompare(a.name))

  if (!rating || rating === 'pending') {
    const pick = ge[0] ?? stable[0] ?? null
    return { version: pick, reason: 'No ProtonDB data — using latest GE-Proton' }
  }
  if (rating === 'borked') {
    const pick = ge[0] ?? null
    return { version: pick, reason: 'Borked on ProtonDB — trying GE-Proton, may not work' }
  }
  if (rating === 'platinum' || rating === 'gold') {
    const pick = stable[0] ?? ge[0] ?? null
    return { version: pick, reason: `ProtonDB: ${rating} — using ${pick?.name ?? 'system Wine'}` }
  }
  const pick = ge[0] ?? stable[0] ?? null
  return { version: pick, reason: `ProtonDB: ${rating} — using GE-Proton for better compat` }
}
