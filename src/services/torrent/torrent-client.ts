export interface TorrentClientInfo {
  name: string
  binary: string
  daemonBinary: string
  cliBinary: string
  detect(): boolean
  spawn(): Promise<boolean>
  addMagnet(magnet: string, downloadDir: string): Promise<boolean>
  addTorrent(url: string, downloadDir: string): Promise<boolean>
}

const CLIENTS: Omit<TorrentClientInfo, 'detect' | 'spawn' | 'addMagnet' | 'addTorrent'>[] = [
  { name: 'Transmission', binary: 'transmission-daemon', daemonBinary: 'transmission-daemon', cliBinary: 'transmission-remote' },
  { name: 'qBittorrent', binary: 'qbittorrent-nox', daemonBinary: 'qbittorrent-nox', cliBinary: 'qbittorrent-nox' },
  { name: 'Deluge', binary: 'deluged', daemonBinary: 'deluged', cliBinary: 'deluge-console' },
]

function buildTransmissionClient(binary: string): TorrentClientInfo {
  return {
    name: 'Transmission', binary, daemonBinary: 'transmission-daemon', cliBinary: 'transmission-remote',
    detect: () => !!findBinary('transmission-daemon'),
    spawn: async () => {
      const { GLib } = imports.gi
      const existing = GLib.find_program_in_path('transmission-daemon')
      if (!existing) return false
      const [ok] = GLib.spawn_command_line_async('transmission-daemon')
      return ok
    },
    addMagnet: async (magnet, _downloadDir) => {
      const { GLib } = imports.gi
      const remote = GLib.find_program_in_path('transmission-remote')
      if (!remote) return false
      const [status] = GLib.spawn_command_line_sync(`${remote} --add "${magnet}"`)
      return status === 0
    },
    addTorrent: async (url, _downloadDir) => {
      const { GLib } = imports.gi
      const remote = GLib.find_program_in_path('transmission-remote')
      if (!remote) return false
      const [status] = GLib.spawn_command_line_sync(`${remote} --add "${url}"`)
      return status === 0
    },
  }
}

function buildQbittorrentClient(binary: string): TorrentClientInfo {
  return {
    name: 'qBittorrent', binary, daemonBinary: 'qbittorrent-nox', cliBinary: 'qbittorrent-nox',
    detect: () => !!findBinary('qbittorrent-nox'),
    spawn: async () => {
      const { GLib } = imports.gi
      const existing = GLib.find_program_in_path('qbittorrent-nox')
      if (!existing) return false
      const [ok] = GLib.spawn_command_line_async('qbittorrent-nox --daemon')
      return ok
    },
    addMagnet: async (magnet, _downloadDir) => {
      const { GLib } = imports.gi
      const cli = GLib.find_program_in_path('qbittorrent-nox')
      if (!cli) return false
      const [status] = GLib.spawn_command_line_sync(`${cli} --add "${magnet}"`)
      return status === 0
    },
    addTorrent: async (url, _downloadDir) => {
      const { GLib } = imports.gi
      const cli = GLib.find_program_in_path('qbittorrent-nox')
      if (!cli) return false
      const [status] = GLib.spawn_command_line_sync(`${cli} --add "${url}"`)
      return status === 0
    },
  }
}

function buildDelugeClient(binary: string): TorrentClientInfo {
  return {
    name: 'Deluge', binary, daemonBinary: 'deluged', cliBinary: 'deluge-console',
    detect: () => !!findBinary('deluged'),
    spawn: async () => {
      const { GLib } = imports.gi
      const existing = GLib.find_program_in_path('deluged')
      if (!existing) return false
      const [ok] = GLib.spawn_command_line_async('deluged')
      return ok
    },
    addMagnet: async (magnet, _downloadDir) => {
      const { GLib } = imports.gi
      const cli = GLib.find_program_in_path('deluge-console')
      if (!cli) return false
      const escaped = magnet.replace(/'/g, "'\\''")
      const [status] = GLib.spawn_command_line_sync(`${cli} add '${escaped}'`)
      return status === 0
    },
    addTorrent: async (url, _downloadDir) => {
      const { GLib } = imports.gi
      const cli = GLib.find_program_in_path('deluge-console')
      if (!cli) return false
      const [status] = GLib.spawn_command_line_sync(`${cli} add '${url}'`)
      return status === 0
    },
  }
}

export function detectTorrentClients(): TorrentClientInfo[] {
  const { GLib } = imports.gi
  const detected: TorrentClientInfo[] = []
  for (const def of CLIENTS) {
    const path = GLib.find_program_in_path(def.binary)
    if (path) {
      const factory = def.name === 'Transmission' ? buildTransmissionClient
        : def.name === 'qBittorrent' ? buildQbittorrentClient
        : buildDelugeClient
      detected.push(factory(path))
    }
  }
  return detected
}

export function spawnTorrentClient(client: TorrentClientInfo): Promise<boolean> {
  return client.spawn()
}

export function isValidMagnetURI(uri: string): boolean {
  return /^magnet:\?xt=urn:[a-z0-9]+:[a-f0-9]{32,}(?:&|$)/i.test(uri)
}

export function isValidTorrentURL(url: string): boolean {
  return /^https?:\/\/.+\/.+\.torrent($|\?)/i.test(url)
}

function findBinary(name: string): string | null {
  const { GLib } = imports.gi
  return GLib.find_program_in_path(name)
}