import type { HttpService } from '../http/http'

export async function scrapeHosterUrl(url: string, http: HttpService): Promise<string | null> {
  const fileId = new URL(url).pathname.replace(/^\/d\//, '').split('/')[0]
  if (!fileId) return null

  const serversRes = await http.fetch('https://api.gofile.io/servers', {
    headers: { 'Accept': 'application/json' },
    retries: 2,
  })
  if (serversRes.status !== 200) return null

  let server: string | undefined
  try {
    const body = JSON.parse(serversRes.body)
    server = body.data?.servers?.[0]?.name
  } catch { return null }
  if (!server) return null

  const dlRes = await http.fetch(`https://${server}.gofile.io/download/${fileId}`, {
    headers: { 'Accept': 'application/json' },
    retries: 1,
  })
  if (dlRes.status === 200) return `https://${server}.gofile.io/download/${fileId}`

  return `https://gofile.io/download/${fileId}`
}
