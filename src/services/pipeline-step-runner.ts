import type { Game, GameID, PipelineStep } from '../domain/models';
import type { DownloadContext, StateContext } from './pipeline-context';
import { runDownloadWithMirrorFallback, runVerificationStep } from './pipeline-steps';
import {
  runExtractStep,
  runDetectDepsStep,
  runInstallDepsStep,
  runFindExeStep,
  runRegisterStep,
  runInstallerStep,
  findInstallerExe,
} from './pipeline-steps-extras';
import { isRetryableError, isNonRetryableError, getRetryDelay, MAX_RETRIES } from './pipeline-retry-helpers';

export async function executeWithRetry(
  gameId: GameID,
  step: PipelineStep,
  fn: () => Promise<void>,
  retryState: StateContext['retryState'],
  states: StateContext['states'],
  emit: StateContext['emit'],
): Promise<void> {
  let current = retryState.get(gameId);
  if (!current || current.step !== step) {
    current = { step, retryCount: 0, lastError: '', mirrorIndex: 0 };
    retryState.set(gameId, current);
  }
  while (true) {
    try {
      await fn();
      return;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      current.lastError = errMsg;
      const state = states.get(gameId);
      if (isNonRetryableError(errMsg) || current.retryCount >= MAX_RETRIES) {
        throw e;
      }
      if (!isRetryableError(errMsg)) {
        throw e;
      }
      current.retryCount++;
      const delay = getRetryDelay(current.retryCount);
      retryState.set(gameId, current);
      if (state) {
        emit({ type: 'retry', gameId, state, step, retryCount: current.retryCount, nextRetryDelay: delay });
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function runPipelineStep(
  step: PipelineStep,
  downloadCtx: DownloadContext,
  stateCtx: StateContext,
  game: Game,
  downloadUrl: string,
  downloadPath: string,
  installDir: string,
): Promise<void> {
  switch (step) {
    case 'downloading':
      await runDownloadWithMirrorFallback(downloadCtx, stateCtx, game, downloadUrl, downloadPath);
      break;
    case 'verifying':
      await runVerificationStep(game.id, downloadPath, downloadCtx.db);
      break;
    case 'extracting':
      await runExtractStep(
        game.id,
        downloadPath,
        installDir,
        downloadCtx.extractor,
        downloadCtx.onDownloadProgress ?? undefined,
      );
      break;
    case 'running-installer': {
      if (!downloadCtx.launcher) throw new Error('Launcher not available');
      const exe = findInstallerExe(installDir);
      if (!exe) throw new Error('No installer found in install directory');
      await runInstallerStep(
        game.id, installDir, exe,
        downloadCtx.launcher,
        downloadCtx.onDownloadProgress ?? undefined,
      );
      break;
    }
    case 'detecting-deps': {
      const deps = await runDetectDepsStep(game, installDir);
      stateCtx.pendingDeps.set(game.id, deps);
      break;
    }
    case 'installing-deps':
      if (!downloadCtx.depInstaller) throw new Error('Dependency installer not available');
      await runInstallDepsStep(stateCtx.pendingDeps.get(game.id) ?? [], installDir, downloadCtx.depInstaller);
      break;
    case 'finding-exe': {
      const exePath = await runFindExeStep(installDir);
      stateCtx.pendingExePath.set(game.id, exePath);
      break;
    }
    case 'registering':
      await runRegisterStep(game.id, installDir, downloadCtx.db, stateCtx.pendingExePath.get(game.id) ?? null);
      break;
  }
}
