import { _t } from '../../domain/i18n'
import { createButton } from '../factory'

const { Gtk, Adw } = imports.gi

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
}

function buildJsonFilter(): FilterHandle {
  const f = new (Gtk as unknown as { FileFilter: new () => FilterHandle }).FileFilter()
  f.set_name('JSON Files (*.json)')
  f.add_pattern('*.json')
  return f
}

export class SettingsSourcesView {
  readonly group: AdwPreferencesGroup
  private reloadHandler: (() => void) | null = null
  private addHandler: ((path: string) => void) | null = null
  private toggleHandler: ((sourceId: string, enabled: boolean) => void) | null = null
  private sourceRows = new Map<string, { row: AdwActionRow; sw: GtkSwitch }>()

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: _t('settings.source-management') })
    this.group.add_css_class('settings-sources-group')

    const reloadBtn = createButton({
      iconName: 'view-refresh-symbolic',
      label: _t('settings.reload-sources'),
      onClick: () => this.reloadHandler?.(),
    })
    const addBtn = createButton({
      iconName: 'list-add-symbolic',
      label: _t('settings.add-source'),
      onClick: () => {
        const parent = this.group.get_root() as unknown as GtkWidget
        const picker = new Gtk.FileChooserNative({
          action: Gtk.FileChooserAction.OPEN,
          title: _t('settings.add-source'),
          transient_for: parent,
        }) as unknown as PickerHandle
        picker.add_filter(buildJsonFilter())
        picker.connect('response', (_d: unknown, response: number) => {
          if (response === Gtk.ResponseType.ACCEPT) {
            const path = picker.get_file()?.get_path() ?? ''
            if (path) this.addHandler?.(path)
          }
        })
        picker.present()
      },
    })

    const btnBox = new Gtk.Box({ spacing: 6 })
    btnBox.append(reloadBtn)
    btnBox.append(addBtn)
    const actionRow = new Adw.ActionRow({ title: '' })
    actionRow.add_suffix(btnBox)
    this.group.add(actionRow)
  }

  setUserSources(sources: Array<{ id: string; path: string; enabled: boolean }>): void {
    const lb = this.group as unknown as GtkListBox
    for (const [, entry] of this.sourceRows) {
      lb.remove(entry.row)
    }
    this.sourceRows.clear()

    for (const s of sources) {
      const sw = new Gtk.Switch({ active: s.enabled, valign: Gtk.Align.CENTER })
      const row = new Adw.ActionRow({ title: s.id, subtitle: s.path })
      row.add_suffix(sw)
      row.set_activatable_widget(sw)
      this.group.add(row)
      this.sourceRows.set(s.id, { row, sw })

      const id = s.id
      sw.connect('notify::active', () => {
        this.toggleHandler?.(id, sw.get_active())
      })
    }
  }

  onReloadSources(cb: () => void): void { this.reloadHandler = cb }
  onAddSource(cb: (path: string) => void): void { this.addHandler = cb }
  onToggleSource(cb: (sourceId: string, enabled: boolean) => void): void { this.toggleHandler = cb }
}
