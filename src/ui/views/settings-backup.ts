import { _t } from '../../domain/i18n'
import { createButton } from '../factory'

const { Gtk, Adw } = imports.gi

const FILE_CHOOSER_SAVE = 1

type FilterHandle = {
  set_name(s: string): void
  add_pattern(s: string): void
}

type PickerHandle = {
  add_filter(f: FilterHandle): void
  set_current_name(s: string): void
  get_file(): { get_path(): string | null } | null
  present(): void
  connect(signal: string, cb: (_d: unknown, response: number) => void): number
  destroy(): void
}

function buildJsonFilter(): FilterHandle {
  const f = new (Gtk as unknown as { FileFilter: new () => FilterHandle }).FileFilter()
  f.set_name('JSON Files (*.json)')
  f.add_pattern('*.json')
  return f
}

export class SettingsBackupView {
  readonly group: AdwPreferencesGroup
  private exportHandler: ((path: string) => void) | null = null
  private importHandler: ((path: string) => void) | null = null
  private statusLabel: GtkLabel

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: _t('settings.backup') })
    this.group.add_css_class('settings-backup-group')

    const exportBtn = createButton({
      label: _t('settings.export-library'),
      onClick: () => {
        const parent = this.group.get_root() as unknown as GtkWidget
        const picker = new Gtk.FileChooserNative({
          action: FILE_CHOOSER_SAVE,
          title: _t('settings.export-library'),
          transient_for: parent,
        }) as unknown as PickerHandle
        picker.add_filter(buildJsonFilter())
        picker.set_current_name('plundernome-backup.json')
        picker.connect('response', (_d: unknown, response: number) => {
          if (response === Gtk.ResponseType.ACCEPT) {
            const path = picker.get_file()?.get_path() ?? ''
            if (path) this.exportHandler?.(path)
          }
        })
        picker.present()
      },
    })

    const importBtn = createButton({
      label: _t('settings.import-library'),
      onClick: () => {
        const parent = this.group.get_root() as unknown as GtkWidget
        const picker = new Gtk.FileChooserNative({
          action: Gtk.FileChooserAction.OPEN,
          title: _t('settings.import-library'),
          transient_for: parent,
        }) as unknown as PickerHandle
        picker.add_filter(buildJsonFilter())
        picker.connect('response', (_d: unknown, response: number) => {
          if (response === Gtk.ResponseType.ACCEPT) {
            const path = picker.get_file()?.get_path() ?? ''
            if (path) this.importHandler?.(path)
          }
        })
        picker.present()
      },
    })

    const exportRow = new Adw.ActionRow({ title: _t('settings.export-library') })
    exportRow.add_suffix(exportBtn)
    exportRow.set_activatable_widget(exportBtn)
    this.group.add(exportRow)

    const importRow = new Adw.ActionRow({ title: _t('settings.import-library') })
    importRow.add_suffix(importBtn)
    importRow.set_activatable_widget(importBtn)
    this.group.add(importRow)

    this.statusLabel = new Gtk.Label({ label: '', xalign: 0, css_classes: ['caption'] })
    const statusBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
    statusBox.append(this.statusLabel)
    this.group.add(statusBox)
  }

  onExportLibrary(cb: (path: string) => void): void { this.exportHandler = cb }
  onImportLibrary(cb: (path: string) => void): void { this.importHandler = cb }
  setBackupStatus(text: string): void { this.statusLabel.set_label(text) }
}
