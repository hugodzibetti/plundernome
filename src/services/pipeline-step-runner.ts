import type { Game, GameID, PipelineState, PipelineStep } from '../domain/models';
import type { Dependency } from '../domain/types-extras';
import type { DatabaseService } from './database';
import type { HttpService } from './http';
import type { ExtractorService } from './extractor';
import type { ITorrentService } from './types';
import type { DependencyInstaller } from './dependency';
import type { PipelineEvent } from './pipeline-types';
import {
  runDownloadStep,
  runMultiPartDownloadStep,
  runTorrentDownloadStep,
  runVerificationStep,
  runExtractStep,
  runDetectDepsStep,
  runInstallDepsStep,
  runFindExeStep,
  runRegisterStep,
} from './pipeline-steps';
import { isRetryableError, isNonRetryableError, getRetryDelay, MAX_RETRIES } from './pipeline-retry-helpers';
import { buildMultiPartUrls } from './pipeline-utils';

export interface DownloadContext {
  db: DatabaseService;
  http: HttpService;
  extractor: ExtractorService;
  torrent: ITorrentService | null;
  depInstaller: DependencyInstaller | null;
  gameMirrors: Map<GameID, string[]>;
  pendingParts: Map<GameID, string[]>;
  onDownloadProgress: ((gameId: GameID, step: PipelineStep, current: number, total: number) => void) | null;
}

export interface StateContext {
  states: Map<GameID, PipelineState>;
  retryState: Map<GameID, { step: PipelineStep; retryCount: number; lastError: string; mirrorIndex: number }>;
  pendingDeps: Map<GameID, Dependency[]>;
  pendingExePath: Map<GameID, string>;
  emit: (evt: PipelineEvent) => void;
}

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
    case 'downloading': {
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
              game,
              u,
              downloadPath,
              downloadCtx.torrent,
              downloadCtx.onDownloadProgress ?? undefined,
            );
          } else {
            await runDownloadStep(
              game,
              u,
              downloadPath,
              downloadCtx.http,
              downloadCtx.onDownloadProgress ?? undefined,
              offset,
              onOffsetSave,
            );
          }
        } else {
          const partUrls = buildMultiPartUrls(u);
          if (partUrls) {
            downloadCtx.pendingParts.set(game.id, partUrls);
            await runMultiPartDownloadStep(
              game,
              partUrls,
              downloadPath,
              downloadCtx.http,
              undefined,
              downloadCtx.onDownloadProgress ?? undefined,
            );
          } else {
            await runDownloadStep(
              game,
              u,
              downloadPath,
              downloadCtx.http,
              downloadCtx.onDownloadProgress ?? undefined,
              offset,
              onOffsetSave,
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
            game.id,
            step,
            'mirror-switch',
            `Mirror failed, testing ${allUrls.length - tried.size} remaining`,
          );
        }
      }
      if (lastErr) throw new Error(lastErr);
      break;
    }
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
