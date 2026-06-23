import { _t } from '../../domain/i18n';
import { createButton, createSwitchRow } from '../factory';
import { buildJsonFilter } from '../filter-helpers';

const { Gtk, Adw } = imports.gi;

export class SettingsSourcesView {
  readonly group: AdwPreferencesGroup;
  private reloadHandler: (() => void) | null = null;
  private addHandler: ((path: string) => void) | null = null;
  private toggleHandler: ((sourceId: string, enabled: boolean) => void) | null = null;
  private sourceRows = new Map<string, AdwActionRow>();

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: _t('settings.source-management') });
    this.group.add_css_class('settings-sources-group');

    const reloadBtn = createButton({
      iconName: 'view-refresh-symbolic',
      label: _t('settings.reload-sources'),
      onClick: () => this.reloadHandler?.(),
    });
    const addBtn = createButton({
      iconName: 'list-add-symbolic',
      label: _t('settings.add-source'),
      onClick: () => {
        const picker = new Gtk.FileChooserNative({
          action: Gtk.FileChooserAction.OPEN,
          title: _t('settings.add-source'),
          transient_for: this.group.get_root() as GtkWidget,
        });
        picker.add_filter(buildJsonFilter());
        picker.connect('response', (_d: unknown, response: number) => {
          if (response === Gtk.ResponseType.ACCEPT) {
            const path = picker.get_file()?.get_path() ?? '';
            if (path) this.addHandler?.(path);
          }
        });
        picker.present();
      },
    });

    const btnBox = new Gtk.Box({ spacing: 6 });
    btnBox.append(reloadBtn);
    btnBox.append(addBtn);
    const actionRow = new Adw.ActionRow({ title: '' });
    actionRow.add_suffix(btnBox);
    this.group.add(actionRow);
  }

  setUserSources(sources: Array<{ id: string; path: string; enabled: boolean }>): void {
    for (const [, row] of this.sourceRows) {
      this.group.remove(row);
    }
    this.sourceRows.clear();

    for (const s of sources) {
      const row = createSwitchRow({
        title: s.id,
        subtitle: s.path,
        active: s.enabled,
        onToggle: (active) => this.toggleHandler?.(s.id, active),
      });
      this.group.add(row);
      this.sourceRows.set(s.id, row);
    }
  }

  onReloadSources(cb: () => void): void {
    this.reloadHandler = cb;
  }
  onAddSource(cb: (path: string) => void): void {
    this.addHandler = cb;
  }
  onToggleSource(cb: (sourceId: string, enabled: boolean) => void): void {
    this.toggleHandler = cb;
  }
}
