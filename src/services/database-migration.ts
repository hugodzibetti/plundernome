import type { IDatabaseService } from './types';

export async function runMigrations(db: IDatabaseService): Promise<void> {
  const cur = (await db.query<{ v: number }>('SELECT COALESCE(MAX(version), 0) as v FROM schema_version'))[0]?.v ?? 0;
  if (cur < 1) {
    await db.execute(
      `CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, name TEXT NOT NULL, source_id TEXT NOT NULL, source_game_id TEXT NOT NULL, url TEXT, description TEXT, size_bytes INTEGER, last_updated TEXT, download_type TEXT, image_url TEXT, installed INTEGER DEFAULT 0, install_path TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    );
    await db.execute(
      `CREATE TABLE IF NOT EXISTS pipeline_log (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT NOT NULL, step TEXT NOT NULL, status TEXT NOT NULL, message TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    );
    await db.execute(
      `CREATE TABLE IF NOT EXISTS play_sessions (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, session_start TEXT NOT NULL, session_end TEXT, FOREIGN KEY (game_id) REFERENCES games(id))`,
    );
    await db.execute(
      `CREATE TABLE IF NOT EXISTS launch_options (game_id TEXT PRIMARY KEY, env_json TEXT DEFAULT '{}', args TEXT DEFAULT '', FOREIGN KEY (game_id) REFERENCES games(id))`,
    );
    await db.execute('INSERT INTO schema_version (version) VALUES (//1)', [1]);
  }
  if (cur < 2) {
    try {
      await db.execute('ALTER TABLE games ADD COLUMN checksum TEXT');
    } catch {}
    await db.execute('INSERT INTO schema_version (version) VALUES (//1)', [2]);
  }
  if (cur < 3) {
    try {
      await db.execute('ALTER TABLE games ADD COLUMN resume_offset INTEGER DEFAULT 0');
    } catch {}
    await db.execute('INSERT INTO schema_version (version) VALUES (//1)', [3]);
  }
  if (cur < 4) {
    try {
      await db.execute("ALTER TABLE games ADD COLUMN download_status TEXT DEFAULT ''");
    } catch {}
    await db.execute('INSERT INTO schema_version (version) VALUES (//1)', [4]);
  }
  if (cur < 5) {
    try {
      await db.execute('ALTER TABLE games ADD COLUMN download_total INTEGER DEFAULT 0');
    } catch {}
    await db.execute('INSERT INTO schema_version (version) VALUES (//1)', [5]);
  }
  if (cur < 6) {
    try {
      await db.execute('ALTER TABLE games ADD COLUMN wishlisted INTEGER DEFAULT 0');
    } catch {}
    await db.execute('INSERT INTO schema_version (version) VALUES (//1)', [6]);
  }
  await db.execute(
    "CREATE TABLE IF NOT EXISTS pipeline_state (game_id TEXT PRIMARY KEY, step TEXT NOT NULL, status TEXT NOT NULL, progress REAL DEFAULT 0, error_message TEXT, updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (game_id) REFERENCES games(id))",
  );
}
