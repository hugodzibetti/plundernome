export type Locale = 'en' | 'de'

export type TranslationMap = Record<string, Record<string, string>>

let currentLocale: Locale = 'en'
let translations: TranslationMap = {}

function getTranslation(key: string): string {
  const localeMap = translations[currentLocale]
  if (!localeMap) return key
  return localeMap[key] ?? key
}

export function _t(key: string): string {
  return getTranslation(key)
}

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getCurrentLocale(): Locale {
  return currentLocale
}

export function registerTranslations(map: TranslationMap): void {
  for (const [locale, keys] of Object.entries(map)) {
    translations[locale] ??= {}
    Object.assign(translations[locale], keys)
  }
}