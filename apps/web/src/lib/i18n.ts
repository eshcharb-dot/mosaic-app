import en from '../i18n/en.json'
import de from '../i18n/de.json'
import fr from '../i18n/fr.json'

export type Locale = 'en' | 'de' | 'fr'
export const translations = { en, de, fr }

// Deep get: t('nav.dashboard') → "Dashboard"
export function getT(locale: Locale) {
  return function t(key: string): string {
    const keys = key.split('.')
    let result: any = translations[locale]
    for (const k of keys) result = result?.[k]
    return typeof result === 'string' ? result : key
  }
}
