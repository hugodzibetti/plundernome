# Plundernome — Task Queue for DeepSeek

Execute tasks in order. Each task is self-contained: read listed files, implement exactly what's described, run `npm run build` before declaring done.

## Rules (always apply)
- Read AGENTS.md first every session
- Max 150 lines/file — split if exceeded
- No `new Gtk.Button()` — use `createButton()` from `src/ui/factory.ts`
- No `as any` — use `unknown` + narrowing
- Domain layer (`src/domain/`) — zero GI imports allowed
- Run `npm run build` after every task. Must pass.
- Run `npm run typecheck` after every task. Must pass.

## Task Queue

| # | File | Feature | Priority |
|---|------|---------|----------|
| 1 | `01-wire-debrid.md` | Wire RealDebrid/AllDebrid into download flow | CRITICAL |
| 2 | `02-hoster-resolution.md` | Resolve GoFile/MediaFire/Pixeldrain links before download | CRITICAL |
| 3 | `03-protondb-auto-select.md` | Auto-select Proton version from ProtonDB before launch | HIGH |
| 4 | `04-heroic-import.md` | Import Heroic (Epic/GOG) library into unified library | HIGH |
| 5 | `05-ludusavi-auto-backup.md` | Auto-backup saves to WebDAV on game exit | HIGH |
| 6 | `06-igdb-catalog-enrichment.md` | Show cover art + screenshots + description in catalog | HIGH |
| 7 | `07-discover-view.md` | Discover view: featured/trending/categories browsing | MEDIUM |
| 8 | `08-settings-accounts.md` | Settings: debrid API keys + IGDB credentials | MEDIUM |
| 9 | `09-game-detail-media.md` | Game detail dialog: screenshots carousel + full metadata | MEDIUM |
| 10 | `10-adaptive-layout.md` | AdwBreakpoint responsive layout for small windows | LOW |
| 11 | `11-lutris-import.md` | Import Lutris library (GOG, itch.io, custom Wine games) | HIGH |
| 12 | `12-error-recovery-ux.md` | Human-readable errors + retry/mirror actions for all failures | HIGH |
| 13 | `13-source-health-ui.md` | Source health indicators, cached fallback, retry banner | HIGH |
