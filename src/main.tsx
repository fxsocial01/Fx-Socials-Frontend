import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './admin-tools';

// Keep the public custom domain canonical. If someone opens the Render
// subdomain, immediately move them to the branded domain while preserving
// the path, query string, and hash.
if (window.location.hostname === 'fx-socials-site.onrender.com') {
  window.location.replace(
    `https://fxsocials.top${window.location.pathname}${window.location.search}${window.location.hash}`
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
