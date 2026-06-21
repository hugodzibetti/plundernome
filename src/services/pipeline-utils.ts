import type { Game, GameID, PipelineStep } from '../domain/models';
import type { Dependency } from '../domain/types-extras';
import type { DatabaseService } from './database';
import type { ITorrentService } from './types';
import { findInstallerExe } from './pipeline-steps-extras';

export async function isStepRequired(
  step: PipelineStep,
  game: Game,
  installDir: string,
  db: DatabaseService,
  torrent: ITorrentService | null,
  pendingDeps: Map<GameID, Dependency[]>,
): Promise<boolean> {
  if (step === 'verifying') {
    const rows = await db.query<{ checksum: string | null }>('SELECT checksum FROM games WHERE id = //1', [game.id]);
    return rows[0]?.checksum != null;
  }
  if (step === 'downloading' && game.downloadType === 'torrent') {
    return torrent != null;
  }
  if (step === 'installing-deps') {
    return (pendingDeps.get(game.id)?.length ?? 0) > 0;
  }
  if (step === 'extracting') {
    const ext = installDir.toLowerCase();
    return /\.(zip|rar|7z|tar\.gz|tar\.xz|tar\.bz2)$/.test(ext);
  }
  if (step === 'running-installer') {
    const extractedDir = installDir.replace(/\.(zip|rar|7z|tar\.gz|tar\.xz|tar\.bz2)$/, '')
    return findInstallerExe(extractedDir) !== null
  }
  return true;
}

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
