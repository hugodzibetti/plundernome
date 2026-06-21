import type { SourceDefinition } from '../../domain/catalog/types'
import type { SourceHealth } from '../../services/types'

const { Gtk, GObject } = imports.gi

export const SourceConfigRow = GObject.registerClass({
  GTypeName: 'SourceConfigRow',
}, class SourceConfigRow extends imports.gi.Adw.ActionRow {
  private switchWidget: GtkSwitch
  private healthDot: GtkLabel
  private healthLatency: GtkLabel

  constructor(source: SourceDefinition, initialHealth?: SourceHealth) {
    super()

    this.set_title(source.name)
    this.set_subtitle(source.baseUrl)
    this.add_css_class('source-item')

    const healthBox = new Gtk.Box({ spacing: 3, valign: Gtk.Align.CENTER })
    this.healthDot = new Gtk.Label({ label: '•', css_classes: ['health-badge'], valign: Gtk.Align.CENTER })
    this.healthLatency = new Gtk.Label({ label: '', css_classes: ['caption', 'health-latency'], valign: Gtk.Align.CENTER })
    healthBox.append(this.healthDot)
    healthBox.append(this.healthLatency)
    this.add_suffix(healthBox)

    this.switchWidget = new Gtk.Switch({
      active: source.enabled,
      valign: Gtk.Align.CENTER,
    })
    this.add_suffix(this.switchWidget)
    this.set_activatable_widget(this.switchWidget)

    this.switchWidget.connect('notify::active', () => {
      this.notify('enabled')
    })

    if (initialHealth) this.updateHealth(initialHealth)
  }

  get enabled(): boolean {
    return this.switchWidget.get_active()
  }

  setEnabled(val: boolean): void {
    this.switchWidget.set_active(val)
  }

  updateHealth(health: SourceHealth): void {
    const dot = this.healthDot as unknown as GtkWidget
    for (const cls of ['health-up', 'health-slow', 'health-down']) dot.remove_css_class(cls)
    dot.add_css_class(`health-${health.status}`)
    const latency = health.latencyMs < 1000
      ? `${health.latencyMs}ms`
      : `${(health.latencyMs / 1000).toFixed(1)}s`
    this.healthLatency.set_label(health.status === 'down' ? 'down' : latency)
    ;(this.healthDot as unknown as { set_tooltip_text(s: string): void }).set_tooltip_text(`Last checked: ${health.lastChecked}`)
  }
})
