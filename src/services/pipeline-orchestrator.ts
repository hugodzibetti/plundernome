import type { Game, GameID, PipelineState, PipelineStep } from '../domain/models';
import type { Dependency } from '../domain/types-extras';
import type { DatabaseService } from './database';
import type { HttpService } from './http';
import type { ExtractorService } from './extractor';
import type { ITorrentService } from './types';
import type { DependencyInstaller } from './dependency';
import type { PipelineEvent } from './pipeline-types';
import { executePipelineStart } from './pipeline-start';
import type { DownloadContext, StateContext } from './pipeline-context';

export class PipelineOrchestrator {
  private states = new Map<GameID, PipelineState>();
  private listeners: Array<(evt: PipelineEvent) => void> = [];
  private onDownloadProgress: ((gameId: GameID, step: PipelineStep, current: number, total: number) => void) | null =
    null;
  private pendingDeps = new Map<GameID, Dependency[]>();
  private pendingExePath = new Map<GameID, string>();
  private pendingParts = new Map<GameID, string[]>();
  private torrent: ITorrentService | null = null;
  private depInstaller: DependencyInstaller | null = null;
  private retryState = new Map<
    GameID,
    { step: PipelineStep; retryCount: number; lastError: string; mirrorIndex: number }
  >();
  private gameMirrors = new Map<GameID, string[]>();

  constructor(
    private db: DatabaseService,
    private http: HttpService,
    private extractor: ExtractorService,
    opts?: { torrent?: ITorrentService; depInstaller?: DependencyInstaller },
  ) {
    this.torrent = opts?.torrent ?? null;
    this.depInstaller = opts?.depInstaller ?? null;
  }

  onEvent(cb: (evt: PipelineEvent) => void): void {
    this.listeners.push(cb);
  }

  onProgress(cb: (gameId: GameID, step: PipelineStep, current: number, total: number) => void): void {
    this.onDownloadProgress = cb;
  }

  private emit(evt: PipelineEvent): void {
    for (const l of this.listeners) l(evt);
  }

  retryStep(gameId: GameID): void {
    const state = this.states.get(gameId);
    const retry = this.retryState.get(gameId);
    if (!state || !retry) return;
    this.retryState.set(gameId, { ...retry, retryCount: 0, lastError: '', mirrorIndex: 0 });
    this.gameMirrors.delete(gameId);
    this.emit({ type: 'retry', gameId, state, step: retry.step, retryCount: 0 });
  }

  retryMirror(gameId: GameID): void {
    const state = this.states.get(gameId);
    const retry = this.retryState.get(gameId);
    if (!state || !retry) return;
    const mirrors = this.gameMirrors.get(gameId);
    if (!mirrors || mirrors.length === 0) return;
    const nextIdx = Math.min(retry.mirrorIndex + 1, mirrors.length);
    this.retryState.set(gameId, { ...retry, retryCount: 0, lastError: '', mirrorIndex: nextIdx });
    this.emit({ type: 'retry', gameId, state, step: retry.step, retryCount: 0 });
  }

  cancelDownload(url: string): void {
    this.http.cancelDownload(url);
  }

  async start(game: Game, downloadUrl: string, downloadPath: string, mirrors?: string[]): Promise<void> {
    const stateCtx: StateContext = {
      states: this.states,
      retryState: this.retryState,
      pendingDeps: this.pendingDeps,
      pendingExePath: this.pendingExePath,
      emit: (e) => this.emit(e),
    };
    const downloadCtx: DownloadContext = {
      db: this.db,
      http: this.http,
      extractor: this.extractor,
      launcher: null,
      torrent: this.torrent,
      depInstaller: this.depInstaller,
      gameMirrors: this.gameMirrors,
      pendingParts: this.pendingParts,
      onDownloadProgress: this.onDownloadProgress,
    };
    await executePipelineStart(stateCtx, downloadCtx, game, downloadUrl, downloadPath, mirrors);
  }

  getRetryState(gameId: GameID): { step: PipelineStep; retryCount: number; lastError: string } | null {
    return this.retryState.get(gameId) ?? null;
  }

  getPipelineState(gameId: GameID): PipelineState | null {
    return this.states.get(gameId) ?? null;
  }
}
