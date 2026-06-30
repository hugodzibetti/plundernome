import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings'
import { createEntryRow } from '../factory'

const { Adw, Gtk } = imports.gi

export class CloudSaveSettingsGroup {
  readonly group: AdwPreferencesGroup

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: 'Cloud Saves' })
    this.group.add_css_class('cloud-save-settings-group')

    const toggleRow = new Adw.ActionRow({
      title: 'Enable automatic cloud saves',
      subtitle: 'Back up saves to WebDAV when game exits',
    })
    const toggle = new Gtk.Switch({ active: false, valign: Gtk.Align.CENTER })
    toggleRow.add_suffix(toggle)
    toggleRow.set_activatable_widget(toggle)
    toggle.connect('notify::active', () => {
      new SettingsManager().setBool(GSETTINGS_KEYS.CLOUD_SAVE_ENABLED, toggle.get_active())
    })
    this.group.add(toggleRow)

    const urlRow = createEntryRow({
      title: 'WebDAV URL',
      value: '',
      onChanged: (text: string) => new SettingsManager().setString(GSETTINGS_KEYS.WEBDAV_URL, text),
    })
    this.group.add(urlRow)

    const userRow = createEntryRow({
      title: 'Username',
      value: '',
      onChanged: (text: string) => new SettingsManager().setString(GSETTINGS_KEYS.WEBDAV_USERNAME, text),
    })
    this.group.add(userRow)

    const passRow = new Adw.ActionRow({ title: 'Password' })
    const passEntry = new Gtk.Entry({ visibility: false, hexpand: true })
    passEntry.connect('changed', () => {
      new SettingsManager().setString(GSETTINGS_KEYS.WEBDAV_PASSWORD, passEntry.get_text())
    })
    passRow.add_suffix(passEntry)
    passRow.set_activatable_widget(passEntry)
    this.group.add(passRow)

    const statusRow = new Adw.ActionRow({
      title: 'Save tool',
      subtitle: 'Ludusavi detected \u2713',
    })
    this.group.add(statusRow)

    const s = new SettingsManager()
    toggle.set_active(s.getBool(GSETTINGS_KEYS.CLOUD_SAVE_ENABLED))
  }
}
