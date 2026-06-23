export const RETRY_DELAYS = [5000, 30000, 120000] as const
export const MAX_RETRIES = 3

const RETRYABLE_PATTERNS = [
  'network timeout', 'connection refused', 'econnrefused', 'timed out', 'ECONNRESET',
  'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'socket hang up',
  '5', 'Internal Server Error', 'Bad Gateway', 'Service Unavailable',
  'Gateway Timeout',
]

export function isRetryableError(error: string): boolean {
  const lower = error.toLowerCase()
  return RETRYABLE_PATTERNS.some(p => lower.includes(p.toLowerCase()))
}

export function isNonRetryableError(error: string): boolean {
  const lower = error.toLowerCase()
  return lower.includes('invalid url') || lower.includes('not found')
    || lower.includes('permission denied') || lower.includes('eacces')
    || lower.includes('corrupt') || lower.includes('unknown format')
    || lower.includes('no executable')
}

export function getRetryDelay(retryCount: number): number {
  const idx = Math.min(retryCount - 1, RETRY_DELAYS.length - 1)
  return RETRY_DELAYS[idx >= 0 ? idx : 0]!
}

export function shouldRetry(error: string, retryCount: number): boolean {
  if (retryCount >= MAX_RETRIES) return false
  if (isNonRetryableError(error)) return false
  return isRetryableError(error)
}

export function buildMultiPartUrls(url: string): string[] | null {
  const dotMatch = url.match(/^(.*\.)(\d{3})$/)
  if (dotMatch) {
    const prefix = dotMatch[1]!
    const n = parseInt(dotMatch[2]!, 10)
    if (n >= 1 && n <= 999) {
      const parts: string[] = []
      for (let i = n; i <= n + 99; i++) parts.push(`${prefix}${String(i).padStart(3, '0')}`)
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
