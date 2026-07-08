# Feature: Launcher
## Interface file: src/services/types.ts (ILauncher)
## Owned files: src/services/launcher.ts
## Depends on: domain/compat (CompatProfile), domain/models (Game)
## Dependents: pipeline (registering step), UI play button
## Implementation notes:
- launch(executable, compatProfile): spawn wine/proton with correct env
- Detect wine/proton versions: system wine, flatpak wine, GE-Proton
- Build env: WINEPREFIX, WINEDLLOVERRIDES, DXVK_HUD, MANGOHUD
- createDesktopEntry(): write .desktop to ~/.local/share/applications/
- Support Gamescope launch option
- Handle game exit gracefully (cleanup, log play time)