import type { PipelineStep } from '../../domain/models'

const { Gtk, GObject } = imports.gi

export type StepStatus = 'pending' | 'active' | 'complete' | 'failed'

export interface StepDisplay {
  step: PipelineStep
  status: StepStatus
  duration?: number
}

interface StepWidgets {
  icon: GtkImage
  label: GtkLabel
  box: GtkBox
}

export const PipelineTimelineWidget = GObject.registerClass({
  GTypeName: 'PipelineTimelineWidget',
}, class PipelineTimelineWidget extends imports.gi.Adw.Bin {
  private stepWidgets = new Map<PipelineStep, StepWidgets>()

  constructor(steps: PipelineStep[]) {
    super()
    this.add_css_class('pipeline-timeline')
    const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 })
    box.set_halign(Gtk.Align.START)
    for (const step of steps) {
      const sw = this.buildStepWidget(step, 'pending')
      this.stepWidgets.set(step, sw)
      box.append(sw.box)
    }
    this.set_child(box)
  }

  private buildStepWidget(step: PipelineStep, status: StepStatus): StepWidgets {
    const icon = new Gtk.Image({ icon_name: iconForStatus(status), pixel_size: 12 })
    const label = new Gtk.Label({ label: stepLabel(step), xalign: 0 })
    label.add_css_class('step-badge')
    label.add_css_class(cssForStatus(status))
    const box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 2 })
    box.append(icon)
    box.append(label)
    return { icon, label, box }
  }

  updateStep(step: PipelineStep, status: StepStatus): void {
    const sw = this.stepWidgets.get(step)
    if (!sw) return
    sw.icon.set_icon_name(iconForStatus(status))
    sw.label.set_label(stepLabel(step))
    for (const cls of ['complete', 'active', 'pending', 'failed']) {
      sw.label.remove_css_class(cls)
    }
    sw.label.add_css_class(cssForStatus(status))
  }

  setSteps(displays: StepDisplay[]): void {
    for (const sd of displays) {
      this.updateStep(sd.step, sd.status)
    }
  }
})

function iconForStatus(status: StepStatus): string {
  const map: Record<StepStatus, string> = {
    'complete': 'object-select-symbolic',
    'failed': 'dialog-error-symbolic',
    'active': 'emblem-synchronizing-symbolic',
    'pending': 'emblem-default-symbolic',
  }
  return map[status]
}

function stepLabel(step: PipelineStep): string {
  const labels: Record<PipelineStep, string> = {
    'downloading': 'Download',
    'verifying': 'Verify',
    'extracting': 'Extract',
    'detecting-deps': 'Deps',
    'installing-deps': 'Install',
    'finding-exe': 'Find EXE',
    'registering': 'Register',
    'completed': 'Done',
  }
  return labels[step] ?? step
}

function cssForStatus(status: StepStatus): string {
  const map: Record<StepStatus, string> = {
    'complete': 'complete',
    'active': 'active',
    'pending': 'pending',
    'failed': 'failed',
  }
  return map[status]
}