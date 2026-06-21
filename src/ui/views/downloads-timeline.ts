import type { StepDisplay } from '../widgets/pipeline-timeline'
import { PipelineTimelineWidget } from '../widgets/pipeline-timeline'

const { Gtk } = imports.gi

export function setPipelineSteps(
  downloadId: string,
  steps: StepDisplay[],
  timelineMap: Map<string, unknown>,
  widgetMap: Map<string, unknown>,
): void {
  const existing = timelineMap.get(downloadId)
  const widget = widgetMap.get(downloadId)
  if (!existing && widget) {
    const stepsList = steps.map(s => s.step).filter((s, i, a) => a.indexOf(s) === i)
    const timeline = new PipelineTimelineWidget(stepsList)
    timeline.add_css_class('downloads-timeline')
    timelineMap.set(downloadId, timeline)
    const parent = (widget as GtkWidget).get_parent()
    if (parent && parent instanceof Gtk.Box) {
      parent.append(timeline)
    }
  }
  const found = timelineMap.get(downloadId)
  if (found) {
    (found as unknown as { setSteps: (s: StepDisplay[]) => void }).setSteps(steps)
  }
}

export function removePipelineTimeline(
  id: string,
  timelineMap: Map<string, unknown>,
): void {
  const timeline = timelineMap.get(id)
  if (timeline) {
    const parent = (timeline as GtkWidget).get_parent()
    if (parent) (parent as unknown as GtkContainer).remove(timeline)
    timelineMap.delete(id)
  }
}
