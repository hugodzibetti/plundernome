import type { FileEntry, CompatProfile, Dependency } from '../models'

export function detectCompat(files: FileEntry[], gameName: string): CompatProfile {
  const exeFiles = files.filter(f => !f.isDirectory && f.extension === '.exe')
  const elfFiles = files.filter(f => !f.isDirectory && isElfBinary(f))
  const hasWindowsExe = exeFiles.length > 0
  const isLinuxNative = elfFiles.length > 0 && !hasWindowsExe
  const deps = detectDependencies(files)

  const needsWine = hasWindowsExe && !isLinuxNative
  const needsProton = needsWine && isSteamStub(exeFiles)

  const profile: CompatProfile = {
    needsWine,
    needsProton,
    prefixArch: detectArch(files),
    deps,
    env: buildEnv(needsProton),
    mainExecutable: findPrimaryExe(exeFiles),
    isLinuxNative,
  }

  return profile
}

function detectDependencies(files: FileEntry[]): Dependency[] {
  const deps: Dependency[] = []

  const lowerPaths = files.map(f => f.path.toLowerCase())
  const lowerNames = files.map(f => f.name.toLowerCase())

  if (hasAny(lowerPaths, ['vc_redist', 'vcredist', 'msvcp'])) {
    deps.push(mkDep('vcredist', 'VC++ Redistributable', 'vcredist'))
  }

  if (hasAny(lowerPaths, ['dxsdk', 'd3dx9', 'd3dx10', 'd3dx11', 'directx', 'dxsetup', 'dxwebsetup'])) {
    deps.push(mkDep('directx', 'DirectX Runtime', 'directx'))
  }

  if (hasAny(lowerPaths, ['dotnet', 'ndp', 'netframework'])
    || lowerNames.some(n => n.endsWith('.runtimeconfig.json'))) {
    deps.push(mkDep('dotnet', '.NET Runtime', 'dotnet'))
  }

  if (hasAny(lowerNames, ['xnafx'])) {
    deps.push(mkDep('xna', 'XNA Framework', 'xna'))
  }

  if (hasAny(lowerNames, ['physx'])) {
    deps.push(mkDep('physx', 'PhysX', 'physx'))
  }

  if (hasAny(lowerNames, ['oalinst', 'openal'])) {
    deps.push(mkDep('openal', 'OpenAL', 'openal'))
  }

  return deps
}

function mkDep(id: string, name: string, type: Dependency['type']): Dependency {
  return { id, name, type, required: true }
}

function hasAny(items: string[], keywords: string[]): boolean {
  return keywords.some(kw => items.some(item => item.includes(kw)))
}

function isElfBinary(file: FileEntry): boolean {
  const elfExtensions = ['', '.elf', '.x86_64', '.x86']
  return !file.isDirectory && elfExtensions.includes(file.extension)
}

function isSteamStub(exeFiles: FileEntry[]): boolean {
  return exeFiles.some(f => f.name.toLowerCase() === 'steam.exe'
    || f.name.toLowerCase().includes('steamstub'))
}

function detectArch(files: FileEntry[]): 'win32' | 'win64' {
  const names = files.map(f => f.name.toLowerCase())
  if (names.some(n => n.includes('x64') || n.includes('win64') || n.includes('_64'))) {
    return 'win64'
  }
  return 'win32'
}

function buildEnv(proton: boolean): Record<string, string> {
  if (proton) {
    return { DXVK_HUD: '0', WINEDLLOVERRIDES: 'winemenubuilder.exe=d' }
  }
  return {}
}

function findPrimaryExe(exeFiles: FileEntry[]): string | undefined {
  const priority = ['launcher.exe', 'game.exe', 'start.exe', 'play.exe']
  for (const name of priority) {
    const found = exeFiles.find(f => f.name.toLowerCase() === name)
    if (found) return found.path
  }
  return exeFiles[0]?.path
}
