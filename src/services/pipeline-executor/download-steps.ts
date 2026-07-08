import type { Game, GameID, PipelineStep, PartProgress } from '../../domain/models'
import type { DatabaseService } from '../database/database'
import type { HttpService } from '../http/http'
import type { ITorrentService } from '../types'
import { buildMultiPartUrls, isNonRetryableError } from './retry-utils'

export type ProgressFn = (gameId: GameID, step: PipelineStep, current: number, total: number) => void

export async function runDownloadStep(
  game: Game, url: string, dest: string,
  http: HttpService,
  onProgress?: ProgressFn,
  offset?: number,
  onOffsetSave?: (offset: number) => void,
): Promise<void> {
  onProgress?.(game.id, 'downloading', offset ?? 0, 100)
  const result = await http.download({
    url, destinationPath: dest, offset,
    downloadId: game.id,
    expectedTotalBytes: game.sizeBytes,
    expectedExtractedBytes: game.sizeBytes,
    onProgress: (downloaded, total) => onProgress?.(game.id, 'downloading', downloaded, total),
    onOffsetSave,
  })
  if (!result.success) throw new Error(result.errorMessage ?? 'Download failed')
}

export async function runMultiPartDownloadStep(
  game: Game, urls: string[], destDir: string,
  http: HttpService,
  onPartProgress?: (progress: PartProgress[]) => void,
  onStepProgress?: ProgressFn,
): Promise<void> {
  const parts = urls.map((url, i) => ({ url, index: i + 1 }))
  const totalParts = parts.length
  const progress: PartProgress[] = parts.map(p => ({
    index: p.index, total: totalParts, bytesDownloaded: 0, status: 'downloading' as const,
  }))
  onPartProgress?.(progress)
  await http.downloadParts(parts, destDir, (partIndex, bytes, totalBytes) => {
    const p = progress[partIndex - 1]
    if (p) {
      p.bytesDownloaded = bytes
      p.status = bytes >= totalBytes && totalBytes > 0 ? 'completed' : 'downloading'
      onPartProgress?.(progress)
      const done = progress.filter(x => x.status === 'completed').length
      onStepProgress?.(game.id, 'downloading', done, totalParts)
    }
  })
  for (const p of progress) p.status = 'completed'
  onPartProgress?.(progress)
}

export async function runTorrentDownloadStep(
  game: Game, url: string, dest: string,
  torrent: ITorrentService,
  onProgress?: ProgressFn,
): Promise<void> {
  onProgress?.(game.id, 'downloading', 0, 100)
  const id = url.startsWith('magnet:')
    ? await torrent.addMagnet(url, dest)
    : await torrent.addTorrent(url, dest)
  const ok = await torrent.waitForCompletion(id, pct => {
    onProgress?.(game.id, 'downloading', pct, 100)
  })
  if (!ok) throw new Error('Torrent download failed or incomplete')
}

export async function runVerificationStep(
  gameId: GameID, archivePath: string, db: DatabaseService,
): Promise<void> {
  const { verifyChecksum } = await import('../sha256')
  const rows = await db.query<{ checksum: string | null }>(
    'SELECT checksum FROM games WHERE id = //1', [gameId],
  )
  const expected = rows[0]?.checksum
  if (!expected) return
  const ok = await verifyChecksum(archivePath, expected)
  if (!ok) throw new Error('Checksum verification failed')
}

export async function runDownloadWithMirrorFallback(
  db: DatabaseService, http: HttpService, torrent: ITorrentService | null,
  game: Game, url: string, dest: string, mirrors: string[],
  retry: { mirrorIndex: number } | undefined,
  onProgress: ProgressFn | null, pendingParts: Map<GameID, string[]>,
): Promise<void> {
  let offset = 0
  const dls = await db.getDownloadState(game.id)
  if (dls?.status === 'paused') offset = dls.offset
  const onSave = (o: number) => db.saveDownloadState(game.id, o, 0, 'downloading')
  const all = [url, ...mirrors]
  let idx = retry?.mirrorIndex ?? 0
  let lastErr = ''
  const doDL = async (u: string) => {
    if (game.downloadType === 'torrent' || game.downloadType === 'magnet') {
      if (torrent) await runTorrentDownloadStep(game, u, dest, torrent, onProgress ?? undefined)
      else await runDownloadStep(game, u, dest, http, onProgress ?? undefined, offset, onSave)
    } else {
      const parts = buildMultiPartUrls(u)
      if (parts) {
        pendingParts.set(game.id, parts)
        await runMultiPartDownloadStep(game, parts, dest, http, undefined, onProgress ?? undefined)
      } else {
        await runDownloadStep(game, u, dest, http, onProgress ?? undefined, offset, onSave)
      }
    }
  }
  const tried = new Set<string>()
  while (idx < all.length) {
    const rem = all.slice(idx).filter(u => !tried.has(u))
    if (rem.length === 0) break
    let cur: string
    if (rem.length > 1) cur = (await http.rankMirrorsByLatency(rem))[0]!
    else cur = rem[0]!
    tried.add(cur)
    if (retry) retry.mirrorIndex = all.indexOf(cur)
    try {
      await doDL(cur)
      await db.saveDownloadState(game.id, 0, 0, 'completed')
      lastErr = ''
      break
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e.message : String(e)
      if (isNonRetryableError(lastErr)) throw e
      if (tried.size >= all.length) break
      await db.logPipelineStep(game.id, 'downloading', 'mirror-switch',
        `Mirror failed, testing ${all.length - tried.size} remaining`)
    }
  }
  if (lastErr) throw new Error(lastErr)
}
