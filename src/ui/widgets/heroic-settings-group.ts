import { createButton } from '../factory';
import { _t } from '../../domain/i18n';

const { Adw, Gtk } = imports.gi;

export class HeroicSettingsGroup {
  readonly group: AdwPreferencesGroup;
  private importHandler: (() => void) | null = null;
  private statusLabel: GtkLabel;

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: 'Heroic Games Launcher' });
    this.group.add_css_class('heroic-settings-group');

    this.statusLabel = new Gtk.Label({
      label: '',
      halign: Gtk.Align.START,
      css_classes: ['dim-label'],
    });

    const iBtn = createButton({
      label: 'Import Heroic Library',
      cssClass: 'suggested-action',
      onClick: () => this.importHandler?.(),
    });

    const iRow = new Adw.ActionRow({
      title: 'Import Epic & GOG games',
      subtitle: 'Import games from Heroic Games Launcher',
    });
    iRow.add_suffix(iBtn);
    iRow.set_activatable_widget(iBtn);
    this.group.add(iRow);

    const statusRow = new Adw.ActionRow({ title: 'Status' });
    statusRow.add_suffix(this.statusLabel);
    statusRow.set_activatable_widget(this.statusLabel);
    this.group.add(statusRow);
  }

  setImportResult(count: number): void {
    this.statusLabel.set_label(`Imported ${count} games`);
  }

  setError(message: string): void {
    this.statusLabel.set_label(`Error: ${message}`);
  }

  onHeroicImport(cb: () => void): void {
    this.importHandler = cb;
  }
}
