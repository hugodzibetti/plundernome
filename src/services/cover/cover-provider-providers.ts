type FetchFn = (url: string, options?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ status: number; body: string }>

interface SteamApp { id: number; name: string }
interface SteamStoreResponse { items?: SteamApp[] }

const RETRY_DELAY_MS = 1000
const MAX_RETRIES = 3

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function retryProvider<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i < MAX_RETRIES - 1) await delay(RETRY_DELAY_MS)
    }
  }
  throw lastErr
}

export async function searchSteamStore(fetchFn: FetchFn, name: string): Promise<string | null> {
  const appId = await searchSteamAppId(fetchFn, name)
  if (!appId) return null
  return `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`
}

async function searchSteamAppId(fetchFn: FetchFn, name: string): Promise<number | null> {
  const encoded = encodeURIComponent(name)
  const res = await fetchFn(
    `https://store.steampowered.com/api/storesearch?term=${encoded}&l=en&cc=US`,
  )
  if (res.status !== 200) return null
  const data: SteamStoreResponse = JSON.parse(res.body)
  const items = data?.items ?? []
  if (items.length === 0) return null
  const exact = items.find(i => i.name.toLowerCase() === name.toLowerCase())
  return (exact?.id ?? items[0]?.id) ?? null
}

export async function searchSteamGridDB(fetchFn: FetchFn, name: string): Promise<string | null> {
  const encoded = encodeURIComponent(name)
  const res = await fetchFn(
    `https://www.steamgriddb.com/api/v2/search/autocomplete/${encoded}`,
  )
  if (res.status !== 200) return null
  const data = JSON.parse(res.body)
  if (!data?.data?.length) return null
  const id = data.data[0].id
  return `https://cdn.steamgriddb.com/grids/${id}.jpg`
}

export async function searchIGDB(fetchFn: FetchFn, name: string): Promise<string | null> {
  const clientId = typeof process !== 'undefined' && process.env?.TWITCH_CLIENT_ID
    ? process.env.TWITCH_CLIENT_ID
    : ''
  const accessToken = typeof process !== 'undefined' && process.env?.TWITCH_ACCESS_TOKEN
    ? process.env.TWITCH_ACCESS_TOKEN
    : ''
  if (!clientId || !accessToken) return null

  const res = await fetchFn('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'text/plain',
    },
    body: `search "${name}"; fields name,cover.url; limit 1;`,
  })
  if (res.status !== 200) return null
  const arr: Array<{ cover?: { url: string } }> = JSON.parse(res.body)
  if (!arr?.length || !arr[0]?.cover?.url) return null
  const url = arr[0].cover.url.startsWith('//') ? 'https:' + arr[0].cover.url : arr[0].cover.url
  return url.replace('t_thumb', 't_cover_big')
}
