import type { Game, PipelineState, PipelineStep } from '../domain/models'
import { createInitialPipelineState } from '../domain/models'
import { runDownloadStep } from './pipeline-steps'
import { executeWithRetry, runPipelineStep } from './pipeline-step-runner'
import type { PipelineStartContext } from './pipeline-step-runner'

export type { PipelineStartContext } from './pipeline-step-runner'

export async function executePipelineStart(
  ctx: PipelineStartContext,
  game: Game,
  downloadUrl: string,
  downloadPath: string,
  mirrors?: string[],
): Promise<void> {
  const { reducePipeline, getPipelineSteps, serializePipelineState, deserializePipelineState } = await import('../domain/pipeline')
  const steps = getPipelineSteps()
  const installDir = downloadPath.replace(/\.(zip|rar|7z|tar\.gz|tar\.xz|tar\.bz2)$/, '')
  ctx.pendingDeps.delete(game.id)
  ctx.pendingExePath.delete(game.id)
  ctx.retryState.delete(game.id)
  ctx.gameMirrors.set(game.id, mirrors ?? [])

  await ctx.db.insertGame(game)

  let state: PipelineState
  const pState = await ctx.db.getPipelineState(game.id)
  if (pState && pState.status !== 'completed') {
    state = deserializePipelineState(game.id, pState)
    ctx.states.set(game.id, state)
    ctx.emit({ type: 'step-change', gameId: game.id, state })
  } else {
    const result = reducePipeline(createInitialPipelineState(game.id), { type: 'START' })
    if (!result.ok) throw new Error(result.error)
    state = result.value
    ctx.states.set(game.id, state)
    ctx.emit({ type: 'step-change', gameId: game.id, state })
    await ctx.db.savePipelineState(game.id, serializePipelineState(state))
  }

  const startIdx = pState && pState.status !== 'completed' ? Math.max(0, steps.indexOf(state.step as PipelineStep)) : 0
  for (let i = startIdx; i < steps.length; i++) {
    const step = steps[i]!
    if (step === 'completed') break

    const required = await ctx.isStepRequired(step, game, downloadPath)
    if (!required) {
      if (step === 'extracting') {
        await ctx.db.logPipelineStep(game.id, step, 'skipped', 'Unknown archive format, skipping extraction')
      } else if (step === 'downloading' && game.downloadType === 'torrent') {
        await ctx.db.logPipelineStep(game.id, step, 'fallback', 'Torrent client unavailable, using direct download')
        await runDownloadStep(game, downloadUrl, downloadPath, ctx.http, ctx.onDownloadProgress ?? undefined)
      } else {
        await ctx.db.logPipelineStep(game.id, step, 'skipped', 'Step not required')
      }
      const nextStep = steps[i + 1]!
      const adv = reducePipeline(state, { type: 'ADVANCE', to: nextStep })
      if (adv.ok) {
        state = adv.value
        ctx.states.set(game.id, state)
        ctx.emit({ type: 'step-change', gameId: game.id, state })
        await ctx.db.savePipelineState(game.id, serializePipelineState(state))
      }
      continue
    }

    await ctx.db.logPipelineStep(game.id, step, 'started')
    try {
      await executeWithRetry(game.id, step, () => runPipelineStep(step, ctx, game, downloadUrl, downloadPath, installDir), ctx.retryState, ctx.states, ctx.emit)

      await ctx.db.logPipelineStep(game.id, step, 'completed')
      const nextStep = steps[i + 1]!
      const adv = reducePipeline(state, { type: 'ADVANCE', to: nextStep })
      if (!adv.ok) throw new Error(adv.error)
      state = adv.value
      ctx.states.set(game.id, state)
      ctx.emit({ type: 'step-change', gameId: game.id, state })
      await ctx.db.savePipelineState(game.id, serializePipelineState(state))
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e)
      if (errMsg === 'Download cancelled') {
        await ctx.db.saveDownloadState(game.id, 0, 0, 'paused')
        await ctx.db.savePipelineState(game.id, serializePipelineState(state))
        ctx.emit({ type: 'paused', gameId: game.id, state })
        return
      }
      const failResult = reducePipeline(state, { type: 'FAIL', error: errMsg })
      if (failResult.ok) state = failResult.value
      ctx.states.set(game.id, state)
      await ctx.db.savePipelineState(game.id, serializePipelineState(state))
      await ctx.db.logPipelineStep(game.id, step, 'failed', errMsg)
      ctx.emit({ type: 'error', gameId: game.id, state, error: errMsg, step })
      return
    }
  }

  ctx.emit({ type: 'complete', gameId: game.id, state })
}
