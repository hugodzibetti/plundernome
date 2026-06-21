import type { Game, GameID, PipelineStep } from '../domain/models'
import type { Dependency } from '../domain/types-extras'
import type { DatabaseService } from './database'
import type { ExtractorService } from './extractor'
import type { DependencyInstaller } from './dependency'
import type { Launcher } from './launcher'

export async function runExtractStep(
  gameId: GameID, archivePath: string, installDir: string,
  extractor: ExtractorService,
  onProgress?: (gameId: GameID, step: PipelineStep, current: number, total: number) => void
): Promise<void> {
  const result = await extractor.extract(archivePath, installDir, (current, total, _file) => {
    onProgress?.(gameId, 'extracting', current, total)
  })
  if (!result.success) throw new Error(result.errorMessage ?? 'Extraction failed')
}

export async function runDetectDepsStep(
  game: Game, installDir: string
): Promise<Dependency[]> {
  const { detectCompat } = await import('../domain/compat/detector')
  const { Gio } = imports.gi
  const dir = Gio.File.new_for_path(installDir)
  const enumerator = dir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null)
  const files: Array<{ path: string; name: string; extension: string; isDirectory: boolean; size: number }> = []
  let info
  while ((info = enumerator.next_file(null)) !== null) {
    const name = info.get_name()
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
    files.push({
      path: `${installDir}/${name}`, name, extension: ext,
      isDirectory: info.get_file_type() === Gio.FileType.DIRECTORY,
      size: info.get_size(),
    })
  }
  const profile = detectCompat(files, game.name)
  return profile.deps
}

export async function runInstallDepsStep(
  deps: Dependency[],
  installDir: string,
  depInstaller: DependencyInstaller
): Promise<void> {
  if (deps.length === 0) return
  const prefixPath = `${installDir}/prefix`
  for (const dep of deps) {
    const result = await depInstaller.install(dep, prefixPath)
    if (!result.success) throw new Error(`Failed to install ${dep.name}: ${result.errorMessage}`)
  }
}

export async function runFindExeStep(installDir: string): Promise<string> {
  const { findExecutable } = await import('../controller/executable-scanner')
  const result = findExecutable(installDir)
  if (!result.path) throw new Error('No executable found in install directory')
  return result.path
}

export async function runRegisterStep(
  gameId: GameID, installPath: string, db: DatabaseService, exePath: string | null
): Promise<void> {
  await db.execute(
    'UPDATE games SET installed = 1, install_path = //1 WHERE id = //2',
    [installPath, gameId]
  )
  if (exePath) {
    const existing = await db.getLaunchOptions(gameId)
    const env = { ...existing.env, exePath }
    await db.setLaunchOptions(gameId, env, existing.args)
  }
}

export function findInstallerExe(dir: string): string | null {
  const { Gio } = imports.gi
  const e = Gio.File.new_for_path(dir).enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null)
  let info
  const re = [/^setup_.*\.exe$/i, /\.setup\.exe$/i, /^gog_installer.*\.exe$/i]
  while ((info = e.next_file(null)) !== null) {
    const n = info.get_name()
    if (re.some(p => p.test(n))) return `${dir}/${n}`
  }
  return null
}

export async function runInstallerStep(
  gameId: GameID, installDir: string, installerPath: string,
  launcher: Launcher,
  onProgress?: (gameId: GameID, step: PipelineStep, current: number, total: number) => void,
): Promise<void> {
  const { GLib } = imports.gi
  onProgress?.(gameId, 'running-installer', 0, 100)
  if (!GLib.find_program_in_path('wine')) throw new Error('Wine not found')
  const prefix = `${GLib.get_home_dir()}/.local/share/plundernome/prefixes/${gameId}`
  const cmd = `WINEPREFIX="${prefix}" wine "${installerPath}" /SILENT /SUPPRESSMSGBOXES /DIR="C:\\install"`
  onProgress?.(gameId, 'running-installer', 25, 100)
  const [, pid] = GLib.spawn_async(null, ['/bin/sh', '-c', cmd], null,
    GLib.G_SPAWN_DEFAULT | GLib.G_SPAWN_SEARCH_PATH | GLib.G_SPAWN_LEAVE_DESCRIPTORS_OPEN | GLib.G_SPAWN_DO_NOT_REAP_CHILD, null)
  onProgress?.(gameId, 'running-installer', 50, 100)
  await new Promise<void>((res, rej) => {
    GLib.child_watch_add(pid, (_p, s) => s === 0 ? res() : rej(new Error(`Installer exited with code ${s}`)))
  })
  onProgress?.(gameId, 'running-installer', 100, 100)
}
