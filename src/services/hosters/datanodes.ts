import type { HttpService } from '../http'

export async function scrapeHosterUrl(url: string, http: HttpService): Promise<string | null> {
  const page = await http.fetch(url, { retries: 2 })
  if (page.status !== 200) return null

  const patterns = [
    /href="(https:\/\/datanodes\.to\/[^"]*dl[^"]*)"/,
    /href="(https:\/\/[^"]*datanodes[^"]*\/file\/[^"]+)"/,
    /href="(https:\/\/[^"]*\/[^"]*\.(?:zip|rar|7z)[^"]*)"/,
  ]

  for (const pattern of patterns) {
    const match = page.body.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}
