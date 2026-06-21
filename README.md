# Plundernome — Game repack browser and downloader for Linux

Plundernome is a GTK4 + Libadwaita desktop application for browsing, downloading, and launching repackaged games from community sources. Built on GJS (GNOME JavaScript) runtime.

## Features

- Browse game catalogs from multiple sources (FitGirl, DODI, SteamRIP, Online-Fix, GOG Games)
- Search and filter games
- Download with adaptive concurrency and speed limiting
- Extract archives automatically
- Wine/Proton compatibility detection
- Launch games with custom options
- Steam library import
- GE-Proton management
- Playtime tracking and analytics
- Backup & restore (JSON export/import)
- LAN library sync
- Auto-update catalogs
- Notifications on download completion
- Per-game launch options editor
- Desktop shortcut export
- Pipeline progress with retry and mirror fallback

## Architecture

- **Domain** — Pure TypeScript types, state machines, catalog parsers, compat detector. Zero GJS imports. Testable with vitest.
- **Services** — Thin GJS wrappers: HTTP (libsoup 3), Database (Gda/SQLite), Extractor (7z/libarchive), Dependency installer (winetricks), Launcher (wine/proton).
- **UI** — GTK4 + Libadwaita views: Catalog, Downloads, Library, Settings.
- **Controller** — Wires domain logic to services and UI.

## Dependencies

- GNOME 48 runtime (or later)
- GJS (GNOME JavaScript)
- GTK 4 + Libadwaita
- libsoup 3
- Gda (GNOME Data Access)
- Node.js + esbuild (build-time only)

## Build & Run

### Development build
```bash
npm install
npm run build
gjs dist/main.js
```

### Flatpak build
```bash
flatpak-builder --force-clean build flatpak/io.github.plundernome.json
flatpak-builder --run build flatpak/io.github.plundernome.json plundernome
```

## Project Structure

```
src/
├── main.ts              Entry point
├── gjs.d.ts             GJS ambient declarations
├── controller/          Application controller wiring services to UI views
├── domain/              Pure TS types + logic
│   ├── models.ts
│   ├── pipeline.ts
│   ├── catalog/         Source definitions + parsers
│   ├── compat/          Wine/Proton detection
│   └── __tests__/       Vitest tests
├── services/            GJS service implementations
│   ├── http.ts          libsoup client
│   ├── database.ts      SQLite via Gda
│   ├── extractor.ts     Archive extraction
│   ├── launcher.ts      Wine/Proton launcher
│   ├── dependency.ts    Winetricks
│   └── ...
├── sources/             11 source JSON definitions + TypeScript type modules
└── ui/                  GTK4 widgets + views
    ├── templates/        Reusable layout templates (scroll, grid, list, settings, action bar, detail dialog)
    ├── window.ts
    ├── views/            Catalog, Library, Downloads, Settings
    ├── widgets/          GameCard, ProgressBar, etc.
    └── style.css
```

## Testing

```bash
npm test              Vitest (domain logic)
npm run typecheck     TypeScript check
npm run test:smoke    Smoke tests
```

## License

MIT — see [LICENSE](LICENSE).
