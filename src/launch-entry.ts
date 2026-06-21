/* GJS globals */
declare const ARGV: string[]
declare function printerr(msg: string): void
declare function log(msg: string): void

imports.gi.versions.Gda = '6.0'
imports.gi.versions.Gtk = '4.0'
imports.gi.versions.Adw = '1'
imports.gi.versions.Soup = '3.0'

const { GLib, Gda } = imports.gi

function getStringVal(model: GdaDataModel, col: number, row: number): string | null {
  try {
    const val = model.get_value_at(col, row)
    if (val === null || val === undefined) return null
    if (typeof val === 'object' && val.is_null && val.is_null()) return null
    return val.get_string ? val.get_string() : String(val)
  } catch {
    return null
  }
}

function getDbPath(): string {
  return `${GLib.get_user_data_dir()}/plundernome/games.db`
}

function openDb(): GdaConnection {
  const dbPath = getDbPath()
  const lastSlash = dbPath.lastIndexOf('/')
  const dbDir = dbPath.substring(0, lastSlash)
  const dbName = dbPath.substring(lastSlash + 1)
  return Gda.Connection.open_from_string('SQLite', `DB_DIR=${dbDir};DB_NAME=${dbName}`, '', null)
}

function esc(val: string): string {
  return val.replace(/'/g, "''")
}

function main(): number {
  const args = ARGV
  if (args.length < 1) {
    printerr('Usage: launch-entry.js <gameId>')
    return 1
  }
  const gameId = args[0]!

  try {
    const conn = openDb()
    const model = conn.execute_select_command(`SELECT name, install_path FROM games WHERE id = '${esc(gameId)}'`)
    if (!model || model.get_n_rows() === 0) {
      printerr(`Game not found: ${gameId}`)
      return 1
    }

    const gameName = getStringVal(model, 0, 0) ?? 'Unknown'
    const installPath = getStringVal(model, 1, 0)
    if (!installPath) {
      printerr(`No install path for game: ${gameName}`)
      return 1
    }

    let envJson = '{}'
    let extraArgs = ''
    try {
      const optModel = conn.execute_select_command(`SELECT env_json, args FROM launch_options WHERE game_id = '${esc(gameId)}'`)
      if (optModel && optModel.get_n_rows() > 0) {
        envJson = getStringVal(optModel, 0, 0) ?? '{}'
        extraArgs = getStringVal(optModel, 1, 0) ?? ''
      }
    } catch {
      log('No launch options found, using defaults')
    }

    const env: Record<string, string> = JSON.parse(envJson || '{}')
    const envParts = Object.entries(env).map(([k, v]) => `${k}=${v}`)

    let command = `"${installPath}"`
    if (extraArgs) command += ` ${extraArgs}`
    if (envParts.length > 0) command = `${envParts.join(' ')} ${command}`

    GLib.spawn_async(
      null,
      ['/bin/sh', '-c', command],
      null,
      GLib.G_SPAWN_DEFAULT | GLib.G_SPAWN_SEARCH_PATH | GLib.G_SPAWN_LEAVE_DESCRIPTORS_OPEN | GLib.G_SPAWN_DO_NOT_REAP_CHILD,
      null,
    )

    return 0
  } catch (e: unknown) {
    printerr(`Error launching game: ${e instanceof Error ? e.message : String(e)}`)
    return 1
  }
}

main()
