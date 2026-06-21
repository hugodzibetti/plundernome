import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings';
import { createEntryRow } from '../factory';
import { _t } from '../../domain/i18n';

const { Gtk, Adw } = imports.gi;

function getParent(w: AdwPreferencesGroup): GtkWidget {
  return w.get_root() as GtkWidget;
}

export class WineSettingsGroup {
  readonly group: AdwPreferencesGroup;

  constructor() {
    const s = new SettingsManager();
    this.group = new Adw.PreferencesGroup({ title: _t('settings.paths') });
    this.group.add_css_class('wine-settings-group');

    const wRow = createEntryRow({
      title: _t('settings.wine-path'),
      subtitle: s.getString(GSETTINGS_KEYS.WINE_PATH) || '/usr/bin/wine',
      value: s.getString(GSETTINGS_KEYS.WINE_PATH),
      placeholder: '/usr/bin/wine',
      browseLabel: _t('common.browse'),
      onChanged: (t) => {
        s.setString(GSETTINGS_KEYS.WINE_PATH, t);
        wRow.set_subtitle(t || '/usr/bin/wine');
      },
      onBrowse: () => {
        const p = new Gtk.FileChooserNative({
          action: Gtk.FileChooserAction.OPEN,
          title: _t('settings.select-wine-binary'),
          transient_for: getParent(this.group),
        });
        p.connect('response', (_d: unknown, r: number) => {
          if (r === Gtk.ResponseType.ACCEPT) {
            const path = p.get_file()?.get_path() ?? '';
            s.setString(GSETTINGS_KEYS.WINE_PATH, path);
            wRow.set_subtitle(path || '/usr/bin/wine');
          }
        });
        p.present();
      },
    });
    this.group.add(wRow);
  }
}
