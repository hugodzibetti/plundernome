import type { CompatProfile } from '../domain/models'

const GLib = imports.gi.GLib

function expandPath(path: string): string {
  if (path.startsWith('~')) {
    return path.replace(/^~/, GLib.get_home_dir())
  }
  return path
}

export function detectWineVersion(): string {
  const patterns = [
    '~/.local/share/Steam/compatibilitytools.d/GE-Proton*/proton',
    '~/.steam/root/compatibilitytools.d/*/proton',
    '/usr/bin/wine',
    '/app/bin/wine',
  ]

  for (const pattern of patterns) {
    const expanded = expandPath(pattern)
    if (pattern.endsWith('*') || pattern.includes('*')) {
      try {
        const results = GLib.glob(expanded, 0)
        if (results.length > 0) {
          const protonPath = results[0] as string
          if (pattern.includes('proton') && pattern.includes('GE-Proton')) {
            const match = protonPath.match(/GE-Proton([\d.]+)/)
            if (match) return `GE-Proton ${match[1]}`
          }
          if (pattern.includes('proton')) {
            return 'Steam Proton'
          }
          return 'system wine'
        }
      } catch {
        continue
      }
    } else {
      if (GLib.file_test(expanded, GLib.G_FILE_TEST_EXISTS)) {
        if (pattern.includes('wine')) {
          if (pattern.includes('/app/bin/wine')) return 'flatpak wine'
          return 'system wine'
        }
      }
    }
  }

  return ''
}

export function findProtonPath(): string {
  const paths = [
    '~/.local/share/Steam/compatibilitytools.d/GE-Proton*/proton',
    '~/.steam/root/compatibilitytools.d/*/proton',
  ]
  for (const p of paths) {
    const expanded = expandPath(p)
    const results = GLib.glob(expanded, 0)
    if (results.length > 0) {
      return results[0] as string
    }
  }
  return ''
}

export function buildPrefixPath(prefixArch: string, gameId?: string, envWineprefix?: string): string {
  if (envWineprefix) return envWineprefix
  const base = `${GLib.get_home_dir()}/.local/share/plundernome/prefixes`
  if (gameId) return `${base}/${gameId}`
  return `${base}/${prefixArch}`
}

export function buildLaunchCommand(executable: string, profile: CompatProfile, gameId?: string): string {
  const envParts: string[] = []

  if (profile.env.DXVK_HUD) {
    envParts.push(`DXVK_HUD=${profile.env.DXVK_HUD}`)
  }
  if (profile.env.MANGOHUD) {
    envParts.push(`MANGOHUD=${profile.env.MANGOHUD}`)
  }
  if (profile.env.WINEDLLOVERRIDES) {
    envParts.push(`WINEDLLOVERRIDES=${profile.env.WINEDLLOVERRIDES}`)
  }

  Object.entries(profile.env).forEach(([key, value]) => {
    if (!['DXVK_HUD', 'MANGOHUD', 'WINEDLLOVERRIDES'].includes(key)) {
      envParts.push(`${key}=${value}`)
    }
  })

  if (profile.needsProton) {
    const protonPath = profile.protonOverridePath ?? findProtonPath()
    const prefixPath = buildPrefixPath(profile.prefixArch, gameId, profile.env.WINEPREFIX)
    envParts.push(`STEAM_COMPAT_DATA_PATH=${prefixPath}`)
    envParts.push('STEAM_COMPAT_CLIENT_INSTALL_PATH=~/.steam/steam')
    return [...envParts, `"${protonPath}" run "${executable}"`].join(' ')
  }

  if (profile.needsWine) {
    const prefixPath = buildPrefixPath(profile.prefixArch, gameId, profile.env.WINEPREFIX)
    envParts.push(`WINEPREFIX=${prefixPath}`)
    const wineBinary = profile.wineVersion
      ? `wine-${profile.wineVersion}`
      : 'wine'
    return [...envParts, `${wineBinary} "${executable}"`].join(' ')
  }

  if (envParts.length > 0) {
    return [...envParts, `"${executable}"`].join(' ')
  }
  return `"${executable}"`
}

export { GLib, expandPath }