import type { SyncService, SyncPeer } from '../services/sync-service'
import type { ISettingsView, IWindow } from './view-interfaces'

export function wireLANSync(
  syncService: SyncService,
  settingsView: ISettingsView,
  window: IWindow
): void {
  syncService.onPeersUpdate(() => {
    settingsView.setPeers(syncService.getPeers())
  })
  settingsView.onLANSyncToggle(async (enabled: boolean) => {
    if (enabled) {
      await syncService.startLANDiscovery()
      window.showToast('LAN sync started')
    } else {
      syncService.stopLANDiscovery()
      window.showToast('LAN sync stopped')
    }
  })
  settingsView.onSyncWithPeer(async (peer: SyncPeer) => {
    const count = await syncService.syncWithPeer(peer)
    window.showToast(`Imported ${count} games from ${peer.name}`)
  })
  settingsView.onExportToPeer(async (peer: SyncPeer) => {
    const ok = await syncService.exportToPeer(peer)
    window.showToast(ok ? 'Library exported to peer' : 'Export failed')
  })
}
