# Task 09 — Game Detail Dialog: Full Media & Metadata

## Context
`game-detail-dialog.ts` shows basic game info. After task 06 adds IGDB enrichment, the dialog
should show a rich game page: large hero/background image, screenshots carousel, full
description, developer/publisher/release date metadata, and source badges (which sites have
this game). This makes it feel like a real storefront entry rather than a debug popup.

## Prerequisite
Task 06 (IGDB catalog enrichment) must be completed first.

## Files to read before starting
- `src/ui/widgets/game-detail-dialog.ts` — current dialog implementation
- `src/services/metadata-provider.ts` — EnrichedMetadata interface
- `src/ui/templates/detail-dialog.ts` — showDetailDialog() template
- `src/ui/factory.ts` — createButton(), createLabel()
- `src/ui/helpers.ts` — any image loading utilities
- `src/domain/models.ts` — Game type (tags, size, downloadType, repackNotes)

## Layout to implement

```
┌─────────────────────────────────────────────┐
│  [Hero background image — full width, 200h] │
│                                             │
│  Game Title              [Install] [Wishlist]│
│  Developer • Publisher • 2024               │
├─────────────────────────────────────────────┤
│  Description text (wrapped, selectable)     │
├─────────────────────────────────────────────┤
│  [Screenshot] [Screenshot] [Screenshot] →   │  (horizontal scroll)
├─────────────────────────────────────────────┤
│  Details:                                   │
│  Size:          23.4 GB                     │
│  Platform:      Windows (Wine/Proton)       │
│  ProtonDB:      🥇 Gold                     │
│  Sources:       [FitGirl] [DODI]            │
│  Tags:          [Action] [RPG] [Open World] │
├─────────────────────────────────────────────┤
│  Repack Notes (if any):                     │
│  "Lossless repack, all DLC included..."     │
└─────────────────────────────────────────────┘
```

## What to implement

### Step 1 — Refactor dialog into sections
File: `src/ui/widgets/game-detail-dialog.ts`

If file exceeds 150 lines after implementation, split to:
- `game-detail-dialog.ts` — main dialog shell + public API
- `game-detail-hero.ts` — hero image + title + action buttons
- `game-detail-meta.ts` — metadata rows + tags + sources

### Step 2 — Hero section
In `game-detail-hero.ts`:

- Background image: `Gtk.Picture` with `content_fit: Gtk.ContentFit.COVER`
  Height: use `set_size_request(600, 200)` (both dims, convention requires it)
  Load `meta.backgroundUrl ?? meta.coverUrl` asynchronously (see cover caching in task 06)
  
- Title: `Gtk.Label` with CSS class `game-detail-title`, large font via CSS
  `font-size: 1.4em; font-weight: bold`

- Subtitle row: developer • publisher • year
  Parse year from `meta.releaseDate` (ISO date → year only)

- Action buttons row (right-aligned):
  - `createButton('Install', { cssClasses: ['suggested-action', 'pill'] })`
  - `createButton('Wishlist ♡', { cssClasses: ['game-wishlist-btn'] })`

### Step 3 — Screenshots carousel
In `game-detail-dialog.ts` or `game-detail-media.ts`:

Horizontal `Gtk.Box` inside a `Gtk.ScrolledWindow` (correct for horizontal image strip):
```ts
// horizontal image strip — ScrolledWindow correct here
const scroll = new Gtk.ScrolledWindow({
  hscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
  vscrollbar_policy: Gtk.PolicyType.NEVER,
})
```
Each screenshot: `Gtk.Picture` at `set_size_request(284, 160)`, loaded async from cache.
Only render section if `meta.screenshots?.length > 0`.

### Step 4 — Metadata rows
Use `Adw.PreferencesGroup` (no title) with `Adw.ActionRow` for each metadata item:

```ts
// Size row
const sizeRow = new Adw.ActionRow({ title: 'Download Size' })
sizeRow.add_suffix(createLabel(game.size, { cssClasses: ['dim-label'] }))

// Platform row
const platformRow = new Adw.ActionRow({ title: 'Platform' })
platformRow.add_suffix(createLabel('Windows (Wine/Proton)', { cssClasses: ['dim-label'] }))

// ProtonDB row — only if rating available
if (protonRating) {
  const ratingRow = new Adw.ActionRow({ title: 'ProtonDB' })
  ratingRow.add_suffix(createCompatBadge(protonRating))  // reuse existing compat-badge widget
}
```

### Step 5 — Source badges + tags
Sources (which repack sites have this game):
- Small `Gtk.FlowBox` with one chip per source that has the game
- CSS class `source-badge`

Tags:
- `Gtk.FlowBox` with one chip per tag
- CSS class `tag-chip`
- Clicking a tag → navigates to Discover view filtered by that tag (emit callback)

### Step 6 — Repack notes
If `game.repackNotes` is set:
- `Adw.PreferencesGroup` titled "Repack Notes"
- `Gtk.Label` inside with the notes text (selectable, wrap=true)

### Step 7 — Update dialog public API
Add method: `setEnrichedMetadata(meta: EnrichedMetadata): void`
Called from catalog view after IGDB returns data (async — dialog may already be open).

## Acceptance criteria
- Dialog opens instantly with basic info (title, size, install button)
- Hero image loads within ~2s if IGDB found it
- Screenshots appear in horizontal scrollable strip
- Developer/publisher/year shown in subtitle
- ProtonDB badge shown if rating available
- Source badges show which repack sites have the game
- Repack notes visible when present
- `npm run build` passes
- `npm run typecheck` passes
