import type { Game, GameID, PipelineState, PipelineStep } from '../../domain/models'
import type { Dependency } from '../../domain/compat/types'
import type { DatabaseService } from '../database'
import type { HttpService } from '../http'
import type { ExtractorService } from '../extractor'
import type { ITorrentService } from '../types'
import type { DependencyInstaller } from '../dependency'
import type { Launcher } from '../launcher'
import type { PipelineEvent } from '../pipeline-types'
import { createInitialPipelineState } from '../../domain/models'
import { shouldRetry, getRetryDelay } from './retry-utils'
import { isStepRequired, dispatchStep } from './dispatcher'
import { runDownloadStep } from './download-steps'
import type { ProgressFn } from './download-steps'

export interface ExecState {
  states: Map<GameID, PipelineState>
  retryState: Map<GameID, { step: PipelineStep; retryCount: number; lastError: string; mirrorIndex: number }>
  pendingDeps: Map<GameID, Dependency[]>
  pendingExePath: Map<GameID, string>
  pendingParts: Map<GameID, string[]>
  gameMirrors: Map<GameID, string[]>
}

export class PipelineExecutor {
  private launcher: Launcher | null
  private torrent: ITorrentService | null
  private depInstaller: DependencyInstaller | null

  constructor(
    private db: DatabaseService,
    private http: HttpService,
    private extractor: ExtractorService,
    opts?: { launcher?: Launcher | null; torrent?: ITorrentService | null; depInstaller?: DependencyInstaller | null },
  ) {
    this.launcher = opts?.launcher ?? null
    this.torrent = opts?.torrent ?? null
    this.depInstaller = opts?.depInstaller ?? null
  }

  async execute(
    game: Game, downloadUrl: string, downloadPath: string, mirrors: string[] | undefined,
    state: ExecState, emit: (evt: PipelineEvent) => void,
    onProgress: ProgressFn | null,
  ): Promise<void> {
    const { reducePipeline, getPipelineSteps, serializePipelineState, deserializePipelineState } =
      await import('../../domain/pipeline')
    const steps = getPipelineSteps()
    const installDir = downloadPath.replace(/\.(zip|rar|7z|tar\.gz|tar\.xz|tar\.bz2)$/, '')
    state.pendingDeps.delete(game.id)
    state.pendingExePath.delete(game.id)
    state.retryState.delete(game.id)
    state.gameMirrors.set(game.id, mirrors ?? [])
    await this.db.insertGame(game)

    let s: PipelineState
    const ps = await this.db.getPipelineState(game.id)
    if (ps && ps.status !== 'completed') {
      s = deserializePipelineState(game.id, ps)
    } else {
      const r = reducePipeline(createInitialPipelineState(game.id), { type: 'START' })
      if (!r.ok) throw new Error(r.error)
      s = r.value
      await this.db.savePipelineState(game.id, serializePipelineState(s))
    }
    state.states.set(game.id, s)
    emit({ type: 'step-change', gameId: game.id, state: s })
    const startIdx = ps && ps.status !== 'completed' ? Math.max(0, steps.indexOf(s.step as PipelineStep)) : 0
    for (let i = startIdx; i < steps.length; i++) {
      const step = steps[i]!
      if (step === 'completed') break

      const required = await isStepRequired(step, game, downloadPath, this.db, this.torrent, state.pendingDeps)
      if (!required) {
        if (step === 'extracting')
          await this.db.logPipelineStep(game.id, step, 'skipped', 'Unknown archive format, skipping extraction')
        else if (step === 'downloading' && game.downloadType === 'torrent') {
          await this.db.logPipelineStep(game.id, step, 'fallback', 'Torrent client unavailable, using direct download')
          await runDownloadStep(game, downloadUrl, downloadPath, this.http, onProgress ?? undefined)
        } else await this.db.logPipelineStep(game.id, step, 'skipped', 'Step not required')
        const next = steps[i + 1]!
        const a = reducePipeline(s, { type: 'ADVANCE', to: next })
        if (a.ok) {
          s = a.value
          state.states.set(game.id, s)
          emit({ type: 'step-change', gameId: game.id, state: s })
          await this.db.savePipelineState(game.id, serializePipelineState(s))
        }
        continue
      }

      await this.db.logPipelineStep(game.id, step, 'started')
      try {
        await this.runStep(step, game, downloadUrl, downloadPath, installDir, state, emit, onProgress)
        await this.db.logPipelineStep(game.id, step, 'completed')
        const next = steps[i + 1]!
        const a = reducePipeline(s, { type: 'ADVANCE', to: next })
        if (!a.ok) throw new Error(a.error)
        s = a.value
        state.states.set(game.id, s)
        emit({ type: 'step-change', gameId: game.id, state: s })
        await this.db.savePipelineState(game.id, serializePipelineState(s))
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : String(e)
        if (m === 'Download cancelled') {
          await this.db.saveDownloadState(game.id, 0, 0, 'paused')
          await this.db.savePipelineState(game.id, serializePipelineState(s))
          emit({ type: 'paused', gameId: game.id, state: s })
          return
        }
        const f = reducePipeline(s, { type: 'FAIL', error: m })
        if (f.ok) s = f.value
        state.states.set(game.id, s)
        await this.db.savePipelineState(game.id, serializePipelineState(s))
        await this.db.logPipelineStep(game.id, step, 'failed', m)
        emit({ type: 'error', gameId: game.id, state: s, error: m, step })
        return
      }
    }
    emit({ type: 'complete', gameId: game.id, state: s })
  }
  private async runStep(
    step: PipelineStep, game: Game, downloadUrl: string, downloadPath: string,
    installDir: string, state: ExecState, emit: (evt: PipelineEvent) => void,
    onProgress: ProgressFn | null,
  ): Promise<void> {
    const svc = { db: this.db, http: this.http, extractor: this.extractor, launcher: this.launcher, torrent: this.torrent, depInstaller: this.depInstaller }
    let c = state.retryState.get(game.id)
    if (!c || c.step !== step) {
      c = { step, retryCount: 0, lastError: '', mirrorIndex: 0 }
      state.retryState.set(game.id, c)
    }
    while (true) {
      try {
        await dispatchStep(step, game, downloadUrl, downloadPath, installDir, svc, state, onProgress)
        return
      } catch (e: unknown) {
        const m = e instanceof Error ? e.message : String(e)
        c.lastError = m
        if (!shouldRetry(m, c.retryCount)) throw e
        c.retryCount++
        const d = getRetryDelay(c.retryCount)
        state.retryState.set(game.id, c)
        const st = state.states.get(game.id)
        if (st) emit({ type: 'retry', gameId: game.id, state: st, step, retryCount: c.retryCount, nextRetryDelay: d })
        await new Promise(r => setTimeout(r, d))
      }
    }
  }
}
