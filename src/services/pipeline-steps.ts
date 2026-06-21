import type { Game, GameID, PartProgress, PipelineStep } from '../domain/models'
import type { Dependency } from '../domain/types-extras'
import type { DatabaseService } from './database'
import type { HttpService } from './http'
import type { ExtractorService } from './extractor'
import type { ITorrentService } from './types'
import type { DependencyInstaller } from './dependency'

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

export async function runExtractStep(
  gameId: GameID, archivePath: string, installDir: string,
  extractor: ExtractorService,
  onProgress?: (gameId: GameID, step: PipelineStep, current: number, total: number) => void
): Promise<void> {
  const result = await extractor.extract(archivePath, installDir, (current, total, _file) => {
    onProgress?.(gameId, 'extracting', current, total)
  })
  if (!result.success) throw new Error(result.errorMessage ?? 'Extraction failed')
}

export async function runDetectDepsStep(
  game: Game, installDir: string
): Promise<Dependency[]> {
  const { detectCompat } = await import('../domain/compat/detector')
  const { Gio } = imports.gi
  const dir = Gio.File.new_for_path(installDir)
  const enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null)
  const files: Array<{ path: string; name: string; extension: string; isDirectory: boolean; size: number }> = []
  let info
  while ((info = enumerator.next_file(null)) !== null) {
    const name = info.get_name()
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
    files.push({
      path: `${installDir}/${name}`, name, extension: ext,
      isDirectory: info.get_file_type() === Gio.FileType.DIRECTORY,
      size: info.get_size(),
    })
  }
  const profile = detectCompat(files, game.name)
  return profile.deps
}

export async function runInstallDepsStep(
  deps: Dependency[],
  installDir: string,
  depInstaller: DependencyInstaller
): Promise<void> {
  if (deps.length === 0) return
  const prefixPath = `${installDir}/prefix`
  for (const dep of deps) {
    const result = await depInstaller.install(dep, prefixPath)
    if (!result.success) throw new Error(`Failed to install ${dep.name}: ${result.errorMessage}`)
  }
}

export async function runFindExeStep(installDir: string): Promise<string> {
  const { findExecutable } = await import('../controller/executable-scanner')
  const result = findExecutable(installDir)
  if (!result.path) throw new Error('No executable found in install directory')
  return result.path
}

export async function runRegisterStep(
  gameId: GameID, installPath: string, db: DatabaseService, exePath: string | null
): Promise<void> {
  await db.execute(
    'UPDATE games SET installed = 1, install_path = //1 WHERE id = //2',
    [installPath, gameId]
  )
  if (exePath) {
    const existing = await db.getLaunchOptions(gameId)
    const env = { ...existing.env, exePath }
    await db.setLaunchOptions(gameId, env, existing.args)
  }
}
