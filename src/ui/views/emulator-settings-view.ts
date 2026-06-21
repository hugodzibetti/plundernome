import { createSettingsPage } from '../templates/settings-page';
import { createEntryRow } from '../factory-widgets';

const { Gtk, Adw, GObject } = imports.gi;

export const EmulatorSettingsView = GObject.registerClass(
  { GTypeName: 'EmulatorSettingsView' },
  class EmulatorSettingsView extends Adw.Bin {
    constructor() {
      super();
      this.add_css_class('emulator-settings-view');
      const { page, container } = createSettingsPage();

      const genericGroup = new Adw.PreferencesGroup({ title: 'Generic' });
      genericGroup.add(
        createEntryRow({
          title: 'ROM Directory',
          subtitle: 'Default folder for ROM scanning',
          value: '',
          browseLabel: 'Browse',
          onChanged: () => {},
        }),
      );
      genericGroup.add(
        createEntryRow({
          title: 'BIOS Directory',
          subtitle: 'Folder containing BIOS/firmware files',
          value: '',
          browseLabel: 'Browse',
          onChanged: () => {},
        }),
      );
      genericGroup.add(
        createEntryRow({
          title: 'Launch Arguments',
          subtitle: 'Extra args passed to emulator',
          value: '',
          onChanged: () => {},
        }),
      );
      page.add(genericGroup);

      this.set_child(container);
    }
  },
);
