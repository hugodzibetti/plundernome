import type { GameID, PipelineState, PipelineStep } from '../domain/models';
import type { Dependency } from '../domain/types-extras';
import type { DatabaseService } from './database';
import type { HttpService } from './http';
import type { ExtractorService } from './extractor';
import type { ITorrentService } from './types';
import type { DependencyInstaller } from './dependency';
import type { PipelineEvent } from './pipeline-types';
import type { Launcher } from './launcher';

export interface DownloadContext {
  db: DatabaseService;
  http: HttpService;
  extractor: ExtractorService;
  launcher: Launcher | null;
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
