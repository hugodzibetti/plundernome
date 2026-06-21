const GLib = imports.gi.GLib
const Gio = imports.gi.Gio

const CHUNK_SIZE = 65536

export type ChecksumResult = { ok: true } | { ok: false; error: string }

export function computeHash(filePath: string): string {
  const checksum = new GLib.Checksum(GLib.ChecksumType.SHA256)
  const file = Gio.File.new_for_path(filePath)
  const inputStream = file.read(null)
  const dataInputStream = new Gio.DataInputStream({ base_stream: inputStream })

  while (true) {
    const chunk = dataInputStream.read_byte_array(CHUNK_SIZE, null)
    if (chunk === null) break
    checksum.update(chunk)
  }

  dataInputStream.close(null)
  return checksum.get_string()
}

export async function verifyChecksum(filePath: string, expectedHash: string): Promise<boolean> {
  try {
    const actualHash = computeHash(filePath)
    return actualHash.toLowerCase() === expectedHash.toLowerCase()
  } catch {
    return false
  }
}