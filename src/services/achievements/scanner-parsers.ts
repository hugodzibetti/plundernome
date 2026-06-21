import type { Achievement } from '../../domain/achievements/types'

export function parseIniSection(content: string, section: string, filterKey?: boolean): Achievement[] {
  const out: Achievement[] = []
  let inSec = false
  for (const raw of content.split('\n')) {
    const l = raw.trim()
    if (l === `[${section}]`) { inSec = true; continue }
    if (l.startsWith('[')) { inSec = false; continue }
    if (!inSec || !l.includes('=')) continue
    const eq = l.indexOf('=')
    const k = l.slice(0, eq).trim()
    const v = l.slice(eq + 1).trim()
    if (!k) continue
    if (filterKey && !k.toLowerCase().includes('achievement')) continue
    out.push({
      id: `file-${k}`,
      gameId: '',
      name: k,
      unlocked: v === 'true' || v === '1',
      source: 'file-scan',
      hidden: false,
    })
  }
  return out
}

export function parseGogJson(content: string): Achievement[] {
  try {
    const d = JSON.parse(content)
    const raw = (d.achievements ?? []) as Record<string, unknown>[]
    return raw.map(a => ({
      id: `gog-${(a.name ?? a.id ?? '') as string}`,
      gameId: '',
      name: (a.name ?? a.id ?? 'Unknown') as string,
      description: a.description as string | undefined,
      iconUrl: (a.imageUrl ?? a.icon) as string | undefined,
      unlocked: a.unlocked === true,
      unlockedAt: a.unlockedAt ? new Date(a.unlockedAt as string).toISOString() : undefined,
      source: 'file-scan' as const,
      hidden: false,
    }))
  } catch {
    return []
  }
}
