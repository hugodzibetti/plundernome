import { _t } from '../../domain/i18n';
import { buildEmptyState } from '../templates/empty-state';

export function createDownloadsEmptyState(browseCatalogHandler: (() => void) | null): GtkBox {
  return buildEmptyState({
    icon: '📥',
    title: _t('downloads.empty.title'),
    description: _t('downloads.empty.description'),
    actionLabel: _t('downloads.empty.action'),
    onAction: browseCatalogHandler ?? undefined,
  });
}
