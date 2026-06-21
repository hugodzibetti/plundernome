import type { Download, DownloadPriority } from './models'

export type QueueAction = 'pause' | 'resume' | 'reorder'

export function reorderDownloads(
  downloads: Download[],
  fromIndex: number,
  toIndex: number
): Download[] {
  if (fromIndex < 0 || fromIndex >= downloads.length) return downloads
  if (toIndex < 0 || toIndex >= downloads.length) return downloads
  if (fromIndex === toIndex) return downloads

  const result = [...downloads]
  const [moved] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, moved!)
  return result
}

export function canResume(download: Download): boolean {
  return download.status === 'paused' || download.status === 'failed'
}

export function canPause(download: Download): boolean {
  return download.status === 'downloading' || download.status === 'queued' || download.status === 'resuming'
}

const PRIORITY_ORDER: Record<DownloadPriority, number> = { low: 0, normal: 1, high: 2 }

export function sortByPriority(downloads: Download[]): Download[] {
  return [...downloads].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1
    const pb = PRIORITY_ORDER[b.priority] ?? 1
    if (pa !== pb) return pb - pa
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
  })
}

export function setPriority(download: Download, priority: DownloadPriority): Download {
  return { ...download, priority }
}

export function clampSpeedLimit(bytesPerSecond: number, min: number, max: number): number {
  if (bytesPerSecond === 0) return 0
  return Math.max(min, Math.min(max, bytesPerSecond))
}

export const SPEED_PRESETS = [
  { label: 'Unlimited', value: 0 },
  { label: '1 MB/s', value: 1_000_000 },
  { label: '5 MB/s', value: 5_000_000 },
  { label: '10 MB/s', value: 10_000_000 },
  { label: '25 MB/s', value: 25_000_000 },
  { label: '50 MB/s', value: 50_000_000 },
] as const