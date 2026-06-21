import { describe, it, expect, beforeAll } from 'vitest'
import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, statSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = 'dist/main.js'
const SCHEMA_XML = 'io.github.plundernome.gschema.xml'

beforeAll(() => {
  execSync('node scripts/build.mjs', { encoding: 'utf-8', stdio: 'pipe' })
  // Compile + install GSettings schema so runtime test doesn't crash
  const schemaDir = join(tmpdir(), `plundernome-schema-${Date.now()}`)
  mkdirSync(schemaDir, { recursive: true })
  const rootDir = join(__dirname, '..')
  execSync(`glib-compile-schemas --targetdir="${schemaDir}" .`, { encoding: 'utf-8', stdio: 'pipe', cwd: rootDir })
  process.env.GSETTINGS_SCHEMA_DIR = schemaDir
})

describe('Build', () => {
  it('produces dist/main.js', () => {
    expect(existsSync(DIST)).toBe(true)
  })

  it('output is non-empty', () => {
    const stats = statSync(DIST)
    expect(stats.size).toBeGreaterThan(100)
  })

  it('output contains GI import references', () => {
    const content = readFileSync(DIST, 'utf-8')
    expect(content).toContain('imports.gi')
  })
})

describe('Syntax check', () => {
  it('parses as valid JS via node', () => {
    execSync('node --check dist/main.js', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
  })
})

describe('Runtime', () => {
  it('starts under xvfb without crashing within 3s', () => {
    const proc = spawn('timeout', ['3', 'xvfb-run', '-a', 'gjs', 'dist/main.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stderr = ''
    proc.stderr!.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    return new Promise<void>((resolve, reject) => {
      proc.on('exit', (code) => {
        // code 124 = timeout killed it (app was running). code 0 = exited on own (unexpected).
        if (code === 124) {
          if (stderr.includes('JS ERROR')) reject(new Error(`Runtime JS error:\n${stderr}`))
          else resolve()
        } else if (code === 0) {
          resolve() // app exited cleanly on its own
        } else {
          reject(new Error(`App exited with code ${code}. Stderr:\n${stderr}`))
        }
      })
      proc.on('error', reject)
    })
  }, 15000)
})
