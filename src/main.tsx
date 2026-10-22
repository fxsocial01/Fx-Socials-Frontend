import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ServicesPage from './ServicesPage';
import './index.css';
import './admin-tools';
import './payment-fix';

const isServicesPage=()=>location.hash.replace('#/','').split('?')[0]==='services';
const root=createRoot(document.getElementById('root')!);
const QuickServices=()=> <div style={{position:'sticky',top:0,zIndex:9999,display:'flex',gap:10,justifyContent:'center',padding:'10px 14px',background:'#fff',borderBottom:'1px solid #e5e7eb'}}><button onClick={()=>{location.hash='#/marketplace'}} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>Buy Account</button><button onClick={()=>{location.hash='#/services'}} style={{padding:'10px 18px',borderRadius:10,border:'0',background:'#111827',color:'#fff',fontWeight:700,cursor:'pointer'}}>Buy Number</button><button onClick={()=>{location.hash='#/services?tab=esim'}} style={{padding:'10px 18px',borderRadius:10,border:'1px solid #d1d5db',background:'#fff',fontWeight:700,cursor:'pointer'}}>Buy eSIM</button></div>;
const render=()=>root.render(<StrictMode>{isServicesPage()?<ServicesPage/>:<><QuickServices/><App/></>}</StrictMode>);
render();
addEventListener('hashchange',render);
