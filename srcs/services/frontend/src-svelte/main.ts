import './app.css'
import App from './App.svelte'
import { register, init, getLocaleFromNavigator } from 'svelte-i18n'

// Initialize i18n with explicit locale
// Check localStorage first, then use 'jp' as default (since this is a Japanese project)
const storedLocale = localStorage.getItem('locale');
const initialLocale = storedLocale || 'jp'

// Register translation files with async imports
// Use fetch to load translations from public folder at runtime
register('en', async () => {
  try {
    const response = await fetch('/locales/en/translations.json');
    if (!response.ok) throw new Error('Failed to load translations');
    return await response.json();
  } catch (error) {
    console.error('Failed to load English translations:', error);
    // Return empty object as fallback
    return {};
  }
})
register('ko', async () => {
  try {
    const response = await fetch('/locales/ko/translations.json');
    if (!response.ok) throw new Error('Failed to load translations');
    return await response.json();
  } catch (error) {
    console.error('Failed to load Korean translations:', error);
    return {};
  }
})
register('jp', async () => {
  try {
    const response = await fetch('/locales/jp/translations.json');
    if (!response.ok) throw new Error('Failed to load translations');
    return await response.json();
  } catch (error) {
    console.error('Failed to load Japanese translations:', error);
    return {};
  }
})

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

