import { register, init, getLocaleFromNavigator } from 'svelte-i18n'

// Initialize i18n with explicit locale
const initialLocale = getLocaleFromNavigator() || 'en'

// Register translation files with async imports
register('en', () => import('../shared/locales/en/translations.json').then(m => m.default))
register('ko', () => import('../shared/locales/ko/translations.json').then(m => m.default))
register('jp', () => import('../shared/locales/jp/translations.json').then(m => m.default))

init({
  fallbackLocale: 'en',
  initialLocale: initialLocale,
  loadingDelay: 100,
  warnOnMissingMessages: false,
})