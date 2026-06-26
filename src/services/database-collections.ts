import type { GameID } from '../domain/models'

interface DbCtx {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<number>
}

export interface Collection {
  id: string
  name: string
  createdAt: string
  gameCount?: number
}

export async function createCollection(ctx: DbCtx, name: string): Promise<string> {
  const id = imports.gi.GLib.uuid_string_random()
  await ctx.execute('INSERT INTO collections (id, name) VALUES (//1, //2)', [id, name])
  return id
}

export async function deleteCollection(ctx: DbCtx, id: string): Promise<void> {
  await ctx.execute('DELETE FROM collection_games WHERE collection_id = //1', [id])
  await ctx.execute('DELETE FROM collections WHERE id = //1', [id])
}

export async function renameCollection(ctx: DbCtx, id: string, name: string): Promise<void> {
  await ctx.execute('UPDATE collections SET name = //1 WHERE id = //2', [name, id])
}

export async function getAllCollections(ctx: DbCtx): Promise<Collection[]> {
  return ctx.query<Collection>(
    `SELECT c.id, c.name, c.created_at as createdAt,
     (SELECT COUNT(*) FROM collection_games cg WHERE cg.collection_id = c.id) as gameCount
     FROM collections c ORDER BY c.name`,
  )
}

export async function addGameToCollection(ctx: DbCtx, collectionId: string, gameId: GameID): Promise<void> {
  await ctx.execute('INSERT OR IGNORE INTO collection_games (collection_id, game_id) VALUES (//1, //2)', [collectionId, gameId])
}

export async function removeGameFromCollection(ctx: DbCtx, collectionId: string, gameId: GameID): Promise<void> {
  await ctx.execute('DELETE FROM collection_games WHERE collection_id = //1 AND game_id = //2', [collectionId, gameId])
}

export async function getCollectionGames(ctx: DbCtx, collectionId: string): Promise<GameID[]> {
  const rows = await ctx.query<{ game_id: string }>('SELECT game_id FROM collection_games WHERE collection_id = //1 ORDER BY added_at', [collectionId])
  return rows.map((r) => r.game_id)
}

export async function getGameCollections(ctx: DbCtx, gameId: GameID): Promise<Collection[]> {
  return ctx.query<Collection>(
    `SELECT c.id, c.name, c.created_at as createdAt FROM collections c
     INNER JOIN collection_games cg ON cg.collection_id = c.id
     WHERE cg.game_id = //1 ORDER BY c.name`,
    [gameId],
  )
}
