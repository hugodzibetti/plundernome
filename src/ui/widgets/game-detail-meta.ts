import type { Game } from '../../domain/models'
import type { EnrichedMetadata } from '../../services/metadata-provider'

const { Gtk, Adw } = imports.gi

export function createDetailsSection(
  game: Game,
  enriched: EnrichedMetadata | null | undefined,
  sourceIds: string[],
  protonRating?: string | null,
): GtkBox {
  const section = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 8 })
  section.add_css_class('game-detail-details')

  const group = new Adw.PreferencesGroup({ title: 'Details' })

  if (game.size) {
    const sizeRow = new Adw.ActionRow({ title: 'Download Size' })
    const sizeLbl = new Gtk.Label({ label: game.size, xalign: 0 })
    sizeLbl.add_css_class('dim-label')
    sizeRow.add_suffix(sizeLbl)
    group.add(sizeRow)
  }

  const platformRow = new Adw.ActionRow({ title: 'Platform' })
  const platformLbl = new Gtk.Label({ label: 'Windows (Wine/Proton)', xalign: 0 })
  platformLbl.add_css_class('dim-label')
  platformRow.add_suffix(platformLbl)
  group.add(platformRow)

  if (protonRating) {
    const ratingRow = new Adw.ActionRow({ title: 'ProtonDB' })
    const ratingBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 4 })
    const ratingLbl = new Gtk.Label({ label: protonRating, xalign: 0 })
    ratingLbl.add_css_class('protondb-badge')
    ratingLbl.add_css_class(`protondb-${protonRating}`)
    ratingBox.append(ratingLbl)
    ratingRow.add_suffix(ratingBox)
    group.add(ratingRow)
  }

  section.append(group)

  // Source badges — which repack sites have this game
  if (sourceIds?.length) {
    const sourcesBox = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, spacing: 6 })
    sourcesBox.add_css_class('game-detail-sources')
    const srcLabel = new Gtk.Label({ label: 'Available on:', xalign: 0 })
    srcLabel.add_css_class('dim-label')
    sourcesBox.append(srcLabel)
    const flowBox = new Gtk.FlowBox()
    flowBox.set_selection_mode(Gtk.SelectionMode.NONE)
    flowBox.set_max_children_per_line(10)
    flowBox.set_halign(Gtk.Align.START)
    for (const sid of sourceIds) {
      const chip = new Gtk.Button({ label: sid, css_classes: ['source-badge', 'flat'], can_target: false })
      flowBox.append(chip)
    }
    sourcesBox.append(flowBox)
    section.append(sourcesBox)
  }

  // Tags
  if (game.tags?.length) {
    const tagFlow = new Gtk.FlowBox()
    tagFlow.set_selection_mode(Gtk.SelectionMode.NONE)
    tagFlow.set_max_children_per_line(10)
    tagFlow.set_halign(Gtk.Align.START)
    for (const tag of game.tags) {
      const chip = new Gtk.Button({ label: tag, css_classes: ['tag-chip', 'flat'], can_target: false })
      tagFlow.append(chip)
    }
    section.append(tagFlow)
  }

  // Repack notes
  if (game.repackNotes) {
    const notesGroup = new Adw.PreferencesGroup({ title: 'Repack Notes' })
    const notesLbl = new Gtk.Label({ label: game.repackNotes, xalign: 0, wrap: true, selectable: true })
    notesLbl.add_css_class('game-detail-repack-notes')
    notesGroup.add(notesLbl)
    section.append(notesGroup)
  }

  return section
}
