import type { Game, GameID, SourceID } from '../domain/models';
import type { IDatabaseService, GameRow } from './types';
import { parseDbPath, embedParams, rowToGame, gameToRow, extractValue } from './database-helpers';
import { runMigrations } from './database-migrations';
import {
  insertGame, getGame, getAllGames, getAchievements,
  getResumeOffset, setResumeOffset, saveDownloadState,
  getDownloadState, setWishlisted, getWishlisted,
} from './database-games';
import {
  logPipelineStep, startPlaySession, endPlaySession,
  getPlaytime, getLaunchOptions, setLaunchOptions,
  savePipelineState, getPipelineState, getAllIncompletePipelines,
  getPipelineLogs, getLogGameIds,
} from './database-pipeline';

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
    await runMigrations(this.query.bind(this), this.execute.bind(this));
  }

  async insertGame(game: Game): Promise<void> { return insertGame(this, game) }

  async getGame(id: GameID): Promise<Game | null> { return getGame(this, id) }

  async getAllGames(sourceId?: SourceID): Promise<Game[]> { return getAllGames(this, sourceId) }

  async getAchievements(gameId: string): Promise<import('../domain/achievements/types').Achievement[] | null> {
    return getAchievements(this, gameId)
  }

  async getResumeOffset(gameId: GameID): Promise<number> { return getResumeOffset(this, gameId) }

  async setResumeOffset(gameId: GameID, offset: number): Promise<void> { return setResumeOffset(this, gameId, offset) }

  async saveDownloadState(gameId: GameID, offset: number, total: number, status: string): Promise<void> {
    return saveDownloadState(this, gameId, offset, total, status)
  }

  async getDownloadState(gameId: GameID): Promise<{ offset: number; total: number; status: string } | null> {
    return getDownloadState(this, gameId)
  }

  async setWishlisted(gameId: GameID, wishlisted: boolean): Promise<void> {
    return setWishlisted(this, gameId, wishlisted)
  }

  async getWishlisted(): Promise<GameID[]> { return getWishlisted(this) }

  async logPipelineStep(gameId: GameID, step: string, status: string, message?: string): Promise<void> {
    return logPipelineStep(this, gameId, step, status, message)
  }

  async startPlaySession(gameId: GameID): Promise<string> { return startPlaySession(this, gameId) }

  async endPlaySession(sessionId: string): Promise<void> { return endPlaySession(this, sessionId) }

  async getPlaytime(gameId: GameID): Promise<number> { return getPlaytime(this, gameId) }

  async getLaunchOptions(gameId: GameID): Promise<{ env: Record<string, string>; args: string }> {
    return getLaunchOptions(this, gameId)
  }

  async setLaunchOptions(gameId: GameID, env: Record<string, string>, args: string): Promise<void> {
    return setLaunchOptions(this, gameId, env, args)
  }

  async savePipelineState(
    gameId: GameID,
    state: { step: string; status: string; progress: number; errorMessage?: string },
  ): Promise<void> {
    return savePipelineState(this, gameId, state)
  }

  async getPipelineState(
    gameId: GameID,
  ): Promise<{ step: string; status: string; progress: number; errorMessage?: string } | null> {
    return getPipelineState(this, gameId)
  }

  async getAllIncompletePipelines(): Promise<
    Array<{ gameId: GameID; step: string; status: string; progress: number }>
  > {
    return getAllIncompletePipelines(this)
  }

  async getPipelineLogs(filter?: import('./database-types').LogFilter): Promise<import('./database-types').LogEntry[]> {
    return getPipelineLogs(this, filter)
  }

  async getLogGameIds(): Promise<string[]> {
    return getLogGameIds(this)
  }
}
