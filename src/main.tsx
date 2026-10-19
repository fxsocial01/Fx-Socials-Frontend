import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './admin-tools';

// Render serves the live site from fx-socials-site.onrender.com.
// Do not redirect to an unverified custom domain during app startup.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
