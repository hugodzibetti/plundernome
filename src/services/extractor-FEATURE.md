# Feature: Extractor Service
## Interface file: src/services/types.ts (IExtractorService)
## Owned files: src/services/extractor.ts
## Depends on: libarchive (gi://Archive) or spawn 7z/unzip/unrar
## Dependents: pipeline (extracting step)
## Formats: .zip, .rar, .7z, .tar.gz, .tar.xz, .iso
## Implementation notes:
- Prefer libarchive via GI for seamless archive handling
- Fallback: spawn external tools (7z, unzip) if libarchive unavailable
- Progress callback: report current file + total progress
- Verify extracted files against expected count
- Support password-protected archives (common in scene releases)