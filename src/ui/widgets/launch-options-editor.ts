import type { GameID } from '../../domain/models'

import { createButton } from '../factory'

const { Gtk, Adw, GLib, GObject } = imports.gi

export function showLaunchOptionsEditor(
  gameId: GameID,
  initialEnv: Record<string, string>,
  initialArgs: string,
  onSave: (gameId: GameID, env: Record<string, string>, args: string) => void,
): void {
  const dialog = new Adw.Window({ title: 'Launch Options', modal: true, default_width: 500, default_height: 400 })
  dialog.add_css_class('launch-options-editor')

  const page = new Adw.PreferencesPage()

  const envGroup = new Adw.PreferencesGroup({
    title: 'Environment Variables',
    description: 'One KEY=VALUE per line',
  })
  const envBuffer = new Gtk.TextBuffer()
  envBuffer.set_text(Object.entries(initialEnv).map(([k, v]) => `${k}=${v}`).join('\n'))
  const envView = new Gtk.TextView({ buffer: envBuffer, monospace: true, hexpand: true, vexpand: true })
  envView.set_size_request(500, 150)

  const envClamp = new Adw.ClampScrollable()
  envClamp.set_child(envView)
  envGroup.add(envClamp)
  page.add(envGroup)

  const argsGroup = new Adw.PreferencesGroup({ title: 'Command-Line Arguments' })
  const argsEntry = new Gtk.Entry({ text: initialArgs, hexpand: true, placeholder_text: 'e.g. --windowed --nosound' })
  const argsRow = new Adw.ActionRow({ title: 'Arguments' })
  argsRow.add_suffix(argsEntry)
  argsRow.set_activatable_widget(argsEntry)
  argsGroup.add(argsRow)
  page.add(argsGroup)

  const prefixGroup = new Adw.PreferencesGroup({
    title: 'Wine Prefix',
    description: 'Each game has its own isolated prefix',
  })
  const prefixRow = new Adw.ActionRow({ title: 'Prefix Path' })
  const prefixLabel = new Gtk.Label({
    label: `${GLib.get_home_dir()}/.local/share/plundernome/prefixes/${gameId}`,
    xalign: 0,
    selectable: true,
  })
  prefixRow.add_suffix(prefixLabel)
  prefixGroup.add(prefixRow)
  page.add(prefixGroup)

  const toolbar = new Adw.ToolbarView()
  toolbar.set_content(page)
  const header = new Adw.HeaderBar()
  const saveBtn = createButton({ label: 'Save', cssClass: 'suggested-action', onClick: () => {
    const env: Record<string, string> = {}
    const text = envBuffer.get_text(envBuffer.get_start_iter(), envBuffer.get_end_iter(), false)
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx > 0) env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
    }
    onSave(gameId, env, argsEntry.get_text())
    dialog.close()
  }})
  header.pack_end(saveBtn)
  toolbar.add_top_bar(header)
  dialog.set_content(toolbar)
  dialog.present()
}
