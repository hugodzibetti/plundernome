# Task 07 — Discover View (Featured / Trending / Categories)

## Context
No Discover view currently exists. The catalog is a flat searchable list. Goal: a store-like
Discover page where users can browse by category, see featured/trending games, and explore
without knowing what they want. This is the main "browse" experience that makes the app feel
like a polished gaming hub rather than a list.

## Files to read before starting
- `src/ui/views/catalog-view.ts` — existing catalog, patterns to reuse
- `src/ui/views/home-view.ts` — home dashboard, horizontal scroll sections to copy
- `src/ui/templates/grid-content.ts` — createGridContent() for game grids
- `src/ui/templates/scroll-content.ts` — createScrollContent()
- `src/ui/widgets/game-card.ts` — GameCard widget (reuse as-is)
- `src/ui/factory.ts` — createButton(), createLabel()
- `src/ui/window.ts` — how views are registered in sidebar navigation
- `src/controller/view-interfaces.ts` — interfaces (add IDiscoverView here)
- `src/domain/catalog/search.ts` — filtering/sorting functions available
- `src/controller/feature-wirers.ts` — wireAllFeatures() — add wireDiscoverView() here
- `src/domain/models.ts` — Game, tags field

## What to implement

### Step 1 — IDiscoverView interface
File: `src/controller/view-interfaces.ts`

Add:
```ts
export interface IDiscoverView {
  setFeatured(games: Game[]): void        // hero banner games (top 5 newest, large)
  setTrending(games: Game[]): void        // 12 games sorted by recency
  setCategories(tags: string[]): void     // unique tags from all games
  setCategory(tag: string, games: Game[]): void  // games for selected category
  onDownloadGame(cb: (gameId: string) => void): void
  onSelectCategory(cb: (tag: string) => void): void
}
```

### Step 2 — DiscoverView widget
New file: `src/ui/views/discover-view.ts` (split if >150 lines → `discover-sections.ts`)

Extends `Adw.Bin`. Layout (top to bottom, in a `createScrollContent()`):

**Hero banner** (featured games):
- `Gtk.Box` horizontal, height 220px, `set_size_request(-1, 220)` — NO, must be `(someWidth, 220)`
  Actually use `halign: Gtk.Align.FILL, vexpand: false` instead of set_size_request for height
- 3-5 large game cards side by side with cover art prominent
- "New & Notable" heading above

**Category chips row**:
- `Gtk.Box` horizontal with `Gtk.ScrolledWindow` (horizontal, no vertical bar) 
  — this is the horizontal chips case where ScrolledWindow is correct, comment it
- Each category: small `Gtk.Button` with CSS class `category-chip`
- Click → calls `onSelectCategory` callback → view calls `setCategory(tag, games)`

**Trending section**:
- Heading "Trending"
- `createGridContent(4, games)` — 4 column game card grid

**Category section** (appears when category selected, replaces trending):
- Heading shows selected category name
- Back button to return to trending
- `createGridContent(4, filteredGames)`

### Step 3 — Register in window
File: `src/ui/window.ts`

Add "discover" to sidebar navigation alongside "home", "catalog", "library".
Follow exact pattern used for other views. Icon: `"compass-symbolic"` or `"system-search-symbolic"`.

Add `getDiscoverView(): IDiscoverView` method following same pattern as `getCatalogView()`.

### Step 4 — Wire in controller
File: `src/controller/feature-wirers.ts`

New function `wireDiscoverView(ctrl: AppController, deps: ControllerDeps)`:
```ts
export function wireDiscoverView(ctrl: AppController, deps: ControllerDeps): void {
  const games = ctrl.allGames
  
  // Featured: newest 5 by lastUpdated
  const featured = [...games].sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 5)
  deps.discoverView.setFeatured(featured)
  
  // Trending: newest 24
  deps.discoverView.setTrending(featured.slice(0, 24))
  
  // Categories: unique tags
  const tags = [...new Set(games.flatMap(g => g.tags))].sort()
  deps.discoverView.setCategories(tags)
  
  // Category selection
  deps.discoverView.onSelectCategory(tag => {
    const filtered = games.filter(g => g.tags.includes(tag))
    deps.discoverView.setCategory(tag, filtered)
  })
  
  deps.discoverView.onDownloadGame(ctrl.downloadHandler)
}
```

Call `wireDiscoverView(ctrl, deps)` inside `wireAllFeatures()`.

### Step 5 — Update ControllerDeps
File: `src/controller/types.ts`

Add `discoverView: IDiscoverView` to `ControllerDeps` interface.

## CSS to add (src/ui/style.css)
```css
.category-chip {
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 0.85em;
}
.category-chip:checked,
.category-chip.active {
  background: @accent_bg_color;
  color: @accent_fg_color;
}
```

## Acceptance criteria
- Discover tab appears in sidebar
- Featured section shows 5 newest games with covers
- Category chips are scrollable horizontally
- Clicking a category filters the grid below
- Clicking a game card triggers download handler
- Empty tags → no categories section shown
- `npm run build` passes
- `npm run typecheck` passes
