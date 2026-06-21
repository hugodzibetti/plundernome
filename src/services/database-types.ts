import type { PipelineStep, GameID } from '../domain/models';

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

export interface IDatabaseService {
  connect(dbPath: string): Promise<void>
  disconnect(): Promise<void>
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<number>
  migrate(): Promise<void>
  setWishlisted(gameId: GameID, wishlisted: boolean): Promise<void>
  getWishlisted(): Promise<GameID[]>
}

export interface GameRow {
  id: string
  name: string
  source_id: string
  source_game_id: string
  url: string
  description: string
  size_bytes: number
  last_updated: string
  download_type: string
  image_url: string | null
  installed: boolean
  install_path: string | null
  created_at: string
  checksum: string | null
  resume_offset: number
  wishlisted?: boolean
}

export interface PlaySession {
  id: string
  game_id: string
  session_start: string
  session_end: string | null
}

export interface GameConfig {
  env: Record<string, string>
  args: string
}

export interface IDependencyInstaller {
  install(dep: DependencyInfo, prefixPath: string): Promise<InstallResult>
  detect(dep: DependencyInfo): Promise<boolean>
}

export interface DependencyInfo {
  id: string
  name: string
  type: string
  installerPath?: string
  downloadUrl?: string
  winetricksVerb?: string
}

export interface InstallResult {
  success: boolean
  action: string
  errorMessage?: string
}
