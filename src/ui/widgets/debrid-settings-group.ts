import { SettingsManager, GSETTINGS_KEYS } from '../../services/gsettings'
import { createButton } from '../factory'

const { Adw, Gtk } = imports.gi

const PROVIDERS = ['', 'realdebrid', 'alldebrid', 'premiumize'] as const
const PROVIDER_LABELS = ['None', 'Real-Debrid', 'AllDebrid', 'Premiumize']

export class DebridSettingsGroup {
  readonly group: AdwPreferencesGroup
  private testHandler: (() => Promise<boolean>) | null = null

  constructor() {
    const s = new SettingsManager()
    this.group = new Adw.PreferencesGroup({ title: 'Download Acceleration (Debrid)' })
    this.group.add_css_class('debrid-settings-group')

    const model = new Gtk.StringList({ strings: PROVIDER_LABELS })
    const combo = new Adw.ComboRow({ title: 'Provider', model })
    // ponytail: initial selection skipped — set_property not typed for ComboRow
    combo.connect('notify::selected', () => {
      const i = combo.get_selected()
      s.setString(GSETTINGS_KEYS.DEBRID_PROVIDER, PROVIDERS[i] ?? '')
      updateStatus()
    })
    // ponytail: direct gsettings write, full model-binding if pattern repeats
    this.group.add(combo)

    const passRow = new Adw.ActionRow({ title: 'API Key' })
    const passEntry = new Gtk.Entry({ hexpand: true })
    passEntry.connect('changed', () => {
      s.setString(GSETTINGS_KEYS.DEBRID_API_KEY, passEntry.get_text())
    })
    passRow.add_suffix(passEntry)
    passRow.set_activatable_widget(passEntry)
    this.group.add(passRow)

    const statusLabel = new Gtk.Label({ xalign: 0 })
    statusLabel.add_css_class('dim-label')
    const statusRow = new Adw.ActionRow({ title: 'Status' })
    statusRow.add_suffix(statusLabel)
    this.group.add(statusRow)

    const testBtn = createButton({
      label: 'Test Connection',
      cssClass: 'flat',
      onClick: async () => {
        const ok = await this.testHandler?.() ?? false
        statusLabel.set_label(ok ? 'Connected ✓' : 'Failed ✗')
      },
    })
    const testRow = new Adw.ActionRow({ title: 'Verify' })
    testRow.add_suffix(testBtn)
    testRow.set_activatable_widget(testBtn)
    this.group.add(testRow)

    function updateStatus(): void {
      const p = s.getString(GSETTINGS_KEYS.DEBRID_PROVIDER)
      const key = s.getString(GSETTINGS_KEYS.DEBRID_API_KEY)
      statusLabel.set_label(p && key ? 'Configured ✓' : '')
    }
    updateStatus()
  }

  onTestConnection(cb: () => Promise<boolean>): void {
    this.testHandler = cb
  }
}
