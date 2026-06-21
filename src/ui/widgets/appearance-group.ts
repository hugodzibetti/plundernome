import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings';
import { _t, setLocale, getCurrentLocale } from '../../domain/i18n';
import { availableLocales } from '../../domain/translations';

const { Adw, Gtk } = imports.gi;

export class AppearanceGroup {
  readonly group: AdwPreferencesGroup;

  constructor() {
    const s = new SettingsManager();
    this.group = new Adw.PreferencesGroup({ title: _t('settings.appearance') });
    this.group.add_css_class('appearance-group');

    const tRow = new Adw.ComboRow({
      title: _t('settings.theme'),
      selected: s.getInt(GSETTINGS_KEYS.COLOR_SCHEME),
      model: new Gtk.StringList({
        strings: [_t('settings.theme.system'), _t('settings.theme.light'), _t('settings.theme.dark')],
      }),
    });
    tRow.connect('notify::selected', () => {
      const v = tRow.get_selected();
      s.setInt(GSETTINGS_KEYS.COLOR_SCHEME, v);
      const cs: number[] = [Adw.ColorScheme.DEFAULT, Adw.ColorScheme.FORCE_LIGHT, Adw.ColorScheme.FORCE_DARK];
      Adw.StyleManager.get_default().set_color_scheme(cs[v] ?? Adw.ColorScheme.DEFAULT);
    });
    this.group.add(tRow);

    const lRow = new Adw.ComboRow({
      title: _t('settings.locale'),
      model: new Gtk.StringList({ strings: availableLocales.map((l) => l.name) }),
      selected: Math.max(
        0,
        availableLocales.findIndex((l) => l.code === getCurrentLocale()),
      ),
    });
    lRow.connect('notify::selected', () => {
      setLocale(availableLocales[lRow.get_selected()]?.code ?? 'en');
    });
    this.group.add(lRow);
  }
}
