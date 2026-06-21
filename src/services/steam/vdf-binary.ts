import type { VdfEntry } from './vdf-parser'

const Gio = imports.gi.Gio

export function readFileBytes(path: string): Uint8Array | null {
  const f = Gio.File.new_for_path(path)
  const [ok, data] = f.load_contents(null) as [boolean, Uint8Array | null, string]
  return ok && data ? data : null
}

export function writeFileBytes(path: string, data: Uint8Array): void {
  const f = Gio.File.new_for_path(path)
  const s = f.replace(null, false, Gio.FileCreateFlags.NONE, null)
  s.write(data, null)
  s.close(null)
}

function concatU8(parts: Uint8Array[]): Uint8Array {
  let len = 0; for (const p of parts) len += p.length
  const r = new Uint8Array(len); let off = 0
  for (const p of parts) { r.set(p, off); off += p.length }
  return r
}

export function readBinVdf(data: Uint8Array, off = 0): { e: VdfEntry; n: number } {
  const e: VdfEntry = {}
  while (off < data.length) {
    const t = data[off++]
    if (t === 0x00) break
    if (t === 0x08) continue
    let ke = off; while (ke < data.length && data[ke] !== 0) ke++
    const k = new TextDecoder().decode(data.slice(off, ke))
    off = ke + 1
    if (t === 0x01) {
      let ve = off; while (ve < data.length && data[ve] !== 0) ve++
      e[k] = new TextDecoder().decode(data.slice(off, ve)); off = ve + 1
    } else if (t === 0x02) {
      const dv = new DataView(data.buffer, off, 4)
      e[k] = dv.getInt32(0, true); off += 4
    } else if (t === 0x07) {
      const r = readBinVdf(data, off); e[k] = r.e; off = r.n
    }
  }
  return { e, n: off + 1 }
}

export function writeBinVdf(e: VdfEntry): Uint8Array {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []
  for (const [k, v] of Object.entries(e)) {
    if (typeof v === 'object') {
      parts.push(new Uint8Array([0x07]))
      parts.push(Uint8Array.from([...enc.encode(k), 0]))
      parts.push(writeBinVdf(v as VdfEntry))
    } else if (typeof v === 'number') {
      parts.push(new Uint8Array([0x02]))
      parts.push(Uint8Array.from([...enc.encode(k), 0]))
      const buf = new Uint8Array(4)
      new DataView(buf.buffer).setInt32(0, v, true)
      parts.push(buf)
    } else {
      parts.push(new Uint8Array([0x01]))
      parts.push(Uint8Array.from([...enc.encode(k), 0]))
      parts.push(Uint8Array.from([...enc.encode(v as string), 0]))
    }
  }
  parts.push(new Uint8Array([0x00]))
  return concatU8(parts)
}
