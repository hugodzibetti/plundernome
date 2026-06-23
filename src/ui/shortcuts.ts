import { _t } from '../domain/i18n';
import type { ICatalogView } from '../controller/view-interfaces';

const { Gtk, Adw } = imports.gi;

interface WindowWithNav {
  add_controller(ctrl: unknown): void;
  navigateTo?(viewId: string): void;
}

export function setupWindowShortcuts(win: WindowWithNav, stack: GtkStack): void {
  const controller = new Gtk.ShortcutController();
  controller.set_scope(Gtk.ShortcutScope.GLOBAL);

  controller.add_shortcut(
    new Gtk.Shortcut({
      trigger: Gtk.ShortcutTrigger.parse_string('<Control>f'),
      action: new Gtk.CallbackAction(() => {
        const catalogView = stack.get_child_by_name('catalog') as ICatalogView | null;
        catalogView?.focusSearch?.();
        return true;
      }),
    }),
  );

  controller.add_shortcut(
    new Gtk.Shortcut({
      trigger: Gtk.ShortcutTrigger.parse_string('Escape'),
      action: new Gtk.CallbackAction(() => {
        const catalogView = stack.get_child_by_name('catalog') as ICatalogView | null;
        if (catalogView?.closeSearch?.()) return true;
        return false;
      }),
    }),
  );

  controller.add_shortcut(
    new Gtk.Shortcut({
      trigger: Gtk.ShortcutTrigger.parse_string('<Control>question'),
      action: new Gtk.CallbackAction(() => {
        const sw = new Adw.ShortcutsWindow();
        const nav = new Adw.ShortcutsSection({ title: _t('shortcuts.navigation') });
        nav.add_shortcut(new Adw.ShortcutsShortcut({ title: _t('shortcuts.search'), accelerator: '<Control>F' }));
        nav.add_shortcut(new Adw.ShortcutsShortcut({ title: _t('shortcuts.close-search'), accelerator: 'Escape' }));
        sw.add(nav);
        const views = new Adw.ShortcutsSection({ title: _t('shortcuts.views') });
        views.add_shortcut(new Adw.ShortcutsShortcut({ title: _t('shortcuts.catalog'), accelerator: '<Control>1' }));
        views.add_shortcut(new Adw.ShortcutsShortcut({ title: _t('shortcuts.downloads'), accelerator: '<Control>2' }));
        views.add_shortcut(new Adw.ShortcutsShortcut({ title: _t('shortcuts.library'), accelerator: '<Control>3' }));
        views.add_shortcut(new Adw.ShortcutsShortcut({ title: _t('shortcuts.settings'), accelerator: '<Control>4' }));
        sw.add(views);
        sw.present();
        return true;
      }),
    }),
  );

  const NAV_KEYS = ['1', '2', '3', '4'];
  const NAV_VIEWS = ['catalog', 'downloads', 'library', 'settings'];
  for (let i = 0; i < 4; i++) {
    controller.add_shortcut(
      new Gtk.Shortcut({
        trigger: Gtk.ShortcutTrigger.parse_string(`<Control>${NAV_KEYS[i]!}`),
        action: new Gtk.CallbackAction(() => {
          win.navigateTo?.(NAV_VIEWS[i]!);
          return true;
        }),
      }),
    );
  }

  win.add_controller(controller);
}
