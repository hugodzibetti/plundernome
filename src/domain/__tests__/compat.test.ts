import { describe, it, expect } from 'vitest'
import { detectCompat } from '../compat/detector'
import {
  WINDOWS_GAME_FILES,
  LINUX_GAME_FILES,
  STEAM_STUB_FILES,
  NO_DEPS_FILES,
} from '../../../tests/fixtures/game-samples'
import type { FileEntry } from '../models'

describe('detectCompat', () => {
  it('detects Windows game needs Wine', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades')
    expect(profile.needsWine).toBe(true)
    expect(profile.isLinuxNative).toBe(false)
  })

  it('detects Linux native game', () => {
    const profile = detectCompat(LINUX_GAME_FILES, 'Hades')
    expect(profile.needsWine).toBe(false)
    expect(profile.isLinuxNative).toBe(true)
  })

  it('detects Steam stub needs Proton', () => {
    const profile = detectCompat(STEAM_STUB_FILES, 'Game')
    expect(profile.needsProton).toBe(true)
    expect(profile.needsWine).toBe(true)
  })

  it('detects VC++ dependency', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades')
    const vc = profile.deps.find(d => d.type === 'vcredist')
    expect(vc).toBeDefined()
    expect(vc?.required).toBe(true)
  })

  it('detects DirectX dependency', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades')
    const dx = profile.deps.find(d => d.type === 'directx')
    expect(dx).toBeDefined()
  })

  it('returns empty deps for game with only exe', () => {
    const profile = detectCompat(NO_DEPS_FILES, 'Game')
    expect(profile.deps).toHaveLength(0)
  })

  it('detects 64-bit arch', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades')
    expect(profile.prefixArch).toBe('win64')
  })

  it('detects 32-bit arch when no x64 files', () => {
    const files32 = NO_DEPS_FILES
    const profile = detectCompat(files32, 'Game')
    expect(profile.prefixArch).toBe('win32')
  })

  it('sets main executable from priority list', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades')
    expect(profile.mainExecutable).toBe('Hades/game.exe')
  })

  it('builds DXVK env for Proton games', () => {
    const profile = detectCompat(STEAM_STUB_FILES, 'Game')
    expect(profile.env.DXVK_HUD).toBe('0')
  })

  it('returns empty env for non-Proton Windows game', () => {
    const profile = detectCompat(WINDOWS_GAME_FILES, 'Hades')
    expect(profile.env).toEqual({})
  })

  it('handles empty file list', () => {
    const profile = detectCompat([], 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.needsProton).toBe(false)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.deps).toHaveLength(0)
    expect(profile.mainExecutable).toBeUndefined()
    expect(profile.prefixArch).toBe('win32')
    expect(profile.env).toEqual({})
  })

  it('handles only directory entries', () => {
    const dirs: FileEntry[] = [
      { path: 'Game/Engine', name: 'Engine', size: 0, isDirectory: true, extension: '' },
      { path: 'Game/Data', name: 'Data', size: 0, isDirectory: true, extension: '' },
    ]
    const profile = detectCompat(dirs, 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.mainExecutable).toBeUndefined()
    expect(profile.deps).toHaveLength(0)
  })

  it('handles files with unknown extensions', () => {
    const unknownFiles: FileEntry[] = [
      { path: 'game/data.dat', name: 'data.dat', size: 1000, isDirectory: false, extension: '.dat' },
      { path: 'game/assets.pak', name: 'assets.pak', size: 5000, isDirectory: false, extension: '.pak' },
    ]
    const profile = detectCompat(unknownFiles, 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.needsProton).toBe(false)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.mainExecutable).toBeUndefined()
  })

  it('detects uppercase .EXE as non-Windows (case sensitivity)', () => {
    const upperExe: FileEntry[] = [
      { path: 'Game/GAME.EXE', name: 'GAME.EXE', size: 5_000_000, isDirectory: false, extension: '.EXE' },
    ]
    const profile = detectCompat(upperExe, 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.mainExecutable).toBeUndefined()
  })

  it('handles files with no extension (not dirs)', () => {
    const noExtFiles: FileEntry[] = [
      { path: 'game/binary', name: 'binary', size: 5_000_000, isDirectory: false, extension: '' },
    ]
    const profile = detectCompat(noExtFiles, 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.isLinuxNative).toBe(true)
    expect(profile.mainExecutable).toBeUndefined()
  })

  it('detects mixed extensions with Windows exe taking priority', () => {
    const mixedFiles: FileEntry[] = [
      { path: 'game/game.exe', name: 'game.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
      { path: 'game/Hades.x86_64', name: 'Hades.x86_64', size: 10_000_000, isDirectory: false, extension: '.x86_64' },
    ]
    const profile = detectCompat(mixedFiles, 'Hades')
    expect(profile.needsWine).toBe(true)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.mainExecutable).toBe('game/game.exe')
  })

  it('detects .NET dependency from runtimeconfig.json', () => {
    const dotnetFiles: FileEntry[] = [
      { path: 'game/game.exe', name: 'game.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
      { path: 'game/game.runtimeconfig.json', name: 'game.runtimeconfig.json', size: 100, isDirectory: false, extension: '.json' },
    ]
    const profile = detectCompat(dotnetFiles, 'Game')
    expect(profile.deps.some(d => d.type === 'dotnet')).toBe(true)
  })

  it('detects XNA dependency', () => {
    const xnaFiles: FileEntry[] = [
      { path: 'game/game.exe', name: 'game.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
      { path: 'game/Redist/xnafx.exe', name: 'xnafx.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
    ]
    const profile = detectCompat(xnaFiles, 'Game')
    expect(profile.deps.some(d => d.type === 'xna')).toBe(true)
  })

  it('detects PhysX dependency', () => {
    const physxFiles: FileEntry[] = [
      { path: 'game/game.exe', name: 'game.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
      { path: 'game/Redist/physx.exe', name: 'physx.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
    ]
    const profile = detectCompat(physxFiles, 'Game')
    expect(profile.deps.some(d => d.type === 'physx')).toBe(true)
  })

  it('detects OpenAL dependency', () => {
    const openalFiles: FileEntry[] = [
      { path: 'game/game.exe', name: 'game.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
      { path: 'game/Redist/oalinst.exe', name: 'oalinst.exe', size: 1_000_000, isDirectory: false, extension: '.exe' },
    ]
    const profile = detectCompat(openalFiles, 'Game')
    expect(profile.deps.some(d => d.type === 'openal')).toBe(true)
  })

  it('selects first exe as main when no priority match', () => {
    const noPriorityFiles: FileEntry[] = [
      { path: 'Game/foo.exe', name: 'foo.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
    ]
    const profile = detectCompat(noPriorityFiles, 'Game')
    expect(profile.mainExecutable).toBe('Game/foo.exe')
  })

  it('uses steam.exe for Proton detection', () => {
    const steamFiles: FileEntry[] = [
      { path: 'game/steam.exe', name: 'steam.exe', size: 500_000, isDirectory: false, extension: '.exe' },
    ]
    const profile = detectCompat(steamFiles, 'Game')
    expect(profile.needsProton).toBe(true)
  })

  it('detects .jar files as unknown type (neither .exe nor .x86_64)', () => {
    const jarFiles: FileEntry[] = [
      { path: 'game/game.jar', name: 'game.jar', size: 10_000_000, isDirectory: false, extension: '.jar' },
      { path: 'game/libs', name: 'libs', size: 0, isDirectory: true, extension: '' },
    ]
    const profile = detectCompat(jarFiles, 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.mainExecutable).toBeUndefined()
    expect(profile.deps).toHaveLength(0)
  })

  it('detects .sh files as not ELF binary and not Windows exe', () => {
    const shFiles: FileEntry[] = [
      { path: 'game/start.sh', name: 'start.sh', size: 500, isDirectory: false, extension: '.sh' },
    ]
    const profile = detectCompat(shFiles, 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.mainExecutable).toBeUndefined()
  })

  it('detects .AppImage as not ELF binary', () => {
    const appImageFiles: FileEntry[] = [
      { path: 'game/Game.AppImage', name: 'Game.AppImage', size: 100_000_000, isDirectory: false, extension: '.AppImage' },
    ]
    const profile = detectCompat(appImageFiles, 'Game')
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.needsWine).toBe(false)
  })

  it('selects first exe with multiple exe files and no priority match', () => {
    const multiExe: FileEntry[] = [
      { path: 'Game/a.exe', name: 'a.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
      { path: 'Game/b.exe', name: 'b.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
      { path: 'Game/c.exe', name: 'c.exe', size: 5_000_000, isDirectory: false, extension: '.exe' },
    ]
    const profile = detectCompat(multiExe, 'Game')
    expect(profile.needsWine).toBe(true)
    expect(profile.mainExecutable).toBe('Game/a.exe')
  })

  it('handles .dll files without .exe (no Wine needed)', () => {
    const dllFiles: FileEntry[] = [
      { path: 'game/data.dll', name: 'data.dll', size: 1_000_000, isDirectory: false, extension: '.dll' },
      { path: 'game/config.dll', name: 'config.dll', size: 500_000, isDirectory: false, extension: '.dll' },
    ]
    const profile = detectCompat(dllFiles, 'Game')
    expect(profile.needsWine).toBe(false)
    expect(profile.isLinuxNative).toBe(false)
    expect(profile.mainExecutable).toBeUndefined()
  })
})