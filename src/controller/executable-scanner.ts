export interface ScanResult {
  path: string
  candidates: string[]
}

export function findExecutable(installPath: string): ScanResult {
  const { Gio } = imports.gi
  const dir = Gio.File.new_for_path(installPath)
  const enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null)
  const candidates: string[] = []
  let info
  while ((info = enumerator.next_file(null)) !== null) {
    const name = info.get_name()
    const fileType = info.get_file_type()
    if (fileType === Gio.FileType.REGULAR) {
      if (name.endsWith('.exe') || name.endsWith('.sh') || info.is_symlink()) {
        candidates.push(`${installPath}/${name}`)
      }
    }
    if (fileType === Gio.FileType.DIRECTORY) {
      const subDir = dir.get_child(name)
      const subEnum = subDir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null)
      let subInfo
      while ((subInfo = subEnum.next_file(null)) !== null) {
        const subName = subInfo.get_name()
        if (subName.endsWith('.exe')) {
          candidates.push(`${installPath}/${name}/${subName}`)
        }
      }
    }
  }
  const directExe = candidates.find(e => !e.includes('/', installPath.length + 1) && e.endsWith('.exe'))
  const anyExe = candidates.find(e => e.endsWith('.exe'))
  const path = directExe || anyExe || (candidates[0] ?? '')
  return { path, candidates }
}
