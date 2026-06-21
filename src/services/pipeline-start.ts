import type { Game, GameID, PipelineState, PipelineStep } from '../domain/models';
import type { Dependency } from '../domain/types-extras';
import type { DatabaseService } from './database';
import type { ITorrentService } from './types';
import { createInitialPipelineState } from '../domain/models';
import { runDownloadStep, findInstallerExe } from './pipeline-steps';
import { executeWithRetry, runPipelineStep } from './pipeline-step-runner';
import type { DownloadContext, StateContext } from './pipeline-step-runner';

export type { DownloadContext, StateContext } from './pipeline-step-runner';

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

export async function executePipelineStart(
  stateCtx: StateContext,
  downloadCtx: DownloadContext,
  game: Game,
  downloadUrl: string,
  downloadPath: string,
  mirrors?: string[],
): Promise<void> {
  const { reducePipeline, getPipelineSteps, serializePipelineState, deserializePipelineState } =
    await import('../domain/pipeline');
  const steps = getPipelineSteps();
  const installDir = downloadPath.replace(/\.(zip|rar|7z|tar\.gz|tar\.xz|tar\.bz2)$/, '');
  stateCtx.pendingDeps.delete(game.id);
  stateCtx.pendingExePath.delete(game.id);
  stateCtx.retryState.delete(game.id);
  downloadCtx.gameMirrors.set(game.id, mirrors ?? []);

  await downloadCtx.db.insertGame(game);

  let state: PipelineState;
  const pState = await downloadCtx.db.getPipelineState(game.id);
  if (pState && pState.status !== 'completed') {
    state = deserializePipelineState(game.id, pState);
    stateCtx.states.set(game.id, state);
    stateCtx.emit({ type: 'step-change', gameId: game.id, state });
  } else {
    const result = reducePipeline(createInitialPipelineState(game.id), { type: 'START' });
    if (!result.ok) throw new Error(result.error);
    state = result.value;
    stateCtx.states.set(game.id, state);
    stateCtx.emit({ type: 'step-change', gameId: game.id, state });
    await downloadCtx.db.savePipelineState(game.id, serializePipelineState(state));
  }

  const startIdx = pState && pState.status !== 'completed' ? Math.max(0, steps.indexOf(state.step as PipelineStep)) : 0;
  for (let i = startIdx; i < steps.length; i++) {
    const step = steps[i]!;
    if (step === 'completed') break;

    const required = await isStepRequired(
      step,
      game,
      downloadPath,
      downloadCtx.db,
      downloadCtx.torrent,
      stateCtx.pendingDeps,
    );
    if (!required) {
      if (step === 'extracting') {
        await downloadCtx.db.logPipelineStep(game.id, step, 'skipped', 'Unknown archive format, skipping extraction');
      } else if (step === 'downloading' && game.downloadType === 'torrent') {
        await downloadCtx.db.logPipelineStep(
          game.id,
          step,
          'fallback',
          'Torrent client unavailable, using direct download',
        );
        await runDownloadStep(
          game,
          downloadUrl,
          downloadPath,
          downloadCtx.http,
          downloadCtx.onDownloadProgress ?? undefined,
        );
      } else {
        await downloadCtx.db.logPipelineStep(game.id, step, 'skipped', 'Step not required');
      }
      const nextStep = steps[i + 1]!;
      const adv = reducePipeline(state, { type: 'ADVANCE', to: nextStep });
      if (adv.ok) {
        state = adv.value;
        stateCtx.states.set(game.id, state);
        stateCtx.emit({ type: 'step-change', gameId: game.id, state });
        await downloadCtx.db.savePipelineState(game.id, serializePipelineState(state));
      }
      continue;
    }

    await downloadCtx.db.logPipelineStep(game.id, step, 'started');
    try {
      await executeWithRetry(
        game.id,
        step,
        () => runPipelineStep(step, downloadCtx, stateCtx, game, downloadUrl, downloadPath, installDir),
        stateCtx.retryState,
        stateCtx.states,
        stateCtx.emit,
      );

      await downloadCtx.db.logPipelineStep(game.id, step, 'completed');
      const nextStep = steps[i + 1]!;
      const adv = reducePipeline(state, { type: 'ADVANCE', to: nextStep });
      if (!adv.ok) throw new Error(adv.error);
      state = adv.value;
      stateCtx.states.set(game.id, state);
      stateCtx.emit({ type: 'step-change', gameId: game.id, state });
      await downloadCtx.db.savePipelineState(game.id, serializePipelineState(state));
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg === 'Download cancelled') {
        await downloadCtx.db.saveDownloadState(game.id, 0, 0, 'paused');
        await downloadCtx.db.savePipelineState(game.id, serializePipelineState(state));
        stateCtx.emit({ type: 'paused', gameId: game.id, state });
        return;
      }
      const failResult = reducePipeline(state, { type: 'FAIL', error: errMsg });
      if (failResult.ok) state = failResult.value;
      stateCtx.states.set(game.id, state);
      await downloadCtx.db.savePipelineState(game.id, serializePipelineState(state));
      await downloadCtx.db.logPipelineStep(game.id, step, 'failed', errMsg);
      stateCtx.emit({ type: 'error', gameId: game.id, state, error: errMsg, step });
      return;
    }
  }

  stateCtx.emit({ type: 'complete', gameId: game.id, state });
}
