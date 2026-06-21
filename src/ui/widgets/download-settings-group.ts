import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings';
import { SPEED_PRESETS } from '../../domain/queue';
import { createButton, createSwitchRow, createSpinRow } from '../factory';
import { _t } from '../../domain/i18n';

const { Gtk, Adw, GLib } = imports.gi;

function getParent(w: AdwPreferencesGroup): GtkWidget {
  return w.get_root() as GtkWidget;
}

export class DownloadSettingsGroup {
  readonly group: AdwPreferencesGroup;

  constructor() {
    const s = new SettingsManager();
    this.group = new Adw.PreferencesGroup({ title: _t('settings.downloads') });
    this.group.add_css_class('download-settings-group');

    const dlRow = new Adw.ActionRow({
      title: _t('settings.download-dir'),
      subtitle: s.getString(GSETTINGS_KEYS.INSTALL_PATH),
    });
    const dlBtn = createButton({
      label: _t('common.browse'),
      onClick: () => {
        const p = new Gtk.FileChooserNative({
          action: Gtk.FileChooserAction.SELECT_FOLDER,
          title: _t('settings.select-download-dir'),
          transient_for: getParent(this.group),
        });
        p.connect('response', (_d: unknown, r: number) => {
          if (r === Gtk.ResponseType.ACCEPT) {
            const path = p.get_file()?.get_path() ?? GLib.get_home_dir();
            dlRow.set_subtitle(path);
            s.setString(GSETTINGS_KEYS.INSTALL_PATH, path);
          }
        });
        p.present();
      },
    });
    dlRow.add_suffix(dlBtn);
    dlRow.set_activatable_widget(dlBtn);
    this.group.add(dlRow);

    this.group.add(
      createSpinRow({
        title: _t('settings.max-concurrent'),
        value: s.getInt(GSETTINGS_KEYS.DOWNLOAD_CONCURRENCY),
        min: 1,
        max: 10,
        step: 1,
        onChanged: (v) => s.setInt(GSETTINGS_KEYS.DOWNLOAD_CONCURRENCY, v),
      }),
    );

    const spdIdx = Math.max(
      0,
      SPEED_PRESETS.findIndex((p) => p.value === s.getInt(GSETTINGS_KEYS.SPEED_LIMIT)),
    );
    const sRow = new Adw.ComboRow({
      title: _t('settings.speed-limit'),
      subtitle: SPEED_PRESETS[spdIdx]?.label ?? _t('settings.unlimited'),
      model: new Gtk.StringList({ strings: SPEED_PRESETS.map((p) => p.label) }),
      selected: spdIdx,
    });
    sRow.connect('notify::selected', () => {
      const p = SPEED_PRESETS[sRow.get_selected()];
      s.setInt(GSETTINGS_KEYS.SPEED_LIMIT, p?.value ?? 0);
      sRow.set_subtitle(p?.label ?? _t('settings.unlimited'));
    });
    this.group.add(sRow);

    this.group.add(
      createSwitchRow({
        title: _t('settings.adaptive-concurrency'),
        subtitle: _t('settings.adaptive-concurrency.subtitle'),
        active: s.getBool(GSETTINGS_KEYS.ADAPTIVE_CONCURRENCY),
        onToggle: (a) => s.setBool(GSETTINGS_KEYS.ADAPTIVE_CONCURRENCY, a),
      }),
    );
  }
}
