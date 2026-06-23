#!/usr/bin/env node
import * as esbuild from 'esbuild'
import { execSync } from 'child_process'
import { existsSync, watch } from 'fs'
import { resolve } from 'path'

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

function syntaxCheck() {
  for (const out of ['dist/main.js', 'dist/launch-entry.js']) {
    if (!existsSync(out)) continue
    execSync(`${process.execPath} --check ${out}`, { stdio: 'pipe', timeout: 10000 })
    console.log(`  ${out}: syntax OK`)
  }
}

async function buildOnce() {
  const result = await esbuild.build(config)
  if (result.errors.length > 0) {
    console.error(result.errors)
    process.exit(1)
  }
  console.log('Build complete. dist/main.js')
  syntaxCheck()
}

async function watchMode() {
  const ctx = await esbuild.context(config)
  // first build
  await ctx.rebuild()
  console.log('Build complete. Watching src/...')
  syntaxCheck()

  const srcDir = resolve('src')
  let rebuilding = false

  const rebuild = async () => {
    if (rebuilding) return
    rebuilding = true
    try {
      const start = Date.now()
      await ctx.rebuild()
      console.log(`Rebuilt in ${Date.now() - start}ms`)
      syntaxCheck()
    } catch (err) {
      console.error('Rebuild failed:', err)
    } finally {
      rebuilding = false
    }
  }

  const watcher = watch(srcDir, { recursive: true }, (event, file) => {
    if (!file?.endsWith('.ts')) return
    console.log(`Change: ${file}`)
    rebuild()
  })

  process.on('SIGINT', () => { watcher.close(); ctx.dispose(); process.exit(0) })
  process.on('SIGTERM', () => { watcher.close(); ctx.dispose(); process.exit(0) })
}

async function main() {
  if (process.argv.includes('--watch')) {
    await watchMode()
    return
  }
  await buildOnce()
}

main()
