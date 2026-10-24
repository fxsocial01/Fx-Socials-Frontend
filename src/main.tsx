import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ServicesPage from './ServicesPage';
import BoostingPage from './BoostingPage';
import './index.css';
import './admin-tools';
import './payment-fix';

const route=()=>location.hash.replace('#/','').split('?')[0];
const root=createRoot(document.getElementById('root')!);
const render=()=>root.render(<StrictMode>{route()==='services'?<ServicesPage/>:route()==='boosting'?<BoostingPage/>:<App/>}</StrictMode>);
render();
addEventListener('hashchange',render);
