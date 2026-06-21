export function buildMultiPartUrls(url: string): string[] | null {
  const dotMatch = url.match(/^(.*\.)(\d{3})$/)
  if (dotMatch) {
    const prefix = dotMatch[1]!
    const n = parseInt(dotMatch[2]!, 10)
    if (n >= 1 && n <= 999) {
      const limit = n + 99
      const parts: string[] = []
      for (let i = n; i <= limit; i++) parts.push(`${prefix}${String(i).padStart(3, '0')}`)
      return parts
    }
  }
  const rMatch = url.match(/^(.*\.)r(\d{2})$/)
  if (rMatch) {
    const prefix = rMatch[1]!
    const n = parseInt(rMatch[2]!, 10)
    const parts: string[] = []
    for (let i = n; i <= n + 99; i++) parts.push(`${prefix}r${String(i).padStart(2, '0')}`)
    return parts
  }
  const partMatch = url.match(/^(.*\.part)(\d+)(\.\w+)$/)
  if (partMatch) {
    const prefix = partMatch[1]!
    const start = parseInt(partMatch[2]!, 10)
    const suffix = partMatch[3]!
    const parts: string[] = []
    for (let i = start; i <= start + 99; i++) parts.push(`${prefix}${i}${suffix}`)
    return parts
  }
  return null
}
