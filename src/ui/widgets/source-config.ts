import type { SourceDefinition } from '../../domain/catalog/types';
import type { SourceHealth } from '../../services/types';

const { Gtk, Adw, GObject } = imports.gi;

export const SourceConfigRow = GObject.registerClass(
  {
    GTypeName: 'SourceConfigRow',
  },
  class SourceConfigRow extends Adw.ActionRow {
    private switchWidget: GtkSwitch;
    private healthDot: GtkLabel;
    private healthLatency: GtkLabel;

    constructor(source: SourceDefinition, initialHealth?: SourceHealth) {
      super();

      this.set_title(source.name);
      this.set_subtitle(source.baseUrl);
      this.add_css_class('source-item');

      const healthBox = new Gtk.Box({ spacing: 3, valign: Gtk.Align.CENTER });
      this.healthDot = new Gtk.Label({ label: '•', css_classes: ['health-badge'], valign: Gtk.Align.CENTER });
      this.healthLatency = new Gtk.Label({
        label: '',
        css_classes: ['caption', 'health-latency'],
        valign: Gtk.Align.CENTER,
      });
      healthBox.append(this.healthDot);
      healthBox.append(this.healthLatency);
      this.add_suffix(healthBox);

      this.switchWidget = new Gtk.Switch({
        active: source.enabled,
        valign: Gtk.Align.CENTER,
      });
      this.add_suffix(this.switchWidget);
      this.set_activatable_widget(this.switchWidget);

      this.switchWidget.connect('notify::active', () => {
        this.notify('enabled');
      });

      if (initialHealth) this.updateHealth(initialHealth);
    }

    get enabled(): boolean {
      return this.switchWidget.get_active();
    }

    setEnabled(val: boolean): void {
      this.switchWidget.set_active(val);
    }

    updateHealth(health: SourceHealth): void {
      for (const cls of ['health-up', 'health-slow', 'health-down']) this.healthDot.remove_css_class(cls);
      this.healthDot.add_css_class(`health-${health.status}`);
      const latency = health.latencyMs < 1000 ? `${health.latencyMs}ms` : `${(health.latencyMs / 1000).toFixed(1)}s`;
      this.healthLatency.set_label(health.status === 'down' ? 'down' : latency);
      this.healthDot.set_tooltip_text(`Last checked: ${health.lastChecked}`);
    }
  },
);
