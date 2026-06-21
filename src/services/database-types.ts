import type { PipelineStep } from '../domain/models';

export interface LogEntry {
  id: number;
  game_id: string;
  step: string;
  status: string;
  message: string | null;
  created_at: string;
}

export interface LogFilter {
  gameId?: string;
  step?: PipelineStep | string;
  status?: string;
  limit?: number;
}
