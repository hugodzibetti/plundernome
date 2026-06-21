const MAX_FILES = 500

export function getCacheDir(): string {
  const { GLib, Gio } = imports.gi
  const dir = GLib.get_user_cache_dir() + '/plundernome/covers'
  const file = Gio.File.new_for_path(dir)
  if (!file.query_exists(null)) {
    file.make_directory_with_parents(null)
  }
  return dir
}

export function coverPath(gameId: string, url: string): string {
  const { GLib } = imports.gi
  const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, gameId + url, (gameId + url).length)
  return getCacheDir() + '/' + hash + '.jpg'
}

export function cacheExists(gameId: string, url: string): boolean {
  const { GLib } = imports.gi
  return GLib.file_test(coverPath(gameId, url), GLib.FileTest.EXISTS)
}

export function getCacheSize(): number {
  const { GLib, Gio } = imports.gi
  const dir = getCacheDir()
  const file = Gio.File.new_for_path(dir)
  if (!file.query_exists(null)) return 0
  const enumerator = file.enumerate_children('standard::name,time::modified', Gio.FileQueryInfoFlags.NONE, null)
  if (!enumerator) return 0
  let count = 0
  while (true) {
    const entry = enumerator.next_file(null)
    if (!entry) break
    const name = entry.get_name()
    if (entry.get_file_type() === Gio.FileType.REGULAR && name && name.endsWith('.jpg')) {
      count++
    }
  }
  enumerator.close(null)
  return count
}

export function evictOldest(maxFiles = MAX_FILES): void {
  const { GLib, Gio } = imports.gi
  const dir = getCacheDir()
  const file = Gio.File.new_for_path(dir)
  if (!file.query_exists(null)) return

  const enumerator = file.enumerate_children('standard::name,time::modified', Gio.FileQueryInfoFlags.NONE, null)
  if (!enumerator) return

  const entries: Array<{ name: string; modified: number }> = []
  while (true) {
    const entry = enumerator.next_file(null)
    if (!entry) break
    const name = entry.get_name()
    if (entry.get_file_type() === Gio.FileType.REGULAR && name && name.endsWith('.jpg')) {
      const modified = Number(entry.get_attribute_uint64('time::modified'))
      entries.push({ name, modified })
    }
  }
  enumerator.close(null)

  if (entries.length <= maxFiles) return

  entries.sort((a, b) => a.modified - b.modified)

  const targetCount = Math.max(0, entries.length - maxFiles)
  const toDelete = entries.slice(0, targetCount)
  for (const entry of toDelete) {
    GLib.remove(dir + '/' + entry.name)
  }
}

export async function ensureCached(gameId: string, url: string, httpService?: { download: (opts: { url: string; destinationPath: string }) => Promise<{ success: boolean }> }): Promise<string> {
  const path = coverPath(gameId, url)
  if (cacheExists(gameId, url)) {
    return path
  }

  if (httpService) {
    const result = await httpService.download({ url, destinationPath: path })
    if (result.success) {
      evictOldest()
      return path
    }
    return ''
  }

  const { Soup, Gio, GLib } = imports.gi
  const session = new Soup.Session()
  session.timeout = 10
  const msg = new Soup.Message({ method: 'GET', uri: url })

  try {
    session.send(msg, null)
  } catch {
    return ''
  }

  const bodyBytes = msg.response_body.flatten()
  if (msg.status_code !== 200 || bodyBytes.length === 0) {
    return ''
  }

  const gfile = Gio.File.new_for_path(path)
  const parent = gfile.get_parent()
  if (parent && !parent.query_exists(null)) {
    parent.make_directory_with_parents(null)
  }

  try {
    const output = gfile.replace(null, false, Gio.FileCreateFlags.NONE, null)
    output.write(bodyBytes, null)
    output.close(null)
    evictOldest()
    return path
  } catch {
    return ''
  }
}
