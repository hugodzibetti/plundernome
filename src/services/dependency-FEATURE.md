# Feature: Dependency Installer
## Interface file: src/services/types.ts (IDependencyInstaller)
## Owned files: src/services/dependency.ts
## Depends on: domain/compat (CompatProfile), domain/models (Dependency)
## Dependents: pipeline (installing-deps step)
## Dep types: vcredist, directx, dotnet, xna, physx, openal
## Implementation notes:
- detect(dep): check if already installed in prefix
- install(dep, prefix): run bundled installer silently, or use winetricks
- winetricks verbs map: vcrun2022, directx9, dotnet48, xna, physx, openal
- Log install output for debugging
- Support silent install flags: /quiet, /Q, /S