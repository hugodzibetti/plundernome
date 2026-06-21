import type { SourceDefinition } from '../domain/catalog/types'
import { BUNDLED_SOURCE_DEFINITIONS } from '../sources'
import { SettingsManager } from '../services/gsettings'

const { GLib, Gio } = imports.gi

const USER_SOURCES_DIR = '.config/plundernome/sources'
const MAX_JSON_BYTES = 1_048_576

const REQUIRED_SOURCE_FIELDS = ['id', 'name', 'baseUrl', 'scrapeType', 'updateIntervalMinutes', 'enabled'] as const
const VALID_SCRAPE_TYPES = ['rss', 'html', 'api'] as const

export class SourceLoader {
  load(): SourceDefinition[] {
    const userSources = loadUserSources()
    return mergeSourceDefinitions(BUNDLED_SOURCE_DEFINITIONS, userSources)
  }
}

export function loadUserSources(): SourceDefinition[] {
  const dirPath = `${GLib.get_home_dir()}/${USER_SOURCES_DIR}`
  const dir = Gio.File.new_for_path(dirPath)

  if (!dir.query_exists(null)) return []

  try {
    const enumerator = dir.enumerate_children('standard::name', 0, null)
    const results: SourceDefinition[] = []

    let info = enumerator.next_file(null)
    while (info) {
      const name = info.get_name()
      if (name.endsWith('.json')) {
        const file = dir.get_child(name)
        try {
          const parsed = readAndParseJsonFile(file)
          if (isValidSourceDefinition(parsed)) {
            results.push(parsed as SourceDefinition)
          }
        } catch {
          // skip malformed or unreadable files
        }
      }
      info = enumerator.next_file(null)
    }
    enumerator.close(null)

    return results
  } catch {
    return []
  }
}

export function mergeSourceDefinitions(
  bundled: SourceDefinition[],
  user: SourceDefinition[],
): SourceDefinition[] {
  const map = new Map<string, SourceDefinition>()
  for (const s of bundled) map.set(s.id, { ...s })
  for (const s of user) map.set(s.id, { ...s })
  return Array.from(map.values())
}

export function loadSourceDefinitions(): SourceDefinition[] {
  const sources = new SourceLoader().load()
  const settings = new SettingsManager()
  const enabledRaw = settings.getString('enabled-sources')
  if (!enabledRaw) return sources
  const enabledIds = new Set(enabledRaw.split(',').map(s => s.trim()).filter(Boolean))
  return sources.map(s => ({ ...s, enabled: enabledIds.has(s.id) }))
}

function readAndParseJsonFile(file: GioFile): unknown {
  const inputStream = file.read(null)
  const dataStream = new Gio.DataInputStream({ base_stream: inputStream })
  const bytes = dataStream.read_byte_array(MAX_JSON_BYTES, null)
  dataStream.close(null)
  inputStream.close(null)

  if (!bytes) return null
  const jsonStr = imports.byteArray.toString(bytes)
  return JSON.parse(jsonStr)
}

function isValidSourceDefinition(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false
  const o = obj as Record<string, unknown>
  for (const field of REQUIRED_SOURCE_FIELDS) {
    if (!(field in o)) return false
  }
  if (typeof o.id !== 'string') return false
  if (typeof o.name !== 'string') return false
  if (typeof o.baseUrl !== 'string') return false
  if (!VALID_SCRAPE_TYPES.includes(o.scrapeType as typeof VALID_SCRAPE_TYPES[number])) return false
  if (typeof o.updateIntervalMinutes !== 'number') return false
  if (typeof o.enabled !== 'boolean') return false
  return true
}
