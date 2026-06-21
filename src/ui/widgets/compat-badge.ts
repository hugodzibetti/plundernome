import type { CompatProfile } from '../../domain/models'
import type { ProtonDBRating } from '../../services/protondb'

const PROFILE_MAP: Record<string, { label: string; css: string }> = {
  native: { label: 'Native', css: 'native' },
  proton: { label: 'Proton', css: 'proton' },
  wine: { label: 'Wine', css: 'wine' },
  unknown: { label: 'Unknown', css: 'wine' },
}

const PROTON_COLORS: Record<string, string> = {
  platinum: '#e5cc8a',
  gold: '#d4af37',
  silver: '#b0b0b0',
  bronze: '#cd7f32',
  borked: '#ff4444',
  pending: '#888888',
}

function profileType(profile: CompatProfile): string {
  if (profile.isLinuxNative) return 'native'
  if (profile.needsProton) return 'proton'
  if (profile.needsWine) return 'wine'
  return 'unknown'
}

const { Gtk, GObject } = imports.gi

export const CompatBadge = GObject.registerClass({
  GTypeName: 'CompatBadge',
}, class CompatBadge extends Gtk.Box {
  private compatLabel: GtkLabel
  private protonLabel: GtkLabel | null = null
  private currentType: string = ''

  constructor(profile: CompatProfile, protonRating?: ProtonDBRating) {
    super({ spacing: 4, halign: Gtk.Align.START, valign: Gtk.Align.CENTER })
    this.add_css_class('compat-badge')
    this.compatLabel = new Gtk.Label({ label: '', xalign: 0 })
    this.compatLabel.add_css_class('compat-badge')
    this.append(this.compatLabel)
    this.setProfile(profile, protonRating)
  }

  setProfile(profile: CompatProfile, protonRating?: ProtonDBRating): void {
    if (this.currentType) {
      this.compatLabel.remove_css_class(PROFILE_MAP[this.currentType]?.css ?? '')
    }
    const type = profileType(profile)
    this.compatLabel.set_label(PROFILE_MAP[type]?.label ?? 'Unknown')
    this.compatLabel.add_css_class(PROFILE_MAP[type]?.css ?? 'wine')
    this.currentType = type

    if (this.protonLabel) {
      this.remove(this.protonLabel)
      this.protonLabel = null
    }
    if (protonRating) {
      this.protonLabel = new Gtk.Label({ label: protonRating, xalign: 0 })
      this.protonLabel.add_css_class('protondb-badge')
      this.protonLabel.add_css_class(`protondb-${protonRating}`)
      this.append(this.protonLabel)
    }
  }
})
