#!/usr/bin/env node
import * as esbuild from 'esbuild'
import { execSync } from 'child_process'
import { existsSync } from 'fs'

const config = {
  entryPoints: ['src/main.ts', 'src/launch-entry.ts'],
  outdir: 'dist',
  bundle: true,
  format: 'iife',
  platform: 'neutral',
  target: 'esnext',
  external: ['imports:*'],
  banner: {
    js: '#!/usr/bin/gjs\nimports.gi.versions.Gtk = "4.0";\nimports.gi.versions.Adw = "1";\nimports.gi.versions.Soup = "3.0";',
  },
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--watch')) {
    const ctx = await esbuild.context(config)
    await ctx.watch()
    console.log('Watching...')
    return
  }

  const result = await esbuild.build(config)
  if (result.errors.length > 0) {
    console.error(result.errors)
    process.exit(1)
  }
  console.log('Build complete. dist/main.js')

  // Post-build syntax check (catches basic JS errors before GJS runtime)
  for (const out of ['dist/main.js', 'dist/launch-entry.js']) {
    if (!existsSync(out)) continue
    execSync(`node --check ${out}`, { stdio: 'pipe', timeout: 10000 })
    console.log(`  ${out}: syntax OK`)
  }
}

main()
