import type { Game, GameID, SourceID } from '../domain/models';
import type { IDatabaseService, GameRow } from './types';
import { parseDbPath, embedParams, rowToGame, gameToRow, extractValue } from './database-helpers';

export type { LogEntry, LogFilter } from './database-types';

export class DatabaseService implements IDatabaseService {
  private conn: GdaConnection | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    const home = imports.gi.GLib.get_home_dir();
    this.dbPath = dbPath ?? `${home}/.local/share/plundernome/games.db`;
  }

  async connect(dbPath?: string): Promise<void> {
    const path = dbPath ?? this.dbPath;
    const connStr = parseDbPath(path);
    this.conn = imports.gi.Gda.Connection.open_from_string('SQLite', connStr, '', null);
    await this.execute('PRAGMA journal_mode=WAL');
    await this.migrate();
  }

  async disconnect(): Promise<void> {
    if (!this.conn) return;
    this.conn!.close();
    this.conn = null;
  }

  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    if (!this.conn) throw new Error('Database not connected');
    try {
      const model = this.conn!.execute_select_command(embedParams(sql, params));
      const rows: T[] = [];
      if (!model) return rows;
      const nCols = model.get_n_columns();
      const nRows = model.get_n_rows();
      const colNames: string[] = [];
      for (let j = 0; j < nCols; j++) colNames.push(model.get_column_name(j));
      for (let i = 0; i < nRows; i++) {
        const row: Record<string, unknown> = {};
        for (let j = 0; j < nCols; j++) row[colNames[j]!] = extractValue(model.get_value_at(j, i));
        rows.push(row as T);
      }
      return rows;
    } catch (e: unknown) {
      throw new Error(`Query failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async execute(sql: string, params?: unknown[]): Promise<number> {
    if (!this.conn) throw new Error('Database not connected');
    try {
      return this.conn!.execute_non_select_command(embedParams(sql, params)) ?? 0;
    } catch (e: unknown) {
      throw new Error(`Execute failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async migrate(): Promise<void> {
    await this.execute(
      "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))",
    );
    const cur =
      (await this.query<{ v: number }>('SELECT COALESCE(MAX(version), 0) as v FROM schema_version'))[0]?.v ?? 0;
    if (cur < 1) {
      await this.execute(
        `CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, name TEXT NOT NULL, source_id TEXT NOT NULL, source_game_id TEXT NOT NULL, url TEXT, description TEXT, size_bytes INTEGER, last_updated TEXT, download_type TEXT, image_url TEXT, installed INTEGER DEFAULT 0, install_path TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      );
      await this.execute(
        `CREATE TABLE IF NOT EXISTS pipeline_log (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT NOT NULL, step TEXT NOT NULL, status TEXT NOT NULL, message TEXT, created_at TEXT DEFAULT (datetime('now')))`,
      );
      await this.execute(
        `CREATE TABLE IF NOT EXISTS play_sessions (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, session_start TEXT NOT NULL, session_end TEXT, FOREIGN KEY (game_id) REFERENCES games(id))`,
      );
      await this.execute(
        `CREATE TABLE IF NOT EXISTS launch_options (game_id TEXT PRIMARY KEY, env_json TEXT DEFAULT '{}', args TEXT DEFAULT '', FOREIGN KEY (game_id) REFERENCES games(id))`,
      );
      await this.execute('INSERT INTO schema_version (version) VALUES (//1)', [1]);
    }
    if (cur < 2) {
      try {
        await this.execute('ALTER TABLE games ADD COLUMN checksum TEXT');
      } catch {}
      await this.execute('INSERT INTO schema_version (version) VALUES (//1)', [2]);
    }
    if (cur < 3) {
      try {
        await this.execute('ALTER TABLE games ADD COLUMN resume_offset INTEGER DEFAULT 0');
      } catch {}
      await this.execute('INSERT INTO schema_version (version) VALUES (//1)', [3]);
    }
    if (cur < 4) {
      try {
        await this.execute("ALTER TABLE games ADD COLUMN download_status TEXT DEFAULT ''");
      } catch {}
      await this.execute('INSERT INTO schema_version (version) VALUES (//1)', [4]);
    }
    if (cur < 5) {
      try {
        await this.execute('ALTER TABLE games ADD COLUMN download_total INTEGER DEFAULT 0');
      } catch {}
      await this.execute('INSERT INTO schema_version (version) VALUES (//1)', [5]);
    }
    if (cur < 6) {
      try {
        await this.execute('ALTER TABLE games ADD COLUMN wishlisted INTEGER DEFAULT 0');
      } catch {}
      await this.execute('INSERT INTO schema_version (version) VALUES (//1)', [6]);
    }
    await this.execute(
      "CREATE TABLE IF NOT EXISTS pipeline_state (game_id TEXT PRIMARY KEY, step TEXT NOT NULL, status TEXT NOT NULL, progress REAL DEFAULT 0, error_message TEXT, updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (game_id) REFERENCES games(id))",
    );
  }

  async insertGame(game: Game): Promise<void> {
    const row = gameToRow(game);
    const keys = Object.keys(row);
    await this.execute(
      `INSERT OR REPLACE INTO games (${keys.join(', ')}) VALUES (${keys.map((_, i) => `//${i + 1}`).join(', ')})`,
      Object.values(row),
    );
  }

  async getGame(id: GameID): Promise<Game | null> {
    const rows = await this.query<GameRow>('SELECT * FROM games WHERE id = //1', [id]);
    return rows.length > 0 ? rowToGame(rows[0]!) : null;
  }

  async getAllGames(sourceId?: SourceID): Promise<Game[]> {
    const rows = sourceId
      ? await this.query<GameRow>('SELECT * FROM games WHERE source_id = //1 ORDER BY name', [sourceId])
      : await this.query<GameRow>('SELECT * FROM games ORDER BY name');
    return rows.map((r) => rowToGame(r));
  }

  async logPipelineStep(gameId: GameID, step: string, status: string, message?: string): Promise<void> {
    await this.execute('INSERT INTO pipeline_log (game_id, step, status, message) VALUES (//1, //2, //3, //4)', [
      gameId,
      step,
      status,
      message ?? null,
    ]);
  }

  async startPlaySession(gameId: GameID): Promise<string> {
    const id = imports.gi.GLib.uuid_string_random();
    await this.execute("INSERT INTO play_sessions (id, game_id, session_start) VALUES (//1, //2, datetime('now'))", [
      id,
      gameId,
    ]);
    return id;
  }

  async endPlaySession(sessionId: string): Promise<void> {
    await this.execute("UPDATE play_sessions SET session_end = datetime('now') WHERE id = //1", [sessionId]);
  }

  async getPlaytime(gameId: GameID): Promise<number> {
    const rows = await this.query<{ total: number }>(
      'SELECT COALESCE(SUM((julianday(session_end) - julianday(session_start)) * 86400), 0) as total FROM play_sessions WHERE game_id = //1 AND session_end IS NOT NULL',
      [gameId],
    );
    return rows[0]?.total ?? 0;
  }

  async getLaunchOptions(gameId: GameID): Promise<{ env: Record<string, string>; args: string }> {
    const rows = await this.query<{ env_json: string; args: string }>(
      'SELECT env_json, args FROM launch_options WHERE game_id = //1',
      [gameId],
    );
    if (rows.length === 0) return { env: {}, args: '' };
    return { env: JSON.parse(rows[0]!.env_json), args: rows[0]!.args };
  }

  async setLaunchOptions(gameId: GameID, env: Record<string, string>, args: string): Promise<void> {
    await this.execute('INSERT OR REPLACE INTO launch_options (game_id, env_json, args) VALUES (//1, //2, //3)', [
      gameId,
      JSON.stringify(env),
      args,
    ]);
  }

  async getResumeOffset(gameId: GameID): Promise<number> {
    const rows = await this.query<{ resume_offset: number }>('SELECT resume_offset FROM games WHERE id = //1', [
      gameId,
    ]);
    return rows[0]?.resume_offset ?? 0;
  }

  async setResumeOffset(gameId: GameID, offset: number): Promise<void> {
    await this.execute('UPDATE games SET resume_offset = //1 WHERE id = //2', [offset, gameId]);
  }

  async saveDownloadState(gameId: GameID, offset: number, total: number, status: string): Promise<void> {
    await this.execute(
      'UPDATE games SET resume_offset = //1, download_total = //2, download_status = //3 WHERE id = //4',
      [offset, total, status, gameId],
    );
  }

  async getDownloadState(gameId: GameID): Promise<{ offset: number; total: number; status: string } | null> {
    const rows = await this.query<{ resume_offset: number; download_total: number; download_status: string }>(
      'SELECT resume_offset, download_total, download_status FROM games WHERE id = //1',
      [gameId],
    );
    return rows.length > 0
      ? { offset: rows[0]!.resume_offset, total: rows[0]!.download_total, status: rows[0]!.download_status }
      : null;
  }

  async setWishlisted(gameId: GameID, wishlisted: boolean): Promise<void> {
    await this.execute('UPDATE games SET wishlisted = //1 WHERE id = //2', [wishlisted ? 1 : 0, gameId]);
  }

  async getWishlisted(): Promise<GameID[]> {
    const rows = await this.query<{ id: GameID }>('SELECT id FROM games WHERE wishlisted = 1');
    return rows.map((r) => r.id);
  }

  async savePipelineState(
    gameId: GameID,
    state: { step: string; status: string; progress: number; errorMessage?: string },
  ): Promise<void> {
    await this.execute(
      "INSERT OR REPLACE INTO pipeline_state (game_id, step, status, progress, error_message, updated_at) VALUES (//1, //2, //3, //4, //5, datetime('now'))",
      [gameId, state.step, state.status, state.progress, state.errorMessage ?? null],
    );
  }

  async getPipelineState(
    gameId: GameID,
  ): Promise<{ step: string; status: string; progress: number; errorMessage?: string } | null> {
    const rows = await this.query<{ step: string; status: string; progress: number; error_message: string | null }>(
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

  async getAllIncompletePipelines(): Promise<
    Array<{ gameId: GameID; step: string; status: string; progress: number }>
  > {
    const rows = await this.query<{ game_id: GameID; step: string; status: string; progress: number }>(
      "SELECT game_id, step, status, progress FROM pipeline_state WHERE status != 'completed'",
    );
    return rows.map((r) => ({ gameId: r.game_id, step: r.step, status: r.status, progress: r.progress }));
  }

  async getPipelineLogs(filter?: import('./database-types').LogFilter): Promise<import('./database-types').LogEntry[]> {
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
    return this.query<import('./database-types').LogEntry>(
      `SELECT * FROM pipeline_log ${where} ORDER BY created_at DESC LIMIT //${n++}`,
      [...params, filter?.limit ?? 200],
    );
  }

  async getLogGameIds(): Promise<string[]> {
    const rows = await this.query<{ game_id: string }>('SELECT DISTINCT game_id FROM pipeline_log ORDER BY game_id');
    return rows.map((r) => r.game_id);
  }
}
