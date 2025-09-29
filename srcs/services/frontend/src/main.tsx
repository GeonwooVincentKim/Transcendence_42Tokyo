import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import i18n from 'i18next';
import translationEN from './locales/en/translations.json';
import translationJP from './locales/jp/translations.json';
import translationKO from './locales/ko/translations.json';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

  // Initialize i18n
i18n.init({
  lng: 'en', // if using a language detector, do not define the lng option
  debug: true,
  fallbackLng: 'en', // Fallback language if a translation is missing
  ns: ['translation'], // define namespace(s)
  defaultNS: 'translation', // default namespace
  resources: {
	en: {
		translation: translationEN
	},
	jp: {
		translation:translationJP
	},
	ko: {
		translation:translationKO
	}
  }
});
