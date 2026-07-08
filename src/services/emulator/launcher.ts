import type { PlatformID, ROMEntry, EmulatorConfig } from '../../domain/emulator/types'
import type { IEmulatorLauncher, LaunchResult } from '../types'
import type { DatabaseService } from '../database/database'

export class EmulatorLauncher implements IEmulatorLauncher {
  constructor(private readonly db: DatabaseService) {}

  async launch(romPath: string, platformId: PlatformID, emulatorPath: string): Promise<LaunchResult> {
    const { GLib } = imports.gi
    if (!GLib.file_test(romPath, GLib.G_FILE_TEST_EXISTS)) {
      return { success: false, errorMessage: `ROM not found: ${romPath}` }
    }
    if (!GLib.file_test(emulatorPath, GLib.G_FILE_TEST_EXISTS) && !GLib.find_program_in_path(emulatorPath)) {
      return { success: false, errorMessage: `Emulator not found: ${emulatorPath}` }
    }
    try {
      const cmd = emulatorPath.startsWith('flatpak') && emulatorPath.includes(' ')
        ? emulatorPath.split(' ')
        : [emulatorPath]
      const args = [...cmd, romPath]
      const [, pid] = GLib.spawn_async(
        null,
        args,
        null,
        GLib.G_SPAWN_DEFAULT |
        GLib.G_SPAWN_SEARCH_PATH |
        GLib.G_SPAWN_LEAVE_DESCRIPTORS_OPEN |
        GLib.G_SPAWN_DO_NOT_REAP_CHILD,
        null
      )
      const sessionId = await this.db.startPlaySession(platformId)
      GLib.child_watch_add(pid, () => {
        this.db.endPlaySession(sessionId)
      })
      return { success: true, pid }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, errorMessage: `Failed to launch emulator: ${message}` }
    }
  }

  async launchWithConfig(romEntry: ROMEntry, config: EmulatorConfig): Promise<LaunchResult> {
    const { GLib } = imports.gi
    if (!GLib.file_test(romEntry.path, GLib.G_FILE_TEST_EXISTS)) {
      return { success: false, errorMessage: `ROM not found: ${romEntry.path}` }
    }
    if (!GLib.file_test(config.emulatorPath, GLib.G_FILE_TEST_EXISTS) && !GLib.find_program_in_path(config.emulatorPath)) {
      return { success: false, errorMessage: `Emulator not found: ${config.emulatorPath}` }
    }
    try {
      const args = [config.emulatorPath]
      if (config.launchArgs) args.push(...config.launchArgs)
      args.push(romEntry.path)
      const [, pid] = GLib.spawn_async(
        null,
        args,
        null,
        GLib.G_SPAWN_DEFAULT |
        GLib.G_SPAWN_SEARCH_PATH |
        GLib.G_SPAWN_LEAVE_DESCRIPTORS_OPEN |
        GLib.G_SPAWN_DO_NOT_REAP_CHILD,
        null
      )
      const sessionId = await this.db.startPlaySession(romEntry.platformId)
      GLib.child_watch_add(pid, () => {
        this.db.endPlaySession(sessionId)
      })
      return { success: true, pid }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, errorMessage: `Failed to launch emulator: ${message}` }
    }
  }
}
