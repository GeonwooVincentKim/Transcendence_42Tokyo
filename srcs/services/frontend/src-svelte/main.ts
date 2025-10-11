import './app.css'
import App from './App.svelte'
import { register, init, getLocaleFromNavigator } from 'svelte-i18n'

// Initialize i18n with explicit locale
const initialLocale = getLocaleFromNavigator() || 'en'

// Register translation files with async imports
register('en', () => import('./shared/locales/locales/en/translations.json').then(m => m.default))
register('ko', () => import('./shared/locales/locales/ko/translations.json').then(m => m.default))
register('jp', () => import('./shared/locales/locales/jp/translations.json').then(m => m.default))

// Initialize i18n and wait for it to be ready
init({
  fallbackLocale: 'en',
  initialLocale: initialLocale,
  loadingDelay: 100,
  warnOnMissingMessages: false,
}).then(() => {
  // Create app only after i18n is initialized
  const app = new App({
    target: document.getElementById('app')!,
  })
  
  // Export the app instance
  window.svelteApp = app
}).catch((error) => {
  console.error('Failed to initialize i18n:', error)
  // Fallback: create app anyway
  const app = new App({
    target: document.getElementById('app')!,
  })
  window.svelteApp = app
})

// Export a placeholder for now
export default null

