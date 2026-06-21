import type { DatabaseService } from '../services/database'
import type { ICatalogView } from './view-interfaces'

export function wireWishlist(
  catalogView: ICatalogView,
  db: DatabaseService,
): void {
  catalogView.onToggleWishlist(async (gameId, wishlisted) => {
    try {
      await db.setWishlisted(gameId, wishlisted)
    } catch (e: unknown) {
      console.error('Wishlist update failed:', e)
    }
  })
}
