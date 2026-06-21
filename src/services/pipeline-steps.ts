import type { Game, GameID, PartProgress, PipelineStep } from '../domain/models'
import type { DatabaseService } from './database'
import type { HttpService } from './http'
import type { ITorrentService } from './types'
import type { DownloadContext, StateContext } from './pipeline-context'
import { buildMultiPartUrls } from './pipeline-utils'
import { isNonRetryableError } from './pipeline-retry-helpers'

export async function runDownloadWithMirrorFallback(
  downloadCtx: DownloadContext, stateCtx: StateContext,
  game: Game, downloadUrl: string, downloadPath: string,
): Promise<void> {
  let offset = 0;
  const dls = await downloadCtx.db.getDownloadState(game.id);
  if (dls?.status === 'paused') offset = dls.offset;
  const onOffsetSave = (o: number) => downloadCtx.db.saveDownloadState(game.id, o, 0, 'downloading');
  const allUrls = [downloadUrl, ...(downloadCtx.gameMirrors.get(game.id) ?? [])];
  const currentRetry = stateCtx.retryState.get(game.id);
  let startIdx = currentRetry?.mirrorIndex ?? 0;
  let lastErr = '';
  const doDownload = async (u: string) => {
    if (game.downloadType === 'torrent' || game.downloadType === 'magnet') {
      if (downloadCtx.torrent) {
        await runTorrentDownloadStep(
          game, u, downloadPath, downloadCtx.torrent, downloadCtx.onDownloadProgress ?? undefined,
        );
      } else {
        await runDownloadStep(
          game, u, downloadPath, downloadCtx.http, downloadCtx.onDownloadProgress ?? undefined, offset, onOffsetSave,
        );
      }
    } else {
      const partUrls = buildMultiPartUrls(u);
      if (partUrls) {
        downloadCtx.pendingParts.set(game.id, partUrls);
        await runMultiPartDownloadStep(
          game, partUrls, downloadPath, downloadCtx.http, undefined, downloadCtx.onDownloadProgress ?? undefined,
        );
      } else {
        await runDownloadStep(
          game, u, downloadPath, downloadCtx.http, downloadCtx.onDownloadProgress ?? undefined, offset, onOffsetSave,
        );
      }
    }
  };
  const tried = new Set<string>();
  while (startIdx < allUrls.length) {
    const remaining = allUrls.slice(startIdx).filter((u) => !tried.has(u));
    if (remaining.length === 0) break;
    let curUrl: string;
    if (remaining.length > 1) {
      const ranked = await downloadCtx.http.rankMirrorsByLatency(remaining);
      curUrl = ranked[0]!;
    } else {
      curUrl = remaining[0]!;
    }
    tried.add(curUrl);
    if (currentRetry) currentRetry.mirrorIndex = allUrls.indexOf(curUrl);
    try {
      await doDownload(curUrl);
      await downloadCtx.db.saveDownloadState(game.id, 0, 0, 'completed');
      lastErr = '';
      break;
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e.message : String(e);
      if (isNonRetryableError(lastErr)) throw e;
      if (tried.size >= allUrls.length) break;
      await downloadCtx.db.logPipelineStep(
        game.id, 'downloading', 'mirror-switch', `Mirror failed, testing ${allUrls.length - tried.size} remaining`,
      );
    }
  }
  if (lastErr) throw new Error(lastErr);
}

export async function runDownloadStep(
  game: Game, url: string, dest: string,
  http: HttpService,
  onProgress?: (gameId: GameID, step: PipelineStep, current: number, total: number) => void,
  offset?: number,
  onOffsetSave?: (offset: number) => void
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
  onStepProgress?: (gameId: GameID, step: PipelineStep, current: number, total: number) => void
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
  onProgress?: (gameId: GameID, step: PipelineStep, current: number, total: number) => void
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
  gameId: GameID, archivePath: string, db: DatabaseService
): Promise<void> {
  const { verifyChecksum } = await import('./sha256')
  const rows = await db.query<{ checksum: string | null }>(
    'SELECT checksum FROM games WHERE id = //1', [gameId]
  )
  const expected = rows[0]?.checksum
  if (!expected) return
  const ok = await verifyChecksum(archivePath, expected)
  if (!ok) throw new Error('Checksum verification failed')
}

