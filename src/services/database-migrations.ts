export async function runMigrations(
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>,
  execute: (sql: string, params?: unknown[]) => Promise<number>,
): Promise<void> {
  await execute(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT (datetime('now')))",
  )
  const cur =
    (await query<{ v: number }>('SELECT COALESCE(MAX(version), 0) as v FROM schema_version'))[0]?.v ?? 0
  if (cur < 1) {
    await execute(
      `CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, name TEXT NOT NULL, source_id TEXT NOT NULL, source_game_id TEXT NOT NULL, url TEXT, description TEXT, size_bytes INTEGER, last_updated TEXT, download_type TEXT, image_url TEXT, installed INTEGER DEFAULT 0, install_path TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    )
    await execute(
      `CREATE TABLE IF NOT EXISTS pipeline_log (id INTEGER PRIMARY KEY AUTOINCREMENT, game_id TEXT NOT NULL, step TEXT NOT NULL, status TEXT NOT NULL, message TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    )
    await execute(
      `CREATE TABLE IF NOT EXISTS play_sessions (id TEXT PRIMARY KEY, game_id TEXT NOT NULL, session_start TEXT NOT NULL, session_end TEXT, FOREIGN KEY (game_id) REFERENCES games(id))`,
    )
    await execute(
      `CREATE TABLE IF NOT EXISTS launch_options (game_id TEXT PRIMARY KEY, env_json TEXT DEFAULT '{}', args TEXT DEFAULT '', FOREIGN KEY (game_id) REFERENCES games(id))`,
    )
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [1])
  }
  if (cur < 2) {
    try {
      await execute('ALTER TABLE games ADD COLUMN checksum TEXT')
    } catch {}
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [2])
  }
  if (cur < 3) {
    try {
      await execute('ALTER TABLE games ADD COLUMN resume_offset INTEGER DEFAULT 0')
    } catch {}
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [3])
  }
  if (cur < 4) {
    try {
      await execute("ALTER TABLE games ADD COLUMN download_status TEXT DEFAULT ''")
    } catch {}
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [4])
  }
  if (cur < 5) {
    try {
      await execute('ALTER TABLE games ADD COLUMN download_total INTEGER DEFAULT 0')
    } catch {}
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [5])
  }
  if (cur < 6) {
    try {
      await execute('ALTER TABLE games ADD COLUMN wishlisted INTEGER DEFAULT 0')
    } catch {}
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [6])
  }
  if (cur < 7) {
    await execute(
      `CREATE TABLE IF NOT EXISTS save_manifests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        game_name TEXT NOT NULL,
        manifest_json TEXT NOT NULL,
        backup_time TEXT NOT NULL,
        tool TEXT NOT NULL DEFAULT 'manual',
        FOREIGN KEY (game_id) REFERENCES games(id)
      )`,
    )
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [7])
  }
  await execute(
    "CREATE TABLE IF NOT EXISTS pipeline_state (game_id TEXT PRIMARY KEY, step TEXT NOT NULL, status TEXT NOT NULL, progress REAL DEFAULT 0, error_message TEXT, updated_at TEXT DEFAULT (datetime('now')), FOREIGN KEY (game_id) REFERENCES games(id))",
  )
  if (cur < 8) {
    await execute(
      `CREATE TABLE IF NOT EXISTS game_achievements (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        icon_url TEXT,
        unlocked INTEGER DEFAULT 0,
        unlocked_at TEXT,
        source TEXT NOT NULL DEFAULT 'file-scan',
        steam_api_name TEXT,
        hidden INTEGER DEFAULT 0,
        FOREIGN KEY (game_id) REFERENCES games(id)
      )`,
    )
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [8])
  }
  if (cur < 9) {
    try {
      await execute("CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))")
      await execute("CREATE TABLE IF NOT EXISTS collection_games (collection_id TEXT NOT NULL, game_id TEXT NOT NULL, added_at TEXT DEFAULT (datetime('now')), PRIMARY KEY (collection_id, game_id), FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE, FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE)")
    } catch {}
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [9])
  }
  if (cur < 10) {
    await execute(
      `CREATE TABLE IF NOT EXISTS cached_games (
        source_id TEXT PRIMARY KEY,
        game_data_json TEXT NOT NULL,
        cached_at TEXT NOT NULL
      )`,
    )
    await execute('INSERT INTO schema_version (version) VALUES (//1)', [10])
  }
}
