import type { FileEntry, CompatProfile, Result } from './models'
import { detectCompat } from './compat/detector'

export function validateImportPath(path: string): Result<string> {
  if (!path || path.trim().length === 0) {
    return { ok: false, error: 'Path cannot be empty' }
  }
  if (!path.includes('/') && !path.includes('\\')) {
    return { ok: false, error: 'Path must contain directory separator' }
  }
  const folderName = path.split('/').filter(Boolean).pop() ?? path.split('\\').filter(Boolean).pop()
  if (!folderName) {
    return { ok: false, error: 'Could not determine folder name from path' }
  }
  return { ok: true, value: path }
}

export function suggestGameTitleFromPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  const folderName = segments.length > 0 ? segments[segments.length - 1]! : 'Unknown'
  return folderName
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function detectGameFromPath(
  files: FileEntry[],
  folderName: string
): { gameName: string; compatProfile: CompatProfile } {
  const gameName = folderName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim()
  const compatProfile = detectCompat(files, gameName)
  return { gameName, compatProfile }
}