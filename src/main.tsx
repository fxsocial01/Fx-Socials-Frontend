import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ServicesPage from './ServicesPage';
import BoostingPage from './BoostingPage';
import UnifiedServicesPage from './UnifiedServicesPage';
import './index.css';
import './admin-tools';
import './payment-fix';

const route=()=>location.hash.replace('#/','').split('?')[0];
const root=createRoot(document.getElementById('root')!);
const render=()=>{const r=route();root.render(<StrictMode>{r==='services'||r==='numbers'?<UnifiedServicesPage/>:r==='boosting'?<BoostingPage/>:<App/>}</StrictMode>)};
render();
addEventListener('hashchange',render);
