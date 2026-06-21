import type { Locale } from '../i18n';
import { registerTranslations } from '../i18n';
import { enTranslations } from './en';
import { enUiTranslations } from './en-ui';
import { deTranslations } from './de';

export function initTranslations(): void {
  registerTranslations({ en: { ...enTranslations, ...enUiTranslations }, de: deTranslations });
}

export { enTranslations, enUiTranslations, deTranslations };

export const availableLocales: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
];
