import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppFixed from './AppFixed';
import './index.css';
import './admin-tools';
import './payment-fix';
import './admin-access';
import './dashboard-polish';
import './customer-ui';
import './boosting-polish';
import './us-number-servers';

const root = createRoot(document.getElementById('root')!);
root.render(<StrictMode><AppFixed /></StrictMode>);
