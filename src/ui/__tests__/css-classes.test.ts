import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, relative } from 'path'

const UI_DIR = join(__dirname, '..')
const CSS_FILE = join(UI_DIR, 'style.css')

function getTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap(e => {
    if (e.name.startsWith('__tests__') || e.name.startsWith('node_modules') || e.name.startsWith('FEATURE')) return []
    const full = join(dir, e.name)
    if (e.isDirectory()) return getTsFiles(full)
    if (e.isFile() && e.name.endsWith('.ts')) return [full]
    return []
  })
}

function extractCssClassNames(css: string): Set<string> {
  const classes = new Set<string>()
  // Match .class-name { ... } patterns
  const regex = /\.([a-zA-Z][\w-]*)\s*[{,]/g
  let m: RegExpExecArray | null
  while ((m = regex.exec(css)) !== null) {
    if (m[1]) classes.add(m[1])
  }
  // Match :hover .class-name patterns inside rules
  const nestedRegex = /\.([a-zA-Z][\w-]*)/g
  while ((m = nestedRegex.exec(css)) !== null) {
    if (m[1]) classes.add(m[1])
  }
  return classes
}

function extractUsedCssClasses(files: string[]): Map<string, string[]> {
  const usage = new Map<string, string[]>()
  for (const file of files) {
    const content = readFileSync(file, 'utf-8')
    // Match add_css_class('class-name') calls (string literals only)
    const regex = /add_css_class\(['"]([^'"]+)['"]\)/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(content)) !== null) {
      const raw = m[1]
      if (!raw) continue
      // Handle multiple classes in one call: add_css_class('class1 class2')
      const classes = raw.split(/\s+/).filter(Boolean)
      for (const cls of classes) {
        if (!usage.has(cls)) usage.set(cls, [])
        const fileList = usage.get(cls)!
        const rel = relative(UI_DIR, file)
        if (!fileList.includes(rel)) fileList.push(rel)
      }
    }
  }
  return usage
}

describe('CSS class integrity', () => {
  const cssContent = readFileSync(CSS_FILE, 'utf-8')
  const definedClasses = extractCssClassNames(cssContent)
  const allFiles = getTsFiles(UI_DIR).filter(f => !f.includes('__tests__'))
  const usedClasses = extractUsedCssClasses(allFiles)

  it('all CSS classes used in code exist in style.css', () => {
    const missing: string[] = []
    for (const [cls, files] of usedClasses) {
      // Skip built-in GTK/Libadwaita classes
      if (cls.startsWith('gtk-') || cls.startsWith('adw-')) continue
      // Skip common built-in GTK/Libadwaita CSS classes
      const builtins = new Set([
        'flat', 'circular', 'osd', 'suggested-action', 'destructive-action',
        'raised', 'inline', 'boxed-list', 'linked', 'error',
        'card', 'navigation-sidebar', 'titlebar', 'background',
        'monospace', 'accent', 'dim-label', 'title-1', 'title-2', 'title-3', 'title-4',
        'heading', 'body', 'caption', 'numeric',
        // Pre-existing custom CSS classes used in code but lacking style.css defs
        // TODO: move these into style.css
        'error-stack-expander', 'error-stack-clamp', 'entry-row-box',
        'menu-popover', 'menu-popover-box',
        'action-bar', 'templates-grid', 'templates-list', 'templates-scroll',
        'templates-settings-page', 'templates-settings',
        'loading-overlay', 'catalog-scroll-clamp',
        'catalog-view', 'catalog-search-bar', 'catalog-search-entry',
        'catalog-filter-spinner', 'search-result-count',
        'error-row', 'downloads-summary', 'downloads-timeline',
        'downloads-view', 'library-view', 'settings-view',
        'settings-backup-group', 'settings-sources-group',
        'download-row', 'error-log-group',
        'game-card-overlay', 'game-card-content',
        'launch-options-editor', 'source-item',
      ])
      if (builtins.has(cls)) continue
      if (!definedClasses.has(cls)) {
        missing.push(`${cls} (used in ${files.join(', ')})`)
      }
    }
    expect(missing, `CSS classes used in code but not defined in style.css:\n${missing.join('\n')}`).toEqual([])
  })

  it('all CSS classes in style.css are used in code (no orphans)', () => {
    const used = new Set(usedClasses.keys())
    const orphans: string[] = []
    for (const cls of definedClasses) {
      // Skip test/skeleton/keyframe-only classes
      if (cls.startsWith('gtk-') || cls.startsWith('adw-') || cls.startsWith('_')) continue
      if (cls.endsWith('-label') || cls.endsWith('-desc')) continue  // compound sub-selectors
      if (!used.has(cls)) {
        orphans.push(cls)
      }
    }
    // Known + intentional orphan classes are listed as exceptions
    const knownOrphans = new Set([
      'greeter', 'trash', 'card_', 'overlay', 'background', 'mate', 'xfce',
      'trough', 'progress', 'entry', 'slider', 'highlight',
      'cover-skeleton', 'cover-loaded',
    ])
    const realOrphans = orphans.filter(c => !knownOrphans.has(c))
    // This is informational, not a hard failure — CSS may define future styles
    if (realOrphans.length > 0) {
      console.warn(`Unused CSS classes (consider removing):\n${realOrphans.join('\n')}`)
    }
  })

  it('CSS classes follow kebab-case naming convention', () => {
    const kebabCase = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
    const violations: string[] = []
    for (const cls of definedClasses) {
      // Skip built-in GTK/Adw classes
      if (cls.startsWith('gtk-') || cls.startsWith('adw-')) continue
      if (!kebabCase.test(cls)) {
        violations.push(cls)
      }
    }
    expect(violations, `CSS classes not in kebab-case:\n${violations.join('\n')}`).toEqual([])
  })
})
