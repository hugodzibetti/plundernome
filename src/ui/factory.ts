const { Gtk, Adw } = imports.gi

export function createButton(props: {
  iconName?: string
  label?: string
  tooltip?: string
  cssClass?: string
  onClick: () => void
}): GtkButton {
  const btnProps: Record<string, unknown> = {}
  if (props.iconName) btnProps.icon_name = props.iconName
  if (props.label) btnProps.label = props.label
  if (props.tooltip) btnProps.tooltip_text = props.tooltip
  const btn = new Gtk.Button(btnProps)
  if (props.cssClass) btn.add_css_class(props.cssClass)
  if (props.iconName && !props.label) btn.add_css_class('action-button')
  btn.connect('clicked', props.onClick)
  return btn
}

export function createToggleButton(props: {
  iconName?: string
  label?: string
  tooltip?: string
  cssClass?: string
  group?: GtkToggleButton
  active?: boolean
  onToggle: (active: boolean) => void
}): GtkToggleButton {
  const btnProps: Record<string, unknown> = {}
  if (props.iconName) btnProps.icon_name = props.iconName
  if (props.label) btnProps.label = props.label
  if (props.tooltip) btnProps.tooltip_text = props.tooltip
  const btn = new Gtk.ToggleButton(btnProps)
  if (props.cssClass) btn.add_css_class(props.cssClass)
  if (props.iconName && !props.label) btn.add_css_class('action-button')
  if (props.group) btn.set_group(props.group)
  if (props.active) btn.set_active(true)
  btn.connect('toggled', () => { if (btn.get_active()) props.onToggle(true) })
  return btn
}

export function createIconLabel(text: string, cssClass = ''): GtkLabel {
  const lbl = new Gtk.Label({ label: text, xalign: 0 })
  lbl.add_css_class('icon-label')
  if (cssClass) lbl.add_css_class(cssClass)
  return lbl
}

export function createSwitchRow(props: {
  title: string
  subtitle?: string
  active?: boolean
  onToggle?: (active: boolean) => void
}): AdwActionRow {
  const sw = new Gtk.Switch({ active: props.active ?? false, valign: Gtk.Align.CENTER })
  if (props.onToggle) {
    sw.connect('notify::active', () => props.onToggle!(sw.get_active()))
  }
  const rowProps: Record<string, unknown> = { title: props.title }
  if (props.subtitle) rowProps.subtitle = props.subtitle
  const row = new Adw.ActionRow(rowProps)
  row.add_suffix(sw)
  row.set_activatable_widget(sw)
  return row
}

export function createActionRow(props: {
  title: string
  subtitle?: string
  suffix?: GtkWidget | GtkWidget[]
  activatable?: boolean
}): AdwActionRow {
  const rowProps: Record<string, unknown> = { title: props.title }
  if (props.subtitle) rowProps.subtitle = props.subtitle
  const row = new Adw.ActionRow(rowProps)
  if (props.suffix) {
    const widgets = Array.isArray(props.suffix) ? props.suffix : [props.suffix]
    for (const w of widgets) {
      w.add_css_class('action-row-suffix')
      row.add_suffix(w)
    }
  }
  if (props.activatable && props.suffix) {
    const first = Array.isArray(props.suffix) ? props.suffix[0] : props.suffix
    row.set_activatable_widget(first)
  }
  return row
}

export function createAlertDialog(props: {
  heading: string
  body?: string
  cancelLabel?: string
  confirmLabel: string
  confirmStyle?: 'destructive' | 'suggested'
  onConfirm: () => void
  onCancel?: () => void
  parent?: GtkWidget
}): void {
  const dialogProps: Record<string, unknown> = { heading: props.heading, close_response: 'cancel' }
  if (props.parent) dialogProps.transient_for = props.parent
  if (props.body) dialogProps.body = props.body
  const dialog = new Adw.MessageDialog(dialogProps)
  dialog.add_response('cancel', props.cancelLabel ?? 'Cancel')
  dialog.add_response('confirm', props.confirmLabel)
  if (props.confirmStyle) dialog.set_response_appearance('confirm', Adw.ResponseAppearance[props.confirmStyle.toUpperCase() as keyof typeof Adw.ResponseAppearance])
  dialog.connect('response', (_d: unknown, resp: string) => {
    if (resp === 'confirm') props.onConfirm()
    else props.onCancel?.()
    dialog.destroy()
  })
  dialog.present()
}

export function createFilePicker(props: {
  action: 'open' | 'select-folder'
  title: string
  parent: GtkWidget
  onSelect: (path: string) => void
}): void {
  const picker = new Gtk.FileChooserNative({
    action: props.action === 'open' ? Gtk.FileChooserAction.OPEN : Gtk.FileChooserAction.SELECT_FOLDER,
    title: props.title,
    transient_for: props.parent,
  })
  picker.connect('response', (_d: unknown, response: number) => {
    if (response === Gtk.ResponseType.ACCEPT) {
      const path = picker.get_file()?.get_path() ?? ''
      props.onSelect(path)
    }
  })
  picker.present()
}

export { createEntryRow, createSpinRow, createDetailDialog, createCoverImage, createMenuPopover } from './factory-widgets'
