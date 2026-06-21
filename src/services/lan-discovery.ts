import type { SyncPeer } from './sync-service'

export interface ILANDiscovery {
  startBroadcasting(port: number, onPeerFound: (peer: SyncPeer) => void): void
  stopBroadcasting(): void
  getKnownPeers(): SyncPeer[]
}

const DISCOVERY_PORT = 42069
const BROADCAST_INTERVAL_MS = 10000

export class LANDiscovery implements ILANDiscovery {
  private socket: GioSocket | null = null
  private broadcastTimer = 0
  private ioWatch = 0
  private peers = new Map<string, SyncPeer>()

  startBroadcasting(port: number, onPeerFound: (peer: SyncPeer) => void): void {
    const { GLib, Gio } = imports.gi
    const hostname = GLib.get_host_name() || 'unknown'

    const socket = new Gio.Socket({
      family: Gio.SocketFamily.IPV4,
      type: Gio.SocketType.DATAGRAM,
      protocol: Gio.SocketProtocol.UDP,
    })
    socket.set_broadcast(true)
    socket.set_blocking(false)

    const bindAddr = new Gio.InetSocketAddress({
      address: Gio.InetAddress.new_from_string('0.0.0.0'),
      port: DISCOVERY_PORT,
    })
    socket.bind(bindAddr, true)

    this.ioWatch = GLib.io_add_watch(
      socket,
      GLib.PRIORITY_DEFAULT,
      GLib.IOCondition.IN,
      () => {
        try {
          const r = socket.receive_from(null) as [Uint8Array, GioInetSocketAddress]
          const [data, srcAddr] = r
          if (data && data.length > 0) {
            const json = new TextDecoder().decode(data)
            const payload = JSON.parse(json)
            if (payload.name && payload.port) {
              const peer: SyncPeer = {
                name: payload.name,
                address: srcAddr.get_address().to_string(),
                port: payload.port,
              }
              const key = `${peer.address}:${peer.port}`
              if (!this.peers.has(key)) {
                this.peers.set(key, peer)
                onPeerFound(peer)
              }
            }
          }
        } catch {}
        return GLib.SOURCE_CONTINUE
      },
    )

    const broadcastAddr = new Gio.InetSocketAddress({
      address: Gio.InetAddress.new_from_string('255.255.255.255'),
      port: DISCOVERY_PORT,
    })
    const encoder = new TextEncoder()
    const payload = encoder.encode(JSON.stringify({
      name: `Plundernome-${hostname}`,
      port,
    }))

    const sendAnnounce = (): boolean => {
      try { socket.send_to(broadcastAddr, payload, null) } catch {}
      return GLib.SOURCE_CONTINUE
    }

    sendAnnounce()
    this.broadcastTimer = GLib.timeout_add(
      GLib.PRIORITY_DEFAULT,
      BROADCAST_INTERVAL_MS,
      sendAnnounce,
    )

    this.socket = socket
  }

  stopBroadcasting(): void {
    const { GLib } = imports.gi
    if (this.broadcastTimer) {
      GLib.source_remove(this.broadcastTimer)
      this.broadcastTimer = 0
    }
    if (this.ioWatch) {
      GLib.source_remove(this.ioWatch)
      this.ioWatch = 0
    }
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  getKnownPeers(): SyncPeer[] {
    return Array.from(this.peers.values())
  }
}
