import type { IDebridService } from './debrid-types'
import { RealDebridService } from './real-debrid'
import { AllDebridService } from './all-debrid'
import { PremiumizeService } from './premiumize'
import type { HttpService } from '../http/http'

export function createDebridService(
  provider: string,
  apiKey: string,
  http: HttpService,
): IDebridService | null {
  if (!provider || !apiKey) return null
  if (provider === 'realdebrid') return new RealDebridService(http, apiKey)
  if (provider === 'alldebrid') return new AllDebridService(http, apiKey)
  if (provider === 'premiumize') return new PremiumizeService(http, apiKey)
  return null
}

export async function resolveUrl(
  url: string,
  debrid: IDebridService | null,
): Promise<string> {
  if (!debrid) return url
  const resolved = await debrid.unrestrict(url)
  return resolved ?? url
}
