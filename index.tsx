
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      /**
       * In preview environments, the application module (index.tsx) might be served from a different 
       * origin (e.g., ai.studio) than the page itself. Resolving sw.js relative to the window's 
       * current location ensures we stay within the same-origin security policy.
       */
      const swUrl = new URL('sw.js', window.location.href).href;
      
      navigator.serviceWorker.register(swUrl).then(reg => {
        console.log('ServiceWorker registration successful with scope: ', reg.scope);
      }).catch(err => {
        /**
         * Many development and sandboxed environments block Service Workers by default.
         * We log this as a debug message to prevent breaking the developer experience 
         * while allowing the app to function normally in production.
         */
        console.debug('ServiceWorker registration skipped or failed (expected in some dev environments):', err);
      });
    } catch (e) {
      console.debug('ServiceWorker setup failed:', e);
    }
  });
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
