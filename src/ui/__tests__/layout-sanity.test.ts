import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join, relative } from 'path';

const UI_DIR = join(__dirname, '..');

function getTsFiles(dir: string, excludeDirs = ['__tests__', 'node_modules']): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((e) => {
    const full = join(dir, e.name);
    if (e.isDirectory() && !excludeDirs.includes(e.name)) return getTsFiles(full);
    if (e.isFile() && e.name.endsWith('.ts')) return [full];
    return [];
  });
}

/** Parse LAYOUT.md halign/valign rule table */
function parseLayoutRules(): Map<string, { halign: string; valign: string }> {
  const md = readFileSync(join(UI_DIR, 'LAYOUT.md'), 'utf-8');
  const rules = new Map<string, { halign: string; valign: string }>();
  const regex = /\|\s*(\w[\w\s]*?)\s*\|\s*(START|CENTER|FILL|END)\s*\|\s*(START|CENTER|FILL|END)\s*\|/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    if (m[1] && m[2] && m[3]) {
      const w = m[1]
        .trim()
        .toLowerCase()
        .replace(/\s+.*$/, '');
      rules.set(w, { halign: m[2], valign: m[3] });
    }
  }
  return rules;
}

/** Extract halign/valign calls from file content */
function extractAlignments(content: string): Array<{ line: number; type: string; value: string }> {
  const aligns: Array<{ line: number; type: string; value: string }> = [];
  const regex = /set_(halign|valign)\(Gtk\.Align\.(\w+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    if (!m[1] || !m[2]) continue;
    const lineNum = content.substring(0, m.index).split('\n').length - 1;
    aligns.push({ line: lineNum, type: m[1], value: m[2] });
  }
  return aligns;
}

describe('UI structural invariants', () => {
  const uiFiles = getTsFiles(join(UI_DIR, 'views')).concat(getTsFiles(join(UI_DIR, 'widgets')));
  const giFiles = uiFiles.filter((f) => readFileSync(f, 'utf-8').includes('imports.gi'));
  const layoutRules = parseLayoutRules();

  describe.each(giFiles)('%s', (filepath) => {
    const content = readFileSync(filepath, 'utf-8');

    it('no Gtk.ScrolledWindow usage', () => {
      expect(
        content.includes('new Gtk.ScrolledWindow'),
        `File uses Gtk.ScrolledWindow — use createScrollContent from templates`,
      ).toBe(false);
    });

    it('no extends Gtk.Window', () => {
      expect(
        /extends\s+(?:imports\.gi\.)?Gtk\.Window\b/.test(content),
        `File extends Gtk.Window — should extend Adw.Bin or Adw.ApplicationWindow`,
      ).toBe(false);
    });

    it('no `as any` casts in view/widget files', () => {
      expect(/\bas\s+any\b/.test(content), `File uses 'as any' cast — narrow with unknown instead`).toBe(false);
    });

    it('no set_size_request in views/widgets (use CSS sizing class)', () => {
      expect(
        /set_size_request\(/.test(content),
        `File uses set_size_request() — use CSS sizing class from style.css instead`,
      ).toBe(false);
    });

    it('every file has at least one add_css_class call', () => {
      expect(
        content.includes('add_css_class'),
        `File has no add_css_class call — every view/widget needs >=1 CSS class`,
      ).toBe(true);
    });

    it('no bare Gtk.Button constructor (use factory)', () => {
      expect(
        /new\s+(?:imports\.gi\.)?Gtk\.Button\s*\(/.test(content),
        `File uses 'new Gtk.Button()' — use createButton() from factory.ts`,
      ).toBe(false);
    });

    it('no .show() on dialogs (use .present())', () => {
      expect(/\.show\s*\(\s*\)/.test(content), `File uses .show() — use .present() instead`).toBe(false);
    });

    it('prefers template imports over direct widget construction', () => {
      const usesFlowBox = content.includes('new Gtk.FlowBox');
      const usesListBox = content.includes('new Gtk.ListBox');
      const usesTemplate =
        content.includes('templates/') ||
        content.includes('createScrollContent') ||
        content.includes('createGridContent') ||
        content.includes('createListContent');
      const isCatalogView = filepath.endsWith('catalog-view.ts');
      const isCatalogRender = filepath.endsWith('catalog-render.ts');
      const isErrorLog = filepath.endsWith('error-log-view.ts');
      if (!isCatalogView && !isCatalogRender && !isErrorLog && (usesFlowBox || usesListBox)) {
        expect(
          usesTemplate,
          `File uses direct Gtk.FlowBox/ListBox — use createGridContent/createListContent from templates`,
        ).toBe(true);
      }
    });

    it('every createScrollContent call specifies expand or maxHeight', () => {
      const calls = content.match(/createScrollContent\([^)]*\)/g);
      if (!calls) return;
      for (const call of calls) {
        const hasExpand = call.includes('expand: true') || call.includes('expand:false');
        const hasMaxH = call.includes('maxHeight:');
        const isTemplateDef = filepath.includes('scroll-content.ts');
        if (isTemplateDef) continue;
        expect(
          hasExpand || hasMaxH,
          `${filepath}: createScrollContent() must specify { expand: true } or { maxHeight: N } — see LAYOUT.md`,
        ).toBe(true);
      }
    });

    it('halign/valign usage follows LAYOUT.md charter (warning only)', () => {
      const aligns = extractAlignments(content);
      const filename = relative(UI_DIR, filepath);
      const fileBase = filename.split('/').pop() ?? '';
      const widgetType = fileBase.includes('card')
        ? 'button'
        : fileBase.includes('row')
          ? 'button'
          : fileBase.includes('badge')
            ? 'label'
            : 'box';
      const expected = layoutRules.get(widgetType);
      if (!expected) return;
      for (const a of aligns) {
        const ev = expected[a.type as 'halign' | 'valign'];
        if (a.value !== ev) {
          console.warn(`  [layout] ${filename}:${a.line} set_${a.type}(${a.value}) expected ${ev} per LAYOUT.md`);
        }
      }
    });

    it('files with user-facing strings import _t() for i18n (warning only)', () => {
      const userStrings = content.match(/['"][A-Z][a-z][^'"]*['"]/g);
      if (userStrings && userStrings.length > 3) {
        const hasI18n = content.includes('import { _t }') || content.includes("from '../../domain/i18n'");
        if (!hasI18n) {
          console.warn(`  [i18n] ${relative(UI_DIR, filepath)}: has user-facing strings but no _t() import`);
        }
      }
    });
  });
});

it('uses createSettingsPage instead of raw PreferencesPage', () => {
  const viewsDir = join(UI_DIR, 'views');
  const files = getTsFiles(viewsDir);
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (file.includes('__tests__')) continue;
    if (content.includes('new Adw.PreferencesPage') && !content.includes('createSettingsPage')) {
      expect(
        content,
        `${relative(UI_DIR, file)}: uses 'new Adw.PreferencesPage()' — use createSettingsPage() from templates/settings-page`,
      ).toContain('createSettingsPage');
    }
  }
});

it('no widget extends Gtk.Box directly (use Adw.Bin)', () => {
  const widgetsDir = join(UI_DIR, 'widgets');
  const files = getTsFiles(widgetsDir);
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    if (content.includes('extends Gtk.Box')) {
      console.warn(`  [widget-base] ${relative(UI_DIR, file)}: extends Gtk.Box — consider Adw.Bin`);
    }
  }
});

describe('GObject.registerClass conventions', () => {
  const allFiles = getTsFiles(UI_DIR).filter((f) => !f.includes('__tests__'));

  it('every registerClass call has matching GTypeName and class name', () => {
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf-8');
      const matches = content.matchAll(
        /GObject\.registerClass\(\{(?:[^}]*)\s*GTypeName:\s+'(\w+)'\s*[^}]*\},\s+class\s+(\w+)/g,
      );
      for (const m of matches) {
        if (m[1] && m[2]) {
          expect(m[1], `${relative(UI_DIR, file)}: GTypeName '${m[1]}' must match class name '${m[2]}'`).toBe(m[2]);
        }
      }
    }
  });
});
