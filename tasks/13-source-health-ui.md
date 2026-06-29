# Task 13 — Source Health Indicators & Broken Source UX

## Context
`startHealthChecks()` in `src/controller/health-wirer.ts` already pings sources and calls
`settingsView.updateSourceHealth()`. But the catalog view gives no indication when sources are
broken — games just disappear silently. Goal: show source status in the catalog header, fall
back to cached results when a source fails, and tell the user clearly when content is stale.

## Files to read before starting
- `src/controller/health-wirer.ts` — startHealthChecks(), how SourceHealth is produced
- `src/services/types.ts` — SourceHealth interface { sourceId, status, latencyMs, lastChecked }
- `src/ui/views/catalog-view.ts` — catalog header area, where to add status
- `src/controller/view-interfaces.ts` — ICatalogView interface
- `src/controller/scraper.ts` — scrapeAllSources(), how games are fetched
- `src/services/database-games.ts` — how games are cached in DB
- `src/domain/models.ts` — Game, Source types

## What to implement

### Step 1 — Persist scraped games to DB as cache
File: `src/controller/scraper.ts`

After `scrapeAllSources()` returns games, save them to DB so they survive restarts:
```ts
// After successful scrape of a source:
await db.execute(
  'INSERT OR REPLACE INTO cached_games (source_id, game_data_json, cached_at) VALUES (?, ?, ?)',
  [sourceId, JSON.stringify(games), new Date().toISOString()]
)
```

Add DB table in migrations (`src/services/database-migrations.ts`):
```sql
CREATE TABLE IF NOT EXISTS cached_games (
  source_id TEXT PRIMARY KEY,
  game_data_json TEXT NOT NULL,
  cached_at TEXT NOT NULL
)
```

Add helper to read cache:
```ts
export async function loadCachedGames(db: DatabaseService): Promise<Game[]>
// reads all cached_games rows, parses JSON, returns flat array
```

### Step 2 — Fallback to cache when scraping fails
File: `src/controller/index.ts` — in `init()`:

```ts
// Replace:
this.allGames = await scrapeAllSources(...)

// With:
try {
  this.allGames = await scrapeAllSources(...)
  // success — cache already written per step 1
} catch {
  const cached = await loadCachedGames(this.db)
  this.allGames = cached
  if (cached.length > 0) {
    this.deps.window.showToast('Using cached catalog — sources unreachable', 'normal', 5)
  } else {
    this.deps.window.showToast('Could not load catalog — check your connection', 'high')
  }
}
```

Also handle per-source failures (some sources up, some down) — the scraper should already
handle this; verify it returns partial results rather than throwing.

### Step 3 — ICatalogView: source health methods
File: `src/controller/view-interfaces.ts`

Add to `ICatalogView`:
```ts
setSourceHealth(statuses: SourceHealth[]): void
setLastUpdated(timestamp: string): void   // ISO string of most recent successful scrape
```

### Step 4 — Catalog header status bar
File: `src/ui/views/catalog-view.ts`

Add a subtle status bar below the search bar (not in the header, in the content area):

- When all sources healthy: hidden (no visual noise)
- When 1+ sources down: show `Gtk.InfoBar` with `message_type: Gtk.MessageType.WARNING`:
  "2 sources unavailable — showing cached results from 3 hours ago"
  with a "Retry" button that triggers re-scrape

- When ALL sources down: show `Gtk.InfoBar` with `message_type: Gtk.MessageType.ERROR`:
  "Catalog unavailable — check your internet connection"

Implementation:
```ts
// Subtle banner — not blocking, dismissible
const banner = new Adw.Banner({ title: '', button_label: 'Retry', use_markup: false })
banner.connect('button-clicked', () => onRetry?.())
// Show/hide:
banner.set_revealed(downCount > 0)
banner.set_title(downCount === totalCount
  ? 'Catalog unavailable — check your connection'
  : `${downCount} source${downCount > 1 ? 's' : ''} unavailable — showing cached results`)
```

Use `Adw.Banner` (Libadwaita 1.3+) — native GNOME pattern for non-blocking notices.

### Step 5 — Wire health to catalog view
File: `src/controller/health-wirer.ts`

Currently calls `settingsView.updateSourceHealth()`. Also call `catalogView.setSourceHealth()`:
```ts
// After health check results:
const statuses = sources.map(s => healthMap.get(s.id) ?? defaultHealth(s.id))
catalogView.setSourceHealth(statuses)
```

Add `onRetry` callback to catalog view:
File: `src/controller/view-interfaces.ts` — add to `ICatalogView`:
```ts
onRetryFetch(cb: () => void): void
```

Wire in `src/controller/feature-wirers.ts` `wireCatalogView()`:
```ts
deps.catalogView.onRetryFetch(async () => {
  ctrl.allGames = await scrapeAllSources(...)
  deps.catalogView.setGames(ctrl.allGames)
})
```

### Step 6 — "Last updated" timestamp
File: `src/ui/views/catalog-view.ts`

In the catalog header or status bar, show "Updated 2 hours ago" using `lastChecked` from
SourceHealth. Format relative time: if < 60min → "X minutes ago", else → "X hours ago".

New file: `src/domain/relative-time.ts` (max 30 lines, pure TS):
```ts
export function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${Math.floor(hours / 24)} days ago`
}
```

## Acceptance criteria
- FitGirl scraping fails → catalog shows cached games + Adw.Banner "1 source unavailable"
- All sources fail → Banner shows "Catalog unavailable — check your connection"
- "Retry" button in banner triggers re-scrape
- Banner hidden when all sources healthy
- "Updated X minutes ago" shown in catalog
- App start with no internet → loads cached games, no crash
- `npm run build` passes
- `npm run typecheck` passes
