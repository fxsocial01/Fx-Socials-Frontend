import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ServicesPage from './ServicesPage';
import './index.css';
import './admin-tools';
import './payment-fix';

const isServicesPage=()=>location.hash.replace('#/','').split('?')[0]==='services';
const root=createRoot(document.getElementById('root')!);
const render=()=>root.render(<StrictMode>{isServicesPage()?<ServicesPage/>:<App/>}</StrictMode>);
render();
addEventListener('hashchange',render);
