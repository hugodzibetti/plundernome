# Feature: Compat Detector
## Interface file: src/domain/compat/types.ts
## Owned files: src/domain/compat/*
## Depends on: domain/models.ts (stable)
## Dependents: pipeline (installing-deps step), UI compat-view
## Test command: npx vitest src/domain/__tests__/compat.test.ts
## Agent notes: Pure TS, no GI. Scans FileEntry[] → CompatProfile.
## Current heuristics: exe→Wine, ELF→native, dep keywords (vcredist, directx, dotnet, xna, physx, openal), arch detection, Steam stub detection.
## Extending: add keywords to `detectDependencies()`, test with fixture file lists.
