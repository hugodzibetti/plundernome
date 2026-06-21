import type { ICloudSaveService } from './types'
import type { SaveManifest, SaveFile } from '../domain/cloud-save/types'
import type { HttpService } from './http'
import type { DatabaseService } from './database'
import { syncToWebdav, syncFromWebdav } from './cloud-save-webdav'

const GLib = imports.gi.GLib
const Gio = imports.gi.Gio

const LUDUSAVI_PATHS = ['/usr/bin/ludusavi', '/usr/local/bin/ludusavi', `${GLib.get_home_dir()}/.local/bin/ludusavi`]

function findLudusavi(): string | null {
  const inPath = GLib.find_program_in_path('ludusavi')
  if (inPath) return inPath
  for (const p of LUDUSAVI_PATHS) {
    if (GLib.file_test(p, GLib.FileTest.EXISTS)) return p
  }
  return null
}

export class CloudSaveService implements ICloudSaveService {
  private ludusaviPath: string | null

  constructor(
    private http: HttpService,
    private db: DatabaseService,
    ludusaviBinary?: string,
  ) {
    this.ludusaviPath = ludusaviBinary ?? findLudusavi()
  }

  async backup(gameId: string): Promise<SaveManifest | null> {
    const rows = await this.db.query<{ name: string; install_path: string | null }>(
      'SELECT name, install_path FROM games WHERE id = //1', [gameId],
    )
    const game = rows[0]
    if (!game) return null
    const backupDir = `${GLib.get_tmp_dir()}/plundernome-saves/${gameId}-${Date.now()}`
    GLib.mkdir_with_parents(backupDir, 0o755)
    let saves: SaveFile[] = []
    const tool: 'ludusavi' | 'manual' = this.ludusaviPath ? 'ludusavi' : 'manual'
    if (this.ludusaviPath) {
      const cmd = `${this.ludusaviPath} backup --game "${game.name}" --path "${backupDir}" --format json`
      const [status, stdout] = GLib.spawn_command_line_sync(cmd)
      if (status === 0 && stdout) {
        try {
          const parsed = JSON.parse(new TextDecoder().decode(stdout))
          for (const gn of Object.keys(parsed.games ?? {})) {
            const entries = parsed.games[gn].files ?? parsed.games[gn].entries ?? []
            for (const e of entries) {
              saves.push({
                relativePath: e.path ?? e.file ?? e.name ?? '',
                absolutePath: e.original_path ?? e.absolute_path ?? '',
                sizeBytes: e.size_bytes ?? e.size ?? 0,
                lastModified: e.last_modified ?? e.modified ?? '',
              })
            }
          }
        } catch {}
      }
    } else if (game.install_path) {
      const home = GLib.get_home_dir()
      for (const root of [`${home}/.config`, `${home}/.local/share`, `${home}/Documents/My Games`]) {
        const dirPath = `${root}/${game.name}`
        if (!GLib.file_test(dirPath, GLib.FileTest.IS_DIR)) continue
        const dir = Gio.File.new_for_path(dirPath)
        const enumerator = dir.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null)
        let info = enumerator.next_file(null)
        while (info) {
          saves.push({
            relativePath: info.get_name(),
            absolutePath: `${dirPath}/${info.get_name()}`,
            sizeBytes: info.get_size(),
            lastModified: '',
          })
          info = enumerator.next_file(null)
        }
        const dest = `${backupDir}/${game.name}`
        GLib.mkdir_with_parents(dest, 0o755)
        GLib.spawn_command_line_sync(`cp -r "${dirPath}" "${backupDir}/"`)
      }
    }
    const manifest: SaveManifest = {
      gameId, gameName: game.name, saves,
      backupTime: new Date().toISOString(), tool,
    }
    await this.db.execute(
      `INSERT INTO save_manifests (game_id, game_name, manifest_json, backup_time, tool) VALUES (//1, //2, //3, //4, //5)`,
      [gameId, game.name, JSON.stringify(manifest), manifest.backupTime, tool],
    )
    return manifest
  }

  async restore(manifest: SaveManifest): Promise<boolean> {
    const backupDir = `${GLib.get_tmp_dir()}/plundernome-saves/restore-${manifest.gameId}-${Date.now()}`
    GLib.mkdir_with_parents(backupDir, 0o755)
    for (const save of manifest.saves) {
      const dest = `${backupDir}/${save.relativePath}`
      const parent = Gio.File.new_for_path(dest).get_parent()
      if (parent && !parent.query_exists(null)) parent.make_directory_with_parents(null)
      const [s] = GLib.spawn_command_line_sync(`cp "${save.absolutePath}" "${dest}"`)
      if (s !== 0) return false
    }
    if (this.ludusaviPath) {
      const [s] = GLib.spawn_command_line_sync(
        `${this.ludusaviPath} restore --game "${manifest.gameName}" --path "${backupDir}" --force`,
      )
      return s === 0
    }
    for (const save of manifest.saves) {
      const [s] = GLib.spawn_command_line_sync(`cp "${backupDir}/${save.relativePath}" "${save.absolutePath}"`)
      if (s !== 0) return false
    }
    return true
  }

  async listSaves(gameId?: string): Promise<SaveManifest[]> {
    const sql = gameId
      ? 'SELECT manifest_json FROM save_manifests WHERE game_id = //1 ORDER BY backup_time DESC'
      : 'SELECT manifest_json FROM save_manifests ORDER BY backup_time DESC'
    const rows = await this.db.query<{ manifest_json: string }>(sql, gameId ? [gameId] : [])
    return rows.map(r => JSON.parse(r.manifest_json) as SaveManifest)
  }

  async syncToWebdav(manifest: SaveManifest): Promise<boolean> {
    return syncToWebdav(manifest)
  }

  async syncFromWebdav(): Promise<SaveManifest[]> {
    return syncFromWebdav()
  }
}
