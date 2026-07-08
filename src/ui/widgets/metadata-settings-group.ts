const { Adw, Gtk } = imports.gi
import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings'
import { createButton } from '../factory'

function createEntryRow(title: string, value: string, onChange: (val: string) => void): AdwActionRow {
  const entry = new Gtk.Entry({ text: value, valign: Gtk.Align.CENTER, hexpand: true })
  entry.connect('changed', () => onChange(entry.get_text()))
  const row = new Adw.ActionRow({ title, activatable_widget: entry })
  row.add_suffix(entry)
  return row
}

export class MetadataSettingsGroup {
  readonly group: AdwPreferencesGroup

  constructor() {
    const s = new SettingsManager()
    this.group = new Adw.PreferencesGroup({ title: 'Metadata & Artwork' })
    this.group.add_css_class('metadata-settings-group')

    this.group.add(createEntryRow('IGDB Client ID', s.getString(GSETTINGS_KEYS.IGDB_CLIENT_ID),
      v => s.setString(GSETTINGS_KEYS.IGDB_CLIENT_ID, v)))
    this.group.add(createEntryRow('IGDB Client Secret', s.getString(GSETTINGS_KEYS.IGDB_CLIENT_SECRET),
      v => s.setString(GSETTINGS_KEYS.IGDB_CLIENT_SECRET, v)))
    this.group.add(createEntryRow('SteamGridDB API Key', s.getString(GSETTINGS_KEYS.STEAMGRIDDB_KEY),
      v => s.setString(GSETTINGS_KEYS.STEAMGRIDDB_KEY, v)))

    const { Gdk } = imports.gi
    const linkBtn = createButton({ label: 'Get IGDB credentials at api.igdb.com', onClick: () => {
      Gtk.show_uri(Gdk.Display.get_default(), 'https://api.igdb.com/', 0)
    }})
    linkBtn.add_css_class('metadata-settings-link')
    this.group.add(linkBtn)

    const note = new Gtk.Label({
      label: 'Without API keys, cover art uses SteamGridDB (no key needed for basic use)',
      xalign: 0, wrap: true,
    })
    note.add_css_class('caption')
    note.add_css_class('metadata-settings-note')
    this.group.add(note)
  }
}
