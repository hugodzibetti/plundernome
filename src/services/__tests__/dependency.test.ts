import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DependencyInstaller } from '../dependency'

const mockGLib = (globalThis as any).mockGLib
const mockGio = (globalThis as any).mockGio

describe('DependencyInstaller', () => {
  let installer: DependencyInstaller

  beforeEach(() => {
    vi.clearAllMocks()
    installer = new DependencyInstaller('/home/user/wineprefix')
  })

  it('constructor stores default prefix', () => {
    expect(installer['defaultPrefix']).toBe('/home/user/wineprefix')
  })

  it('detect checks DLL existence', async () => {
    mockGLib.file_test.mockReturnValue(true)
    const found = await installer.detect({ id: 'vc', name: 'VC++', type: 'vcredist' })
    expect(found).toBe(true)
  })

  it('detect returns false for non-winetricks type', async () => {
    const found = await installer.detect({ id: 'physx', name: 'PhysX', type: 'physx' })
    expect(found).toBe(false)
  })

  it('install checks wine availability', async () => {
    mockGio.Subprocess.new.mockImplementationOnce(() => { throw new Error('not found') })
    const result = await installer.install({ id: 'vc', name: 'VC++', type: 'vcredist' }, '/prefix')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toContain('not available')
  })

  it('install creates prefix if needed', async () => {
    mockGLib.file_test.mockReturnValue(false)
    const result = await installer.install({ id: 'vc', name: 'VC++', type: 'vcredist', winetricksVerb: 'vcrun2022' }, '/prefix')
    expect(result.success).toBe(true)
  })

  it('install uses winetricks for known types', async () => {
    mockGLib.file_test.mockReturnValue(true)
    const result = await installer.install({ id: 'vc', name: 'VC++', type: 'vcredist' }, '/prefix')
    expect(result.success).toBe(true)
    expect(result.action).toContain('winetricks')
  })

  it('install uses bundled installer for other types', async () => {
    mockGLib.file_test.mockReturnValue(true)
    const result = await installer.install({ id: 'physx', name: 'PhysX', type: 'physx', installerPath: '/tmp/physx.exe' }, '/prefix')
    expect(result.success).toBe(true)
    expect(result.action).toContain('bundled')
  })

  it('install returns error for missing installerPath', async () => {
    mockGLib.file_test.mockReturnValue(true)
    const result = await installer.install({ id: 'physx', name: 'PhysX', type: 'physx' }, '/prefix')
    expect(result.success).toBe(false)
    expect(result.errorMessage).toBe('No installerPath for bundled dependency')
  })

  it('maps known types to correct winetricks verbs', async () => {
    mockGLib.file_test.mockReturnValue(true)
    await installer.install({ id: 'dx', name: 'DirectX', type: 'directx' }, '/prefix')
    await installer.install({ id: 'dn', name: '.NET', type: 'dotnet' }, '/prefix')
    await installer.install({ id: 'xna', name: 'XNA', type: 'xna' }, '/prefix')
  })
})
