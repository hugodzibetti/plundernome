export function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i)
  if (!match) return 0

  const num = parseFloat(match[1] ?? '0')
  const unit = (match[2] ?? 'B').toUpperCase()

  const multipliers: Record<string, number> = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 ** 2,
    'GB': 1024 ** 3,
    'TB': 1024 ** 4,
  }

  return Math.round(num * (multipliers[unit] ?? 1))
}

export function extractGameId(url: string): string {
  const match = url.match(/\/([^/]+)\/?$/)
  return match?.[1] ?? url
}

export function extractDownloadLinks(html: string, selector: string, container?: string): string[] {
  const links: string[] = []
  const magnetRe = /href="(magnet:[^"]+)"/gi
  const torrentRe = /href="([^"]+\.torrent)"/gi
  if (selector.includes('magnet')) {
    let m: RegExpExecArray | null
    while ((m = magnetRe.exec(html)) !== null) links.push(m[1]!)
  }
  if (selector.includes('torrent')) {
    let m: RegExpExecArray | null
    while ((m = torrentRe.exec(html)) !== null) links.push(m[1]!)
  }
  return [...new Set(links)]
}
