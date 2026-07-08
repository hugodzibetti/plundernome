import type { HttpService } from '../http/http'

export async function scrapeHosterUrl(url: string, http: HttpService): Promise<string | null> {
  const fileId = new URL(url).pathname.split('/').pop()
  if (!fileId) return null

  const res = await http.fetch(`https://pixeldrain.com/api/file/${fileId}`, {
    headers: { 'Accept': 'application/json' },
    retries: 2,
  })
  if (res.status !== 200) return null

  try {
    const body = JSON.parse(res.body)
    const name = body.name
    if (!name) return `https://pixeldrain.com/api/file/${fileId}`
    return `https://pixeldrain.com/api/file/${fileId}?download`
  } catch {
    return `https://pixeldrain.com/api/file/${fileId}`
  }
}
