import type { DependencyInfo, IDependencyInstaller, InstallResult } from '../types'

const { GLib, Gio } = imports.gi

const WINE_CHECK_DLLS: Record<string, string> = {
  vcredist: 'vcruntime140.dll',
  directx: 'd3dx9_43.dll',
  dotnet: 'mscoree.dll',
  xna: 'xgameruntime.dll',
}

const WINETRICKS_VERBS: Record<string, string> = {
  vcredist: 'vcrun2022',
  directx: 'directx9',
  dotnet: 'dotnet48',
  xna: 'xna',
}

const INSTALL_TIMEOUT_MS = 300_000

function winetricksVerb(dep: DependencyInfo): string {
  return dep.winetricksVerb ?? WINETRICKS_VERBS[dep.type] ?? dep.type
}

function silentFlag(type: string): string {
  if (type === 'physx') return '/quiet /Q'
  if (type === 'openal') return '/S'
  return '/quiet'
}

function isWinetricksDep(type: string): boolean {
  return type === 'vcredist' || type === 'directx' || type === 'dotnet' || type === 'xna'
}

function checkWineAvailable(): string | null {
  try {
    const proc = Gio.Subprocess.new(
      ['wine', '--version'],
      Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    )
    const [ok, stdoutBytes] = proc.communicate_utf8(null, null)
    const version = stdoutBytes ? imports.byteArray.toString(stdoutBytes) : ''
    if (ok && version && version.trim().length > 0) return null
    return 'wine --version returned no output'
  } catch (e) {
    return `wine not available: ${String(e)}`
  }
}

function exec(cmd: string, timeoutMs: number): { ok: boolean; stdout: string; stderr: string; errorMessage?: string } {
  try {
    const proc = Gio.Subprocess.new(
      ['bash', '-c', cmd],
      Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
    )
    const cancel = new Gio.Cancellable()
    const timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeoutMs, () => { cancel.cancel(); return false })
    try {
      const result = proc.communicate_utf8(null, cancel)
      GLib.source_remove(timeoutId)
      const stdout = result[1] ? imports.byteArray.toString(result[1]) : ''
      const stderr = result[2] ? imports.byteArray.toString(result[2]) : ''
      if (!proc.get_successful()) {
        return { ok: false, stdout, stderr, errorMessage: `Exit code: ${proc.get_exit_status()}` }
      }
      return { ok: true, stdout, stderr }
    } catch (e) {
      GLib.source_remove(timeoutId)
      const msg = String(e)
      if (msg.includes('Cancelled') || msg.includes('cancel')) {
        return { ok: false, stdout: '', stderr: '', errorMessage: 'Installation timed out after 5 minutes' }
      }
      return { ok: false, stdout: '', stderr: '', errorMessage: msg }
    }
  } catch (e) {
    return { ok: false, stdout: '', stderr: '', errorMessage: String(e) }
  }
}

function ensurePrefix(prefixPath: string): { ok: boolean; errorMessage?: string } {
  if (GLib.file_test(prefixPath, GLib.FileTest.IS_DIR)) {
    return { ok: true }
  }
  const mkdirResult = exec(`mkdir -p "${prefixPath}"`, 10000)
  if (!mkdirResult.ok) return mkdirResult
  return exec(`WINEPREFIX="${prefixPath}" wineboot -u`, INSTALL_TIMEOUT_MS)
}

export class DependencyInstaller implements IDependencyInstaller {
  private defaultPrefix: string

  constructor(defaultPrefix: string = '') {
    this.defaultPrefix = defaultPrefix
  }

  async install(dep: DependencyInfo, prefixPath: string): Promise<InstallResult> {
    const wineErr = checkWineAvailable()
    if (wineErr) return { success: false, action: 'check-wine', errorMessage: wineErr }

    const prefixResult = ensurePrefix(prefixPath)
    if (!prefixResult.ok) {
      return { success: false, action: 'prefix-create', errorMessage: prefixResult.errorMessage }
    }

    if (isWinetricksDep(dep.type)) {
      const verb = winetricksVerb(dep)
      const result = exec(`WINEPREFIX="${prefixPath}" winetricks -q ${verb}`, INSTALL_TIMEOUT_MS)
      if (!result.ok) {
        return { success: false, action: `winetricks-${verb}`, errorMessage: result.errorMessage ?? result.stderr }
      }
      return { success: true, action: `winetricks-${verb}` }
    }

    if (!dep.installerPath) {
      return { success: false, action: 'install', errorMessage: 'No installerPath for bundled dependency' }
    }
    const flag = silentFlag(dep.type)
    const result = exec(`WINEPREFIX="${prefixPath}" wine "${dep.installerPath}" ${flag}`, INSTALL_TIMEOUT_MS)
    if (!result.ok) {
      return { success: false, action: `bundled-${dep.type}`, errorMessage: result.errorMessage ?? result.stderr }
    }
    return { success: true, action: `bundled-${dep.type}` }
  }

  async detect(dep: DependencyInfo): Promise<boolean> {
    if (!isWinetricksDep(dep.type)) return false
    const dll = WINE_CHECK_DLLS[dep.type]
    if (!dll) return false
    return GLib.file_test(`${this.defaultPrefix}/drive_c/windows/system32/${dll}`, GLib.FileTest.EXISTS)
  }
}