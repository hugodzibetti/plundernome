# Plundernome — Project State

All 13 implementation tasks complete.

## Feature summary

| # | Feature | Key files |
|---|---------|-----------|
| 01 | Debrid backends (Real-Debrid, AllDebrid, Premiumize) | `services/debrid-resolver.ts`, `services/debrid-types.ts` |
| 02 | Hoster link resolution (GoFile, MediaFire, Pixeldrain, DataNodes) | `services/hosters/resolver.ts` |
| 03 | ProtonDB auto-select Proton version before launch | `services/proton-selector.ts` |
| 04 | Heroic Games Launcher import (Epic + GOG) | `services/heroic-service.ts`, `widgets/heroic-settings-group.ts` |
| 05 | Auto cloud save backup on game exit (ludusavi) | `widgets/cloud-save-settings-group.ts`, play handler wiring |
| 06 | IGDB metadata enrichment (covers, descriptions, screenshots) | `widgets/metadata-settings-group.ts`, catalog wiring |
| 07 | Discover view (featured, trending, category browse) | `views/discover-view.ts` |
| 08 | Settings accounts page (debrid, cloud, IGDB config) | `widgets/debrid-settings-group.ts`, settings integration |
| 09 | Game detail dialog (hero, screenshots carousel, metadata) | `widgets/game-detail-hero.ts`, `game-detail-media.ts`, `game-detail-meta.ts` |
| 10 | Adaptive layout (OverlaySplitView + breakpoint) | `ui/window.ts` |
| 11 | Lutris library import | `services/lutris-service.ts`, `widgets/lutris-settings-group.ts` |
| 12 | Error recovery UX (human messages, action buttons) | `domain/error-messages.ts`, `widgets/pipeline-error-dialog.ts` |
| 13 | Source health UI (cached games, health banner) | `services/cached-games.ts`, health banner in catalog-view |

## Gates

- typecheck: 0 errors
- build: dist/main.js + dist/launch-entry.js syntax OK
- domain tests: 272/272 pass
- working tree: clean, 5 commits ahead of origin/master

## Agent docs

| File | Contents |
|------|----------|
| `AGENTS.md` | Thin index referencing split docs |
| `ARCHITECTURE.md` | Stack, layers, feature isolation, ownership |
| `COMMANDS.md` | Build/test/verify commands, CI, dev workflow |
| `CONVENTIONS.md` | File limits, naming, style, GJS traps, UI rules, types |
| `PROJECT-STATE.md` | This file |
| `README.md` | Human-facing project readme |
