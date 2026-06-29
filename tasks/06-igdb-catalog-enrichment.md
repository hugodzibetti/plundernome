# Task 06 — IGDB Metadata in Catalog (Cover Art + Screenshots + Description)

## Context
`MetadataProvider` in `src/services/metadata-provider.ts` fetches from IGDB and SteamGridDB.
`wireMetadataEnrichment` in `src/controller/metadata-wirer.ts` calls it for all games and
calls `catalogView.setEnrichedMetadata(gameId, meta)`. The catalog view receives this data
but current `game-card.ts` likely doesn't show it prominently. Goal: make cover art show in
game cards, descriptions show in game detail dialog, screenshots carousel in detail dialog.

## Files to read before starting
- `src/services/metadata-provider.ts` — EnrichedMetadata interface (lines 1-16)
- `src/controller/metadata-wirer.ts` — how enrichment is called
- `src/ui/widgets/game-card.ts` — current game card, how imageUrl is shown
- `src/ui/widgets/game-card-cover.ts` — cover image widget
- `src/ui/widgets/game-detail-dialog.ts` — full game info modal
- `src/controller/view-interfaces.ts` — ICatalogView.setEnrichedMetadata signature
- `src/ui/views/catalog-view.ts` — how setEnrichedMetadata is currently handled
- `src/ui/factory.ts` — createButton(), available factories

## EnrichedMetadata shape (from metadata-provider.ts)
```ts
interface EnrichedMetadata {
  gameId: string
  name: string
  description?: string
  coverUrl?: string        // ← high-res cover from IGDB
  backgroundUrl?: string
  screenshots?: string[]  // ← array of screenshot URLs
  genres?: string[]
  releaseDate?: string
  developer?: string
  publisher?: string
  igdbId?: number
  steamGridDbId?: number
}
```

## What to implement

### Step 1 — Game card cover art
File: `src/ui/widgets/game-card-cover.ts`

When `setEnrichedMetadata` is called on the catalog view, update each game card to load
the `coverUrl` from IGDB. The cover should:
- Fill the card's image area (follow existing layout)
- Load asynchronously via `Gtk.Picture` with `set_filename()` after downloading
- Show a placeholder (gray box with game initial letter) until loaded
- Cache to `~/.cache/plundernome/covers/{gameId}.jpg` using GLib file write

Pattern for async image load:
```ts
// Download cover URL to cache file using http.downloadFile() or GLib spawn
// Then: picture.set_filename(cachePath)
```

Read `src/services/cover-cache.ts` and `src/services/cover-provider.ts` — these may
already handle caching. Use them if they exist and work, don't reinvent.

### Step 2 — Game detail dialog: description + metadata
File: `src/ui/widgets/game-detail-dialog.ts`

When `EnrichedMetadata` is available for the game, show in the dialog:
- Full description text (use `Gtk.Label` with `wrap=true`, `selectable=true`)
- Release date, developer, publisher as `Adw.ActionRow` rows (label + value)
- Genres as pill badges (small labels with CSS class `genre-badge`)

Add method: `setMetadata(meta: EnrichedMetadata): void`

Call this from the catalog view when the dialog is opened and metadata exists.

### Step 3 — Screenshots carousel
File: `src/ui/widgets/game-detail-dialog.ts` (or split to `game-screenshots.ts` if >150 lines)

Add a screenshots section using `Gtk.ScrolledWindow` with horizontal `Gtk.Box`:
- Each screenshot: `Gtk.Picture` 320×180px, `set_size_request(320, 180, )` — wait, both dims
- Load same async pattern as covers (cache to `~/.cache/plundernome/screenshots/`)
- Only show section if `meta.screenshots?.length > 0`

Note: `Gtk.ScrolledWindow` is normally forbidden (use `Adw.ClampScrollable`), but for a
horizontal image strip it's the correct widget. Add comment: `// horizontal image strip — ScrolledWindow correct here`

### Step 4 — Wire IGDB credentials from Settings
File: `src/services/metadata-provider.ts` — constructor already accepts `igdbClientId` + `igdbClientSecret`

File: `src/services/gsettings.ts` — add keys:
```ts
IGDB_CLIENT_ID: 'igdb-client-id',
IGDB_CLIENT_SECRET: 'igdb-client-secret',
STEAMGRIDDB_KEY: 'steamgriddb-api-key',
```

File: `data/io.github.plundernome.gschema.xml` — add those 3 keys as `type="s"` with `default=''`

File: `src/controller/index.ts` — when creating MetadataProvider, read credentials from settings:
```ts
const igdbId = s.getString(GSETTINGS_KEYS.IGDB_CLIENT_ID)
const igdbSecret = s.getString(GSETTINGS_KEYS.IGDB_CLIENT_SECRET)
this.metadataProvider = new MetadataProvider(this.http, igdbId || undefined, igdbSecret || undefined)
```

### Step 5 — Settings UI for API keys
New file: `src/ui/widgets/metadata-settings-group.ts` (max 100 lines)

`Adw.PreferencesGroup` titled "Metadata & Artwork":
- `Adw.EntryRow` for IGDB Client ID
- `Adw.EntryRow` for IGDB Client Secret  
- `Adw.EntryRow` for SteamGridDB API Key
- Note label: "Without API keys, cover art uses SteamGridDB (no key needed for basic use)"

## Acceptance criteria
- Game cards show cover art from IGDB/SteamGridDB within ~5s of catalog load
- Covers cached to disk — second launch shows covers instantly
- Game detail dialog shows description, developer, release date when IGDB finds it
- Screenshots carousel visible in dialog when screenshots available
- No API keys → SteamGridDB fallback still loads covers (it works without auth for basic use)
- `npm run build` passes
- `npm run typecheck` passes
