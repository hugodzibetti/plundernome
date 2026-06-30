import type { Game } from '../domain/models';
import { createGameID } from '../domain/identity';
import type { DatabaseService } from './database';

const { GLib } = imports.gi;

const HEROIC_CONFIG = `${GLib.get_home_dir()}/.config/heroic`;

interface HeroicGameData {
  app_name: string;
  title: string;
  install?: { install_path?: string };
  art_cover?: string;
  install_size?: number;
  is_installed?: boolean;
  platform?: string;
}

interface LegendaryData {
  library: HeroicGameData[];
}

interface GOGData {
  games: HeroicGameData[];
}

export class HeroicService {
  constructor(private db: DatabaseService) {}

  isHeroicInstalled(): boolean {
    return GLib.file_test(HEROIC_CONFIG, GLib.FileTest.IS_DIR);
  }

  async importLibrary(): Promise<number> {
    let imported = 0;
    imported += await this.importSource(
      `${HEROIC_CONFIG}/library/legendary.json`,
      'epic',
      'library',
    );
    imported += await this.importSource(
      `${HEROIC_CONFIG}/gog_store/library.json`,
      'gog',
      'games',
    );
    return imported;
  }

  private async importSource(
    path: string,
    sourceId: string,
    key: string,
  ): Promise<number> {
    const [ok, bytes] = GLib.file_get_contents(path);
    if (!ok || !bytes) return 0;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return 0;
    }

    const items = parsed[key] as HeroicGameData[] | undefined;
    if (!items || !Array.isArray(items)) return 0;

    let count = 0;
    for (const item of items) {
      if (!item.app_name || !item.title) continue;
      const gameId = createGameID('heroic', `${sourceId}:${item.app_name}`);
      const game: Game = {
        id: gameId,
        name: item.title,
        sourceId: 'heroic',
        sourceGameId: `${sourceId}:${item.app_name}`,
        url: '',
        description: '',
        size: '',
        sizeBytes: item.install_size ?? 0,
        lastUpdated: new Date().toISOString(),
        downloadType: 'direct',
        imageUrl: item.art_cover,
        tags: [item.platform ?? 'Windows'],
      };
      await this.db.insertGame(game);
      count++;
    }
    return count;
  }
}
