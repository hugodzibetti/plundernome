import type { GameID } from '../domain/models';
import type { IDatabaseService } from './types';

export class PlaySessionService {
  constructor(private db: IDatabaseService) {}

  async start(gameId: GameID): Promise<string> {
    const id = imports.gi.GLib.uuid_string_random();
    await this.db.execute("INSERT INTO play_sessions (id, game_id, session_start) VALUES (//1, //2, datetime('now'))", [
      id,
      gameId,
    ]);
    return id;
  }

  async end(sessionId: string): Promise<void> {
    await this.db.execute("UPDATE play_sessions SET session_end = datetime('now') WHERE id = //1", [sessionId]);
  }

  async getPlaytime(gameId: GameID): Promise<number> {
    const rows = await this.db.query<{ total: number }>(
      'SELECT COALESCE(SUM((julianday(session_end) - julianday(session_start)) * 86400), 0) as total FROM play_sessions WHERE game_id = //1 AND session_end IS NOT NULL',
      [gameId],
    );
    return rows[0]?.total ?? 0;
  }
}

export class LaunchOptionService {
  constructor(private db: IDatabaseService) {}

  async get(gameId: GameID): Promise<{ env: Record<string, string>; args: string }> {
    const rows = await this.db.query<{ env_json: string; args: string }>(
      'SELECT env_json, args FROM launch_options WHERE game_id = //1',
      [gameId],
    );
    if (rows.length === 0) return { env: {}, args: '' };
    return { env: JSON.parse(rows[0]!.env_json), args: rows[0]!.args };
  }

  async set(gameId: GameID, env: Record<string, string>, args: string): Promise<void> {
    await this.db.execute('INSERT OR REPLACE INTO launch_options (game_id, env_json, args) VALUES (//1, //2, //3)', [
      gameId,
      JSON.stringify(env),
      args,
    ]);
  }
}

export class ResumeService {
  constructor(private db: IDatabaseService) {}

  async get(gameId: GameID): Promise<number> {
    const rows = await this.db.query<{ resume_offset: number }>('SELECT resume_offset FROM games WHERE id = //1', [
      gameId,
    ]);
    return rows[0]?.resume_offset ?? 0;
  }

  async set(gameId: GameID, offset: number): Promise<void> {
    await this.db.execute('UPDATE games SET resume_offset = //1 WHERE id = //2', [offset, gameId]);
  }

  async saveDownloadState(gameId: GameID, offset: number, total: number, status: string): Promise<void> {
    await this.db.execute(
      'UPDATE games SET resume_offset = //1, download_total = //2, download_status = //3 WHERE id = //4',
      [offset, total, status, gameId],
    );
  }

  async getDownloadState(gameId: GameID): Promise<{ offset: number; total: number; status: string } | null> {
    const rows = await this.db.query<{ resume_offset: number; download_total: number; download_status: string }>(
      'SELECT resume_offset, download_total, download_status FROM games WHERE id = //1',
      [gameId],
    );
    return rows.length > 0
      ? { offset: rows[0]!.resume_offset, total: rows[0]!.download_total, status: rows[0]!.download_status }
      : null;
  }
}

export class WishlistService {
  constructor(private db: IDatabaseService) {}

  async set(gameId: GameID, wishlisted: boolean): Promise<void> {
    await this.db.execute('UPDATE games SET wishlisted = //1 WHERE id = //2', [wishlisted ? 1 : 0, gameId]);
  }

  async getAll(): Promise<GameID[]> {
    const rows = await this.db.query<{ id: GameID }>('SELECT id FROM games WHERE wishlisted = 1');
    return rows.map((r) => r.id);
  }
}

export class PipelineStateService {
  constructor(private db: IDatabaseService) {}

  async save(
    gameId: GameID,
    state: { step: string; status: string; progress: number; errorMessage?: string },
  ): Promise<void> {
    await this.db.execute(
      "INSERT OR REPLACE INTO pipeline_state (game_id, step, status, progress, error_message, updated_at) VALUES (//1, //2, //3, //4, //5, datetime('now'))",
      [gameId, state.step, state.status, state.progress, state.errorMessage ?? null],
    );
  }

  async get(gameId: GameID): Promise<{ step: string; status: string; progress: number; errorMessage?: string } | null> {
    const rows = await this.db.query<{ step: string; status: string; progress: number; error_message: string | null }>(
      'SELECT step, status, progress, error_message FROM pipeline_state WHERE game_id = //1',
      [gameId],
    );
    if (rows.length === 0) return null;
    return {
      step: rows[0]!.step,
      status: rows[0]!.status,
      progress: rows[0]!.progress,
      errorMessage: rows[0]!.error_message ?? undefined,
    };
  }

  async getAllIncomplete(): Promise<Array<{ gameId: GameID; step: string; status: string; progress: number }>> {
    const rows = await this.db.query<{ game_id: GameID; step: string; status: string; progress: number }>(
      "SELECT game_id, step, status, progress FROM pipeline_state WHERE status != 'completed'",
    );
    return rows.map((r) => ({ gameId: r.game_id, step: r.step, status: r.status, progress: r.progress }));
  }
}
