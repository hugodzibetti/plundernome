import type { Game, GameID, PipelineStep } from '../../domain/models'
import type { Dependency } from '../../domain/compat/types'
import type { DatabaseService } from '../database/database'
import type { HttpService } from '../http/http'
import type { ExtractorService } from '../extractor/extractor'
import type { DependencyInstaller } from '../launcher/dependency'
import type { Launcher } from '../launcher/launcher'
import type { ITorrentService } from '../types'
import type { ProgressFn } from './download-steps'
import {
  runDownloadWithMirrorFallback, runVerificationStep,
} from './download-steps'
import {
  runExtractStep, runDetectDepsStep, runInstallDepsStep,
  runFindExeStep, runRegisterStep, findInstallerExe, runInstallerStep,
} from './task-steps'

export interface DispatcherServices {
  db: DatabaseService
  http: HttpService
  extractor: ExtractorService
  launcher: Launcher | null
  torrent: ITorrentService | null
  depInstaller: DependencyInstaller | null
}

export interface DispatchState {
  gameMirrors: Map<GameID, string[]>
  retryState: Map<GameID, { step: PipelineStep; retryCount: number; lastError: string; mirrorIndex: number }>
  pendingDeps: Map<GameID, Dependency[]>
  pendingExePath: Map<GameID, string>
  pendingParts: Map<GameID, string[]>
}

export async function isStepRequired(
  step: PipelineStep, game: Game, installDir: string,
  db: DatabaseService, torrent: ITorrentService | null,
  pendingDeps: Map<GameID, Dependency[]>,
): Promise<boolean> {
  if (step === 'verifying') {
    const rows = await db.query<{ checksum: string | null }>('SELECT checksum FROM games WHERE id = //1', [game.id])
    return rows[0]?.checksum != null
  }
  if (step === 'downloading' && game.downloadType === 'torrent') return torrent != null
  if (step === 'installing-deps') return (pendingDeps.get(game.id)?.length ?? 0) > 0
  if (step === 'extracting') return /\.(zip|rar|7z|tar\.gz|tar\.xz|tar\.bz2)$/.test(installDir.toLowerCase())
  if (step === 'running-installer') return findInstallerExe(installDir.replace(/\.(zip|rar|7z|tar\.gz|tar\.xz|tar\.bz2)$/, '')) !== null
  return true
}

export async function dispatchStep(
  step: PipelineStep, game: Game, url: string, dest: string, installDir: string,
  svc: DispatcherServices, state: DispatchState, onProgress: ProgressFn | null,
): Promise<void> {
  switch (step) {
    case 'downloading':
      await runDownloadWithMirrorFallback(
        svc.db, svc.http, svc.torrent, game, url, dest,
        state.gameMirrors.get(game.id) ?? [],
        state.retryState.get(game.id), onProgress, state.pendingParts,
      )
      break
    case 'verifying':
      await runVerificationStep(game.id, dest, svc.db)
      break
    case 'extracting':
      await runExtractStep(game.id, dest, installDir, svc.extractor, onProgress ?? undefined)
      break
    case 'running-installer': {
      if (!svc.launcher) throw new Error('Launcher not available')
      const exe = findInstallerExe(installDir)
      if (!exe) throw new Error('No installer found in install directory')
      await runInstallerStep(game.id, installDir, exe, svc.launcher, onProgress ?? undefined)
      break
    }
    case 'detecting-deps': {
      const deps = await runDetectDepsStep(game, installDir)
      state.pendingDeps.set(game.id, deps)
      break
    }
    case 'installing-deps': {
      if (!svc.depInstaller) throw new Error('Dependency installer not available')
      await runInstallDepsStep(state.pendingDeps.get(game.id) ?? [], installDir, svc.depInstaller)
      break
    }
    case 'finding-exe': {
      const ep = await runFindExeStep(installDir)
      state.pendingExePath.set(game.id, ep)
      break
    }
    case 'registering':
      await runRegisterStep(game.id, installDir, svc.db, state.pendingExePath.get(game.id) ?? null)
      break
  }
}
