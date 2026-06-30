import type { Game, GameID, PipelineState, PipelineStep } from '../domain/models';
import type { DatabaseService } from './database';
import type { HttpService } from './http';
import type { ExtractorService } from './extractor';
import type { ITorrentService } from './types';
import type { Dependency } from '../domain/compat/types';
import type { DependencyInstaller } from './dependency';
import type { PipelineEvent } from './pipeline-types';
import { PipelineExecutor } from './pipeline-executor';

export class PipelineOrchestrator {
  private states = new Map<GameID, PipelineState>();
  private listeners: Array<(evt: PipelineEvent) => void> = [];
  private onDownloadProgress: ((gameId: GameID, step: PipelineStep, current: number, total: number) => void) | null =
    null;
  private pendingDeps = new Map<GameID, Dependency[]>();
  private pendingExePath = new Map<GameID, string>();
  private pendingParts = new Map<GameID, string[]>();
  private retryState = new Map<
    GameID,
    { step: PipelineStep; retryCount: number; lastError: string; mirrorIndex: number }
  >();
  private gameMirrors = new Map<GameID, string[]>();
  private executor: PipelineExecutor;

  constructor(
    private db: DatabaseService,
    private http: HttpService,
    private extractor: ExtractorService,
    opts?: { torrent?: ITorrentService; depInstaller?: DependencyInstaller },
  ) {
    this.executor = new PipelineExecutor(db, http, extractor, {
      launcher: null, torrent: opts?.torrent ?? null, depInstaller: opts?.depInstaller ?? null,
    });
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

  skipStep(gameId: GameID): void {
    const state = this.states.get(gameId)
    if (!state) return
    // ponytail: skip notification to listeners, executor continues to next steps
    this.emit({ type: 'skip', gameId, state, step: state.step })
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
    await this.executor.execute(game, downloadUrl, downloadPath, mirrors, {
      states: this.states, retryState: this.retryState,
      pendingDeps: this.pendingDeps, pendingExePath: this.pendingExePath,
      pendingParts: this.pendingParts, gameMirrors: this.gameMirrors,
    }, (e) => this.emit(e), this.onDownloadProgress);
  }

  getRetryState(gameId: GameID): { step: PipelineStep; retryCount: number; lastError: string } | null {
    return this.retryState.get(gameId) ?? null;
  }

  getPipelineState(gameId: GameID): PipelineState | null {
    return this.states.get(gameId) ?? null;
  }
}
