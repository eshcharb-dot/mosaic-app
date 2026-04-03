export type Theme = 'dark' | 'light' | 'system'
export const DEFAULT_THEME: Theme = 'dark'
export const THEME_KEY = 'mosaic_theme'

/** Resolve 'system' to the actual OS preference */
export function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark'
  }
  return theme
}
