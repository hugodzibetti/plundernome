import type { GameID } from '../domain/models'
import type { FileEntry } from '../domain/types-extras'

export interface ScanResult {
  gameId: GameID
  executables: FileEntry[]
  totalSize: number
}

export class LibraryScanner {
  scanDirectory(gameId: GameID, path: string): ScanResult {
    const entries: FileEntry[] = []
    let totalSize = 0
    this.walkDir(path, entries, (s) => { totalSize += s })
    return { gameId, executables: entries, totalSize }
  }

  private walkDir(dirPath: string, results: FileEntry[], addSize: (s: number) => void): void {
    const { Gio, GLib } = imports.gi
    try {
      const dir = Gio.File.new_for_path(dirPath)
      const enumerator = dir.enumerate_children('standard::name,standard::type,standard::size', Gio.FileQueryInfoFlags.NONE, null)
      if (!enumerator) return
      while (true) {
        const info = enumerator.next_file(null)
        if (!info) break
        const name = info.get_name()
        if (name === '.' || name === '..') continue
        const child = dir.get_child(name)
        const fullPath = child.get_path()
        const fileType = info.get_file_type()

        if (fileType === Gio.FileType.DIRECTORY) {
          this.walkDir(fullPath, results, addSize)
        } else if (fileType === Gio.FileType.REGULAR) {
          const size = info.get_size()
          addSize(size)
          const dotIdx = name.lastIndexOf('.')
          const ext = dotIdx >= 0 ? name.substring(dotIdx).toLowerCase() : ''
          const isExec = ext === '.exe' || ext === '.sh' || ext === '.x86_64' || ext === '.x86'
          if (isExec) {
            results.push({ path: fullPath, name, size, isDirectory: false, extension: ext })
          }
        }
      }
      enumerator.close(null)
    } catch { }
  }
}
