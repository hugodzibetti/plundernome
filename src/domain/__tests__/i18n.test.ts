import { describe, it, expect, beforeEach } from 'vitest'
import { _t, setLocale, getCurrentLocale, registerTranslations } from '../i18n'
import type { Locale } from '../i18n'
import { enTranslations } from '../translations/en'
import { enUiTranslations } from '../translations/en-ui'
import { deTranslations } from '../translations/de'

beforeEach(() => {
  setLocale('en')
  registerTranslations({ en: { ...enTranslations, ...enUiTranslations }, de: deTranslations })
})

describe('i18n', () => {
  it('returns correct English string for known key', () => {
    expect(_t('catalog.search.placeholder')).toBe('Search games\u2026')
  })

  it('returns key itself for missing key', () => {
    expect(_t('nonexistent.key')).toBe('nonexistent.key')
  })

  it('switch to German returns German strings', () => {
    setLocale('de')
    expect(_t('catalog.search.placeholder')).toBe('Spiele suchen\u2026')
  })

  it('getCurrentLocale returns correct locale', () => {
    expect(getCurrentLocale()).toBe('en')
    setLocale('de')
    expect(getCurrentLocale()).toBe('de')
  })

  it('setLocale switches language back and forth', () => {
    expect(_t('common.download')).toBe('Download')
    setLocale('de')
    expect(_t('common.download')).toBe('Herunterladen')
    setLocale('en')
    expect(_t('common.download')).toBe('Download')
  })

  it('returns all defined English keys', () => {
    for (const [key, value] of Object.entries(enTranslations)) {
      expect(_t(key)).toBe(value)
    }
  })

  it('returns all defined German keys', () => {
    setLocale('de')
    for (const [key, value] of Object.entries(deTranslations)) {
      expect(_t(key)).toBe(value)
    }
  })

  it('registerTranslations adds new keys without overwriting existing', () => {
    registerTranslations({ en: { 'test.custom': 'Custom' } })
    expect(_t('test.custom')).toBe('Custom')
    expect(_t('catalog.search.placeholder')).toBe('Search games\u2026')
  })

  it('missing locale returns keys as-is', () => {
    setLocale('fr' as Locale)
    expect(_t('catalog.search.placeholder')).toBe('catalog.search.placeholder')
  })
})