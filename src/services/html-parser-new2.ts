import type { Game } from '../domain/models';
import type { SourceDefinition } from '../domain/catalog/types';
import type { IHTMLParserService } from './html-parser-types';
import { HtmlParserService } from './html-parser';

export class HtmlParserServiceNew2 extends HtmlParserService implements IHTMLParserService {
  // Inherits parseGames() from HtmlParserService
  // All source-specific parsing is now config-driven
}
