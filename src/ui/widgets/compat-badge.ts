import { _t } from '../../domain/i18n';
import type { CompatProfile } from '../../domain/models';
import type { ProtonDBRating } from '../../services/proton/protondb';

const PROFILE_MAP: Record<string, { label: () => string; css: string }> = {
  native: { label: () => _t('compat.native'), css: 'native' },
  proton: { label: () => _t('compat.proton'), css: 'proton' },
  wine: { label: () => _t('compat.wine'), css: 'wine' },
  unknown: { label: () => _t('compat.unknown'), css: 'wine' },
};

const PROTON_COLORS: Record<string, string> = {
  platinum: '#e5cc8a',
  gold: '#d4af37',
  silver: '#b0b0b0',
  bronze: '#cd7f32',
  borked: '#ff4444',
  pending: '#888888',
};

function profileType(profile: CompatProfile): string {
  if (profile.isLinuxNative) return 'native';
  if (profile.needsProton) return 'proton';
  if (profile.needsWine) return 'wine';
  return 'unknown';
}

const { Gtk, Adw, GObject } = imports.gi;

export const CompatBadge = GObject.registerClass(
  {
    GTypeName: 'CompatBadge',
  },
  class CompatBadge extends Adw.Bin {
    private compatLabel: GtkLabel;
    private protonLabel: GtkLabel | null = null;
    private currentType: string = '';
    private inner: GtkBox;

    constructor(profile: CompatProfile, protonRating?: ProtonDBRating) {
      super();
      this.add_css_class('compat-badge');
      this.inner = new Gtk.Box({ spacing: 4, halign: Gtk.Align.START, valign: Gtk.Align.CENTER });
      this.compatLabel = new Gtk.Label({ label: '', xalign: 0 });
      this.compatLabel.add_css_class('compat-badge');
      this.inner.append(this.compatLabel);
      this.set_child(this.inner);
      this.setProfile(profile, protonRating);
    }

    setProfile(profile: CompatProfile, protonRating?: ProtonDBRating): void {
      if (this.currentType) {
        this.compatLabel.remove_css_class(PROFILE_MAP[this.currentType]?.css ?? '');
      }
      const type = profileType(profile);
      this.compatLabel.set_label(PROFILE_MAP[type]?.label() ?? 'Unknown');
      this.compatLabel.add_css_class(PROFILE_MAP[type]?.css ?? 'wine');
      this.currentType = type;

      if (this.protonLabel) {
        this.inner.remove(this.protonLabel);
        this.protonLabel = null;
      }
      if (protonRating) {
        this.protonLabel = new Gtk.Label({ label: protonRating, xalign: 0 });
        this.protonLabel.add_css_class('protondb-badge');
        this.protonLabel.add_css_class(`protondb-${protonRating}`);
        this.inner.append(this.protonLabel);
      }
    }
  },
);
