export const RETRY_DELAYS = [5000, 30000, 120000]
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
  return RETRY_DELAYS[idx >= 0 ? idx : 0] ?? RETRY_DELAYS[0]!
}

export function shouldRetry(error: string, retryCount: number): boolean {
  if (retryCount >= MAX_RETRIES) return false
  if (isNonRetryableError(error)) return false
  return isRetryableError(error)
}