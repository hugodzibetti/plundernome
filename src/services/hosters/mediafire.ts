import type { HttpService } from '../http/http'

export async function scrapeHosterUrl(url: string, http: HttpService): Promise<string | null> {
  const page = await http.fetch(url, { retries: 2 })
  if (page.status !== 200) return null

  const patterns = [
    /href="(https:\/\/download\d+\.mediafire\.com\/[^"]+)"/,
    /kNO\s*=\s*"([^"]+)"/,
  ]

  for (const pattern of patterns) {
    const match = page.body.match(pattern)
    if (match?.[1]) {
      if (pattern === patterns[1]) {
        return `https://www.mediafire.com/download.php?dkey=${match[1]}`
      }
      return match[1]
    }
  }

  return null
}
