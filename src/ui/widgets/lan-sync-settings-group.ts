import { createButton, createSwitchRow } from '../factory';
import { _t } from '../../domain/i18n';
import type { SyncPeer } from '../../services/sync-service';

const { Adw } = imports.gi;

export class LanSyncSettingsGroup {
  readonly group: AdwPreferencesGroup;
  private toggleHandler: ((enabled: boolean) => void) | null = null;
  private syncHandler: ((peer: SyncPeer) => void) | null = null;
  private exportHandler: ((peer: SyncPeer) => void) | null = null;
  private peers: SyncPeer[] = [];
  private peersRow: AdwActionRow;

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: _t('settings.lan-sync') });
    this.group.add_css_class('lan-sync-group');
    this.group.add(
      createSwitchRow({
        title: _t('settings.lan-discovery'),
        subtitle: _t('settings.lan-discovery.subtitle'),
        onToggle: (a) => this.toggleHandler?.(a),
      }),
    );
    this.peersRow = new Adw.ActionRow({ title: _t('settings.peer-library'), subtitle: _t('settings.no-peers') });
    this.group.add(this.peersRow);
    const mkRow = (title: string, label: string, cls: string | undefined, handler: () => void): void => {
      const b = createButton({ label, cssClass: cls, onClick: handler });
      const r = new Adw.ActionRow({ title });
      r.add_suffix(b);
      r.set_activatable_widget(b);
      this.group.add(r);
    };
    mkRow(_t('settings.import-from-peer'), _t('common.import'), 'suggested-action', () => {
      const p = this.peers[0];
      if (p) this.syncHandler?.(p);
    });
    mkRow(_t('settings.export-to-peer'), _t('common.export'), undefined, () => {
      const p = this.peers[0];
      if (p) this.exportHandler?.(p);
    });
  }

  setPeers(peers: SyncPeer[]): void {
    this.peers = peers;
    this.peersRow.set_subtitle(
      peers.length > 0 ? peers.map((p) => `${p.name}@${p.address}:${p.port}`).join(', ') : _t('settings.no-peers'),
    );
  }

  onLANSyncToggle(cb: (enabled: boolean) => void): void {
    this.toggleHandler = cb;
  }
  onSyncWithPeer(cb: (peer: SyncPeer) => void): void {
    this.syncHandler = cb;
  }
  onExportToPeer(cb: (peer: SyncPeer) => void): void {
    this.exportHandler = cb;
  }
}
