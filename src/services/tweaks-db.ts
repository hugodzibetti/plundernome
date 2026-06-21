import type { GameID } from '../domain/models'
import type { DatabaseService } from './database'

export interface GameTweak {
  gameId: GameID
  env: Record<string, string>
  runnerArgs: string[]
  dllOverrides: string[]
  notes: string
}

export class TweaksDb {
  private tweaks = new Map<GameID, GameTweak>()

  constructor(private db: DatabaseService) {}

  async loadAll(): Promise<void> {
    const rows = await this.db.query<{ game_id: string; env_json: string; args: string }>(
      'SELECT game_id, env_json, args FROM launch_options'
    )
    for (const row of rows) {
      this.tweaks.set(row.game_id as GameID, {
        gameId: row.game_id as GameID,
        env: JSON.parse(row.env_json),
        runnerArgs: row.args ? row.args.split(' ') : [],
        dllOverrides: [],
        notes: '',
      })
    }
  }

  get(gameId: GameID): GameTweak | undefined {
    return this.tweaks.get(gameId)
  }

  async set(tweak: GameTweak): Promise<void> {
    this.tweaks.set(tweak.gameId, tweak)
    await this.db.execute(
      'INSERT OR REPLACE INTO launch_options (game_id, env_json, args) VALUES (//1, //2, //3)',
      [tweak.gameId, JSON.stringify(tweak.env), tweak.runnerArgs.join(' ')],
    )
  }

  async remove(gameId: GameID): Promise<void> {
    this.tweaks.delete(gameId)
    await this.db.execute('DELETE FROM launch_options WHERE game_id = //1', [gameId])
  }
}
