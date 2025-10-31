import './app.css'
import App from './App.svelte'
import { waitLocale } from 'svelte-i18n';
import './lib/i18n'; 

async function initApp() {
  await waitLocale(); 

  // Once loaded, mount the Svelte application
  const app = new App({
    target: document.getElementById('app')!,
  });

  return app;
}

initApp();

export default null

