import type { GameID } from '../../domain/models'
const GLib = imports.gi.GLib

export interface ContainerConfig {
  type: 'distrobox' | 'toolbox'
  name: string
}

export class ContainerLauncher {
  detectAvailable(): ContainerConfig[] {
    const result: ContainerConfig[] = []
    try {
      const [ok, out] = GLib.spawn_command_line_sync('distrobox list')
      if (ok && out && out.length > 0) result.push({ type: 'distrobox', name: 'default' })
    } catch { }
    try {
      const [ok, out] = GLib.spawn_command_line_sync('toolbox list')
      if (ok && out && out.length > 0) result.push({ type: 'toolbox', name: 'default' })
    } catch { }
    return result
  }

  async launchInContainer(
    executable: string,
    container: ContainerConfig,
    envVars: Record<string, string>,
  ): Promise<{ success: boolean; pid?: number; error?: string }> {
    const envStr = Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join(' ')
    const cmd = container.type === 'distrobox'
      ? `distrobox enter ${container.name} -- ${envStr} "${executable}"`
      : `toolbox run -c ${container.name} ${envStr} "${executable}"`
    try {
      const [ok, pid] = GLib.spawn_command_line_async(cmd)
      return ok ? { success: true, pid } : { success: false, error: 'Failed to spawn process' }
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    }
  }
}
