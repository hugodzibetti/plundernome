import type { HttpService } from '../http'
import { scrapeHosterUrl as scrapeGofile } from './gofile'
import { scrapeHosterUrl as scrapeMediafire } from './mediafire'
import { scrapeHosterUrl as scrapePixeldrain } from './pixeldrain'
import { scrapeHosterUrl as scrapeDatanodes } from './datanodes'

export type HosterName = 'gofile' | 'mediafire' | 'pixeldrain' | 'datanodes' | 'direct'

export function detectHoster(url: string): HosterName {
  if (url.includes('gofile.io')) return 'gofile'
  if (url.includes('mediafire.com')) return 'mediafire'
  if (url.includes('pixeldrain.com')) return 'pixeldrain'
  if (url.includes('datanodes.to')) return 'datanodes'
  return 'direct'
}

export async function resolveHosterUrl(
  url: string,
  http: HttpService,
): Promise<{ resolvedUrl: string; hoster: HosterName }> {
  const hoster = detectHoster(url)
  if (hoster === 'direct') return { resolvedUrl: url, hoster }

  try {
    let resolved: string | null = null
    if (hoster === 'gofile') resolved = await scrapeGofile(url, http)
    else if (hoster === 'mediafire') resolved = await scrapeMediafire(url, http)
    else if (hoster === 'pixeldrain') resolved = await scrapePixeldrain(url, http)
    else if (hoster === 'datanodes') resolved = await scrapeDatanodes(url, http)
    if (resolved) return { resolvedUrl: resolved, hoster }
  } catch {
    // fall through — return original URL on any error
  }

  return { resolvedUrl: url, hoster }
}
