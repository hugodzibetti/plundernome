import type { Locale } from '../i18n'
import { registerTranslations } from '../i18n'
import { enTranslations } from './en'
import { deTranslations } from './de'

registerTranslations({ en: enTranslations, de: deTranslations })

export { enTranslations, deTranslations }

export const availableLocales: { code: Locale; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'Deutsch' },
]