import { _t } from '../../domain/i18n';
import type { GameID } from '../../domain/models';

import { createButton } from '../factory';

const { Gtk, Adw, GLib, GObject } = imports.gi;

export function showLaunchOptionsEditor(
  gameId: GameID,
  initialEnv: Record<string, string>,
  initialArgs: string,
  onSave: (gameId: GameID, env: Record<string, string>, args: string) => void,
): void {
  const dialog = new Adw.Window({
    title: _t('launch-options.title'),
    modal: true,
    default_width: 500,
    default_height: 400,
  });
  dialog.add_css_class('launch-options-editor');

  const page = new Adw.PreferencesPage();

  const envGroup = new Adw.PreferencesGroup({
    title: _t('launch-options.env-vars'),
    description: _t('launch-options.env-vars-desc'),
  });
  const envBuffer = new Gtk.TextBuffer();
  envBuffer.set_text(
    Object.entries(initialEnv)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
  const envView = new Gtk.TextView({ buffer: envBuffer, monospace: true, hexpand: true, vexpand: true });
  envView.add_css_class('sizing-editor');

  const envClamp = new Adw.ClampScrollable();
  envClamp.set_child(envView);
  envGroup.add(envClamp);
  page.add(envGroup);

  const argsGroup = new Adw.PreferencesGroup({ title: _t('launch-options.args') });
  const argsEntry = new Gtk.Entry({
    text: initialArgs,
    hexpand: true,
    placeholder_text: _t('launch-options.args-placeholder'),
  });
  const argsRow = new Adw.ActionRow({ title: _t('launch-options.arguments') });
  argsRow.add_suffix(argsEntry);
  argsRow.set_activatable_widget(argsEntry);
  argsGroup.add(argsRow);
  page.add(argsGroup);

  const prefixGroup = new Adw.PreferencesGroup({
    title: _t('launch-options.wine-prefix'),
    description: _t('launch-options.prefix-desc'),
  });
  const prefixRow = new Adw.ActionRow({ title: _t('launch-options.prefix-path') });
  const prefixLabel = new Gtk.Label({
    label: `${GLib.get_home_dir()}/.local/share/plundernome/prefixes/${gameId}`,
    xalign: 0,
    selectable: true,
  });
  prefixRow.add_suffix(prefixLabel);
  prefixGroup.add(prefixRow);
  page.add(prefixGroup);

  const toolbar = new Adw.ToolbarView();
  toolbar.set_content(page);
  const header = new Adw.HeaderBar();
  const saveBtn = createButton({
    label: _t('common.save'),
    cssClass: 'suggested-action',
    onClick: () => {
      const env: Record<string, string> = {};
      const text = envBuffer.get_text(envBuffer.get_start_iter(), envBuffer.get_end_iter(), false);
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1);
      }
      onSave(gameId, env, argsEntry.get_text());
      dialog.close();
    },
  });
  header.pack_end(saveBtn);
  toolbar.add_top_bar(header);
  dialog.set_content(toolbar);
  dialog.present();
}
