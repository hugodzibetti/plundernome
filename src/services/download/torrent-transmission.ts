import type { ITorrentService, TorrentClientInfo } from '../types'

export class TransmissionTorrentService implements ITorrentService {
  get availableClients(): TorrentClientInfo[] {
    const { GLib } = imports.gi
    const found = GLib.find_program_in_path('transmission-daemon')
    if (!found) return []
    return [{
      name: 'Transmission',
      binary: 'transmission-daemon',
      daemonBinary: 'transmission-daemon',
      cliBinary: 'transmission-remote',
      detect: () => !!GLib.find_program_in_path('transmission-daemon'),
      spawn: async () => {
        const [ok] = GLib.spawn_command_line_async('transmission-daemon --no-port-forwarding')
        return ok
      },
      addMagnet: async (magnet, downloadDir) => {
        const [status] = GLib.spawn_command_line_sync(`transmission-remote --add "${magnet}" --download-dir "${downloadDir}"`)
        return status === 0
      },
      addTorrent: async (url, downloadDir) => {
        const [status] = GLib.spawn_command_line_sync(`transmission-remote --add "${url}" --download-dir "${downloadDir}"`)
        return status === 0
      },
    }]
  }

  get currentClient(): TorrentClientInfo | null {
    return this.availableClients[0] ?? null
  }

  async autoSpawn(): Promise<boolean> {
    const { GLib } = imports.gi
    const [, stdout] = GLib.spawn_command_line_sync('pgrep -x transmission-daemon')
    if (stdout && new TextDecoder().decode(stdout).trim().length > 0) return true
    const found = GLib.find_program_in_path('transmission-daemon')
    if (!found) return false
    const [ok] = GLib.spawn_command_line_async('transmission-daemon --no-port-forwarding')
    return ok
  }

  async addMagnet(magnetUri: string, downloadDir: string): Promise<string> {
    const { GLib } = imports.gi
    const [status, stdout] = GLib.spawn_command_line_sync(`transmission-remote --add "${magnetUri}" --download-dir "${downloadDir}"`)
    if (status !== 0) throw new Error('Failed to add magnet to Transmission')
    const out = new TextDecoder().decode(stdout ?? new Uint8Array())
    const m = out.match(/success.*?(\w{40})/i)
    return m?.[1] ?? magnetUri
  }

  async addTorrent(torrentPath: string, downloadDir: string): Promise<string> {
    const { GLib } = imports.gi
    const [status, stdout] = GLib.spawn_command_line_sync(`transmission-remote --add "${torrentPath}" --download-dir "${downloadDir}"`)
    if (status !== 0) throw new Error('Failed to add torrent to Transmission')
    const out = new TextDecoder().decode(stdout ?? new Uint8Array())
    const m = out.match(/success.*?(\w{40})/i)
    return m?.[1] ?? torrentPath
  }

  async waitForCompletion(torrentId: string, onProgress?: (pct: number) => void): Promise<boolean> {
    const { GLib } = imports.gi
    return new Promise(resolve => {
      const poll = (): void => {
        const [status, stdout] = GLib.spawn_command_line_sync('transmission-remote --list --json')
        if (status !== 0) { resolve(false); return }
        const text = new TextDecoder().decode(stdout ?? new Uint8Array())
        let torrents: Array<Record<string, unknown>> = []
        try { torrents = JSON.parse(text)?.torrents ?? [] } catch { resolve(false); return }
        const tor = torrents.find(t => t.id === torrentId || t.hashString === torrentId || String(t.id) === torrentId) as Record<string, unknown> | undefined
        if (!tor) { resolve(false); return }
        const pct = Math.round((tor.percentDone as number) * 100)
        onProgress?.(pct)
        if ((tor.status as number) === 6 || (tor.percentDone as number) >= 1) { resolve(true); return }
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => { poll(); return false })
      }
      poll()
    })
  }

  async remove(torrentId: string): Promise<void> {
    const { GLib } = imports.gi
    GLib.spawn_command_line_sync(`transmission-remote --torrent "${torrentId}" --remove-and-delete`)
  }
}
