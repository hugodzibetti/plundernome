import { createButton } from '../factory'

const { Adw, Gtk } = imports.gi

export class LutrisSettingsGroup {
  readonly group: AdwPreferencesGroup
  private importHandler: (() => void) | null = null
  private statusLabel: GtkLabel

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: 'Lutris' })
    this.group.add_css_class('lutris-settings-group')

    const descRow = new Adw.ActionRow({ title: 'Import Lutris Library', subtitle: 'GOG, itch.io, custom Wine games' })
    this.statusLabel = new Gtk.Label({ label: '', xalign: 0, css_classes: ['dim-label'] })
    this.statusLabel.set_valign(Gtk.Align.CENTER)

    const importBtn = createButton({ label: 'Import', cssClass: 'suggested-action', onClick: () => this.importHandler?.() })
    descRow.add_suffix(importBtn)
    descRow.set_activatable_widget(importBtn)
    this.group.add(descRow)

    const statusRow = new Adw.ActionRow({ title: 'Last import' })
    statusRow.add_suffix(this.statusLabel)
    this.group.add(statusRow)

    this.group.set_visible(false)
  }

  onLutrisImport(cb: () => void): void {
    this.importHandler = cb
  }

  setStatus(text: string): void {
    this.statusLabel.set_label(text)
  }

  setInstalled(installed: boolean): void {
    this.group.set_visible(installed)
  }
}
