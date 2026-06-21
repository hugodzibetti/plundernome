import { createButton } from '../factory';
import { _t } from '../../domain/i18n';

const { Adw } = imports.gi;

export class SteamSettingsGroup {
  readonly group: AdwPreferencesGroup;
  private scanHandler: (() => void) | null = null;

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: _t('settings.steam-integration') });
    this.group.add_css_class('steam-settings-group');

    const iBtn = createButton({
      label: _t('settings.scan-steam'),
      cssClass: 'suggested-action',
      onClick: () => this.scanHandler?.(),
    });
    const iRow = new Adw.ActionRow({
      title: _t('settings.import-games'),
      subtitle: _t('settings.import-games.subtitle'),
    });
    iRow.add_suffix(iBtn);
    iRow.set_activatable_widget(iBtn);
    this.group.add(iRow);
  }

  onSteamImport(cb: () => void): void {
    this.scanHandler = cb;
  }
}
