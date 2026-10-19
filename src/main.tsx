import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './admin-tools';

// Canonical public URL: move the Render hostname to the custom domain.
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
