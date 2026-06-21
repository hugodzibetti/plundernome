export type ToolMap = { [key: string]: string | null }

export function detectTools(): ToolMap {
  const GLib = imports.gi.GLib
  return {
    '7z': GLib.find_program_in_path('7z'),
    unzip: GLib.find_program_in_path('unzip'),
    unrar: GLib.find_program_in_path('unrar'),
    tar: GLib.find_program_in_path('tar'),
  }
}

export function runCmd(cmdline: string): { ok: boolean; stdout: string; stderr: string } {
  const GLib = imports.gi.GLib
  const [status, rawOut, rawErr] = GLib.spawn_command_line_sync(cmdline)
  return { ok: status === 0, stdout: rawOut ? rawOut.toString() : '', stderr: rawErr ? rawErr.toString() : '' }
}

export function formatForArchive(path: string): string | null {
  const lower = path.toLowerCase()
  if (lower.endsWith('.zip')) return 'zip'
  if (lower.endsWith('.rar')) return 'rar'
  if (lower.endsWith('.7z')) return '7z'
  if (lower.endsWith('.iso')) return 'iso'
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return 'targz'
  if (lower.endsWith('.tar.xz')) return 'tarxz'
  return null
}

function walkDir(dir: string, count: boolean): number {
  const GLib = imports.gi.GLib
  let total = 0
  try {
    const d = GLib.dir_open(dir, 0)
    let name = GLib.dir_read_name(d)
    while (name) {
      const fullPath = `${dir}/${name}`
      try {
        const s = GLib.stat(fullPath)
        if ((s.st_mode & 0o170000) === 0o040000) {
          total += walkDir(fullPath, count)
        } else {
          total += count ? 1 : s.st_size
        }
      } catch (_) {
        total += count ? 1 : 0
      }
      name = GLib.dir_read_name(d)
    }
    GLib.dir_close(d)
  } catch (_) { }
  return total
}

export function countFiles(dir: string): number {
  return walkDir(dir, true)
}

export function totalBytesInDir(dir: string): number {
  return walkDir(dir, false)
}

export function countZipFiles(archivePath: string): number {
  const r = runCmd(`unzip -l "${archivePath}"`)
  if (!r.ok) return 0
  const lines = r.stdout.split('\n')
  let count = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.endsWith('/')) continue
    if (/^\d/.test(trimmed)) count++
  }
  return Math.max(0, count - 1)
}

export function count7zFiles(archivePath: string): number {
  const r = runCmd(`7z l "${archivePath}"`)
  if (!r.ok) return 0
  const lines = r.stdout.split('\n')
  let count = 0
  let inList = false
  for (const line of lines) {
    if (line.includes('----')) { inList = !inList; continue }
    if (inList) {
      const parts = line.trim().split(/\s+/)
      if (parts.length >= 5 && parts[0] === 'D') continue
      if (parts.length >= 5 && /^\d/.test(parts[0]!)) count++
    }
  }
  return count
}

export function isMultiPartArchive(path: string): boolean {
  return /\.\d{3}$/.test(path)
}

export function detectMultiPart(directoryPath: string, baseFilename: string): string[] {
  const GLib = imports.gi.GLib
  const patterns = [
    (b: string) => new RegExp(`^${escapeRegex(b)}\\.\\d{3}$`),
    (b: string) => new RegExp(`^${escapeRegex(b)}\\.r\\d{2}$`),
    (b: string) => new RegExp(`^${escapeRegex(b)}\\.part\\d+\\.rar$`),
  ]
  const extless = baseFilename.replace(/\.(rar|zip|7z|001)$/, '')
  const candidates = [baseFilename, extless]
  try {
    const dir = GLib.dir_open(directoryPath, 0)
    const parts: string[] = []
    let name = GLib.dir_read_name(dir)
    while (name) {
      for (const c of candidates) {
        for (const p of patterns) {
          if (p(c).test(name)) parts.push(`${directoryPath}/${name}`)
        }
      }
      name = GLib.dir_read_name(dir)
    }
    GLib.dir_close(dir)
    parts.sort()
    return [...new Set(parts)]
  } catch {
    return []
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function countTarFiles(archivePath: string): number {
  const r = runCmd(`tar tf "${archivePath}"`)
  if (!r.ok) return 0
  return r.stdout.split('\n').filter(l => l.length > 0 && !l.endsWith('/')).length
}