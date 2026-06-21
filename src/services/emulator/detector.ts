import type { PlatformID, EmulatorConfig } from '../../domain/emulator/types'
import type { IEmulatorDetector } from '../types'

const KNOWN_EMULATORS = {
  ps1: { binaries: ['duckstation-qt', 'DuckStation'], flatpakIds: ['duckstation'] },
  ps2: { binaries: ['pcsx2-qt', 'PCSX2'], flatpakIds: ['net.pcsx2.PCSX2'] },
  psp: { binaries: ['PPSSPPSDL', 'PPSSPP'], flatpakIds: ['org.ppsspp.PPSSPP'] },
  gamecube: { binaries: ['dolphin-emu', 'Dolphin'], flatpakIds: ['org.DolphinEmu.dolphin-emu'] },
  wii: { binaries: ['dolphin-emu', 'Dolphin'], flatpakIds: ['org.DolphinEmu.dolphin-emu'] },
  ps3: { binaries: ['rpcs3', 'RPCS3'], flatpakIds: ['net.rpcs3.RPCS3'] },
  wiiu: { binaries: ['cemu', 'Cemu'], flatpakIds: ['info.cemu.Cemu'] },
  switch: { binaries: ['ryujinx', 'Ryujinx'], flatpakIds: ['org.ryujinx.Ryujinx'] },
  xbox360: { binaries: ['xenia', 'Xenia'], flatpakIds: [] },
  nes: { binaries: ['mesen', 'Mesen2', 'Mesen'], flatpakIds: ['io.github.SonicMastr.Mesen2'] },
  snes: { binaries: ['bsnes', 'Snes9x', 'snes9x-gtk'], flatpakIds: ['dev.bsnes.bsnes'] },
  n64: { binaries: ['RMG', 'mupen64plus'], flatpakIds: ['io.github.Rosalie241.RMG'] },
  dreamcast: { binaries: ['flycast', 'Flycast'], flatpakIds: ['org.flycast.Flycast'] },
  saturn: { binaries: ['mednafen', 'Mednafen'], flatpakIds: [] },
  genesis: { binaries: ['blastem', 'BlastEm'], flatpakIds: ['com.retrodev.blastem'] },
  gb: { binaries: ['mgba-qt', 'mGBA'], flatpakIds: ['io.mgba.mGBA'] },
  gbc: { binaries: ['mgba-qt', 'mGBA'], flatpakIds: ['io.mgba.mGBA'] },
  gba: { binaries: ['mgba-qt', 'mGBA'], flatpakIds: ['io.mgba.mGBA'] },
  nds: { binaries: ['melonds', 'MelonDS'], flatpakIds: ['net.melonds.MelonDS'] },
  '3ds': { binaries: ['lime3ds', 'Lime3DS', 'Citra'], flatpakIds: ['io.github.lime3ds.Lime3DS'] },
  psvita: { binaries: ['vita3k', 'Vita3K'], flatpakIds: ['org.vita3k.Vita3K'] },
  mame: { binaries: ['mame', 'MAME'], flatpakIds: [] },
  mastersystem: { binaries: ['mednafen', 'Mednafen'], flatpakIds: [] },
  gamegear: { binaries: ['mednafen', 'Mednafen'], flatpakIds: [] },
  pce: { binaries: ['mednafen', 'Mednafen'], flatpakIds: [] },
  ngpocket: { binaries: ['mednafen', 'Mednafen'], flatpakIds: [] },
  wonderswan: { binaries: ['mednafen', 'Mednafen'], flatpakIds: [] },
} as const satisfies Record<PlatformID, { binaries: string[]; flatpakIds: string[] }>

const COMMON_PATHS = ['/usr/bin', '/usr/local/bin', '/snap/bin']

export class EmulatorDetector implements IEmulatorDetector {
  async detectAll(): Promise<EmulatorConfig[]> {
    const results: EmulatorConfig[] = []
    const entries = Object.entries(KNOWN_EMULATORS) as [PlatformID, typeof KNOWN_EMULATORS[PlatformID]][]
    for (const [platformId, { binaries, flatpakIds }] of entries) {
      let emulatorPath: string | null = null
      for (const bin of binaries) {
        emulatorPath = await this.detectBinary(bin)
        if (emulatorPath) break
      }
      if (!emulatorPath) {
        for (const fpid of flatpakIds) {
          emulatorPath = await this.checkFlatpak(fpid)
          if (emulatorPath) break
        }
      }
      if (emulatorPath) {
        results.push({
          platformId,
          emulatorPath,
          romFolders: [],
          launchArgs: [],
        })
      }
    }
    return results
  }

  async detectBinary(binaryName: string): Promise<string | null> {
    const { GLib } = imports.gi
    const inPath = GLib.find_program_in_path(binaryName)
    if (inPath) return inPath
    for (const dir of COMMON_PATHS) {
      const candidate = `${dir}/${binaryName}`
      if (GLib.file_test(candidate, GLib.G_FILE_TEST_EXISTS)) return candidate
    }
    const home = GLib.get_home_dir()
    const localBin = `${home}/.local/bin/${binaryName}`
    if (GLib.file_test(localBin, GLib.G_FILE_TEST_EXISTS)) return localBin
    return null
  }

  async detectEmulator(platformId: PlatformID): Promise<string | null> {
    const def = KNOWN_EMULATORS[platformId]
    if (!def) return null
    for (const bin of def.binaries) {
      const path = await this.detectBinary(bin)
      if (path) return path
    }
    for (const fpid of def.flatpakIds) {
      const path = await this.checkFlatpak(fpid)
      if (path) return path
    }
    return null
  }

  private async checkFlatpak(flatpakId: string): Promise<string | null> {
    const { GLib } = imports.gi
    try {
      const [ok, stdout] = GLib.spawn_command_line_sync('flatpak list --columns=application')
      if (!ok || !stdout) return null
      const output = String.fromCharCode(...new Uint8Array(stdout))
      if (!output.includes(flatpakId)) return null
      const systemPath = `/var/lib/flatpak/exports/bin/${flatpakId}`
      if (GLib.file_test(systemPath, GLib.G_FILE_TEST_EXISTS)) return systemPath
      const home = GLib.get_home_dir()
      const userPath = `${home}/.local/share/flatpak/exports/bin/${flatpakId}`
      if (GLib.file_test(userPath, GLib.G_FILE_TEST_EXISTS)) return userPath
      return `flatpak run ${flatpakId}`
    } catch {
      return null
    }
  }
}
