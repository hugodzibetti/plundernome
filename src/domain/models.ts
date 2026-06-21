export type GameID = string;
export type SourceID = string;
export type DownloadPriority = 'low' | 'normal' | 'high';
export type DownloadStatus = 'queued' | 'downloading' | 'verifying' | 'paused' | 'resuming' | 'completed' | 'failed';
export type PipelineStep =
  | 'downloading'
  | 'verifying'
  | 'extracting'
  | 'running-installer'
  | 'detecting-deps'
  | 'installing-deps'
  | 'finding-exe'
  | 'registering'
  | 'completed';
export type DownloadType = 'torrent' | 'magnet' | 'direct';

export interface PartProgress {
  index: number;
  total: number;
  bytesDownloaded: number;
  status: 'downloading' | 'completed' | 'failed';
}

export interface Game {
  id: GameID;
  name: string;
  sourceId: SourceID;
  sourceGameId: string;
  url: string;
  description: string;
  size: string;
  sizeBytes: number;
  lastUpdated: string;
  downloadType: DownloadType;
  repackNotes?: string;
  imageUrl?: string;
  tags: string[];
  wishlisted?: boolean;
}

export interface Source {
  id: SourceID;
  name: string;
  baseUrl: string;
  scrapeType: 'rss' | 'html' | 'api';
  enabled: boolean;
  updateInterval: number;
}

export interface Download {
  id: string;
  gameId: GameID;
  name: string;
  url: string;
  type: DownloadType;
  status: DownloadStatus;
  priority: DownloadPriority;
  progress: number;
  speed: number;
  bytesDownloaded: number;
  totalBytes: number;
  destinationPath: string;
  errorMessage?: string;
  parts?: PartProgress[];
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface PipelineState {
  gameId: GameID;
  step: PipelineStep;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

// Re-exports for backward compatibility - types now live in their owning modules
export type { CompatProfile, Dependency, DepType } from './compat/types';
export type { FileEntry } from './library-types';
export type { ScrapeResult } from './catalog/types';
export type { Result } from './result';
export { createGameID, isValidGameID } from './identity';
export { createInitialPipelineState } from './pipeline';
export { validateGame } from './functions';
export type { QueueAction } from './queue';
