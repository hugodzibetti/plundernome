import type { Game, CompatProfile, GameID } from '../../domain/models'
import type { ILauncher, LaunchResult } from '../types'
import type { DatabaseService } from '../database/database'
import { GLib, expandPath, detectWineVersion, findProtonPath, buildPrefixPath, buildLaunchCommand } from '../launcher/launcher-utils'

export { detectWineVersion, buildLaunchCommand }

export class Launcher implements ILauncher {
  constructor(private db: DatabaseService) {}

  async launch(executablePath: string, compatProfile: CompatProfile, gameId: GameID): Promise<LaunchResult> {
    const expandedPath = expandPath(executablePath)
    if (!GLib.file_test(expandedPath, GLib.G_FILE_TEST_EXISTS)) {
      return { success: false, errorMessage: `Executable not found: ${executablePath}` }
    }

    if (compatProfile.needsProton) {
      if (!findProtonPath()) {
        return { success: false, errorMessage: 'Proton not found. Install GE-Proton or Steam Proton.' }
      }
    }

    if (compatProfile.needsWine && !compatProfile.needsProton) {
      if (!GLib.find_program_in_path('wine')) {
        return { success: false, errorMessage: 'Wine not found. Install wine or check PATH.' }
      }
    }

    const launchOpts = await this.db.getLaunchOptions(gameId)
    const mergedEnv = { ...compatProfile.env, ...launchOpts.env }
    const mergedProfile: CompatProfile = { ...compatProfile, env: mergedEnv }
    let command = buildLaunchCommand(expandedPath, mergedProfile, gameId)
    if (launchOpts.args) command += ` ${launchOpts.args}`

    try {
      const [, pid] = GLib.spawn_async(
        null,
        ['/bin/sh', '-c', command],
        null,
        GLib.G_SPAWN_DEFAULT |
        GLib.G_SPAWN_SEARCH_PATH |
        GLib.G_SPAWN_LEAVE_DESCRIPTORS_OPEN |
        GLib.G_SPAWN_DO_NOT_REAP_CHILD,
        null
      )

      const sessionId = await this.db.startPlaySession(gameId)

      GLib.child_watch_add(pid, () => {
        this.db.endPlaySession(sessionId)
      })

      return { success: true, pid }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, errorMessage: `Failed to launch: ${message}` }
    }
  }

  async createDesktopEntry(game: Game, _executablePath: string): Promise<void> {
    const launchPath = this.resolveLaunchScriptPath()
    const content = `[Desktop Entry]
Type=Application
Name=${game.name}
Comment=Play ${game.name}
Exec=${launchPath} ${game.id}
Icon=${game.imageUrl || 'applications-games'}
Categories=Game;
Terminal=false
StartupNotify=true
`
    const appsDir = `${GLib.get_home_dir()}/.local/share/applications`
    const desktopPath = `${appsDir}/plundernome-${game.id}.desktop`
    GLib.file_set_contents(desktopPath, content)
  }

  async removeDesktopEntry(gameId: GameID): Promise<void> {
    const desktopPath = `${GLib.get_home_dir()}/.local/share/applications/plundernome-${gameId}.desktop`
    if (GLib.file_test(desktopPath, GLib.G_FILE_TEST_EXISTS)) {
      GLib.remove(desktopPath)
    }
  }

  private resolveLaunchScriptPath(): string {
    const cwd = GLib.get_current_dir()
    const candidates = [
      `${cwd}/scripts/plundernome-launch.sh`,
      `${cwd}/../scripts/plundernome-launch.sh`,
      `${cwd}/dist/launch-entry.js`,
      'plundernome-launch',
    ]
    for (const p of candidates) {
      if (p === 'plundernome-launch') return p
      if (GLib.file_test(p, GLib.G_FILE_TEST_EXISTS)) return p
    }
    return 'plundernome-launch'
  }
}