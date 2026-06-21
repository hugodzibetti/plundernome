import type { LogEntry, LogFilter } from './database-types';
import type { GameID } from '../domain/models';
import type { IDatabaseService } from './types';

export class PipelineLogService {
  constructor(private db: IDatabaseService) {}

  async log(gameId: GameID, step: string, status: string, message?: string): Promise<void> {
    await this.db.execute('INSERT INTO pipeline_log (game_id, step, status, message) VALUES (//1, //2, //3, //4)', [
      gameId,
      step,
      status,
      message ?? null,
    ]);
  }

  async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    const conds: string[] = [];
    const params: unknown[] = [];
    let n = 1;
    if (filter?.gameId) {
      conds.push(`game_id = //${n++}`);
      params.push(filter.gameId);
    }
    if (filter?.step) {
      conds.push(`step = //${n++}`);
      params.push(filter.step);
    }
    if (filter?.status) {
      conds.push(`status = //${n++}`);
      params.push(filter.status);
    }
    const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';
    return this.db.query<LogEntry>(`SELECT * FROM pipeline_log ${where} ORDER BY created_at DESC LIMIT //${n++}`, [
      ...params,
      filter?.limit ?? 200,
    ]);
  }

  async getGameIds(): Promise<string[]> {
    const rows = await this.db.query<{ game_id: string }>('SELECT DISTINCT game_id FROM pipeline_log ORDER BY game_id');
    return rows.map((r) => r.game_id);
  }
}
