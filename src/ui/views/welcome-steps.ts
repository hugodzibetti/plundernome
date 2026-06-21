import { SOURCE_DEFINITIONS } from '../../sources'
import { createButton } from '../factory'
import { createGridContent } from '../templates'
import { _t } from '../../domain/i18n'

const { Gtk, Adw } = imports.gi

export function buildWelcomeHeader(): GtkBox {
  const headerBox = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 })
  const icon = new Gtk.Image({ icon_name: 'applications-games-symbolic', pixel_size: 64 })
  icon.add_css_class('welcome-icon')
  headerBox.append(icon)
  const title = new Gtk.Label({ label: _t('welcome.title'), xalign: 0 })
  title.add_css_class('title-1')
  headerBox.append(title)
  const subtitle = new Gtk.Label({ label: _t('welcome.subtitle'), xalign: 0, wrap: true })
  subtitle.add_css_class('welcome-subtitle')
  headerBox.append(subtitle)
  return headerBox
}

export function buildSourcesGroup(
  onToggle: () => void,
): { group: AdwPreferencesGroup; checkboxes: Map<string, GtkCheckButton> } {
  const checkboxes = new Map<string, GtkCheckButton>()
  const sourceGrid = createGridContent()
  sourceGrid.set_max_children_per_line(2)
  sourceGrid.set_min_children_per_line(1)
  sourceGrid.add_css_class('welcome-source-grid')
  for (const src of SOURCE_DEFINITIONS) {
    const check = new Gtk.CheckButton({ label: src.name, active: src.enabled })
    check.connect('toggled', () => onToggle())
    checkboxes.set(src.id, check)
    const chip = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 })
    chip.add_css_class('welcome-source-chip')
    chip.append(check)
    sourceGrid.append(chip)
  }
  const group = new Adw.PreferencesGroup({ title: _t('welcome.step1') })
  group.add(sourceGrid)
  return { group, checkboxes }
}

export function buildDirGroup(
  dlDir: string,
  onBrowse: () => void,
): { group: AdwPreferencesGroup; row: AdwActionRow } {
  const row = new Adw.ActionRow({ title: _t('welcome.download-folder'), subtitle: dlDir })
  const browseBtn = createButton({ label: `${_t('common.browse')}\u2026`, onClick: () => onBrowse() })
  row.add_suffix(browseBtn)
  row.set_activatable_widget(browseBtn)
  const group = new Adw.PreferencesGroup({ title: _t('welcome.step2') })
  group.add(row)
  return { group, row }
}

export function buildWineGroup(
  winePath: string,
  onDetect: () => void,
  onBrowse: () => void,
): { group: AdwPreferencesGroup; row: AdwActionRow } {
  const row = new Adw.ActionRow({ title: _t('welcome.wine-binary'), subtitle: winePath || _t('welcome.wine-auto') })
  const detectBtn = createButton({ label: _t('welcome.auto-detect'), onClick: () => onDetect() })
  row.add_suffix(detectBtn)
  const wineBrowseBtn = createButton({ label: `${_t('common.browse')}\u2026`, onClick: () => onBrowse() })
  row.add_suffix(wineBrowseBtn)
  const group = new Adw.PreferencesGroup({ title: _t('welcome.step3') })
  group.add(row)
  return { group, row }
}

export function createGetStartedButton(onClick: () => void): GtkButton {
  const btn = createButton({
    label: _t('welcome.get-started'),
    cssClass: 'suggested-action',
    onClick: () => onClick(),
  })
  btn.set_halign(Gtk.Align.CENTER)
  return btn
}
