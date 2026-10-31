import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import AppFixed from './AppFixed';
import './index.css';
import './services-auth-fix';
import './wallet-fix';
import './admin-tools';
import './admin-refund-controls';
import './payment-fix';
import './admin-access';
import './dashboard-polish';
import './customer-ui';
import './boosting-polish';
import './account-orders-fix';

const root = createRoot(document.getElementById('root')!);
root.render(<StrictMode><AppFixed /></StrictMode>);
