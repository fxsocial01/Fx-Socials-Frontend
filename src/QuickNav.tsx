export default function QuickNav(){
 const go=(path:string)=>{location.hash=`#/${path}`};
 const openApi=()=>{window.open('https://fx-socials-api.onrender.com/developers','_blank','noopener,noreferrer')};
 let isAdmin=false;
 try{
  const saved=JSON.parse(localStorage.getItem('fxs-user')||'null');
  isAdmin=String(saved?.role||'').toLowerCase()==='admin' && String(saved?.email||'').toLowerCase()==='yasiyrshehu@gmail.com';
 }catch{}
 const items=[
  ['subscriptions','Digital subscriptions'],
  ['services','Buy number'],
  ['services?tab=esim','Buy eSIM'],
  ['boosting','Boost social media'],
  ['support','Customer support'],
  ['how','How it works'],
  ['dashboard','My account'],
  ...(isAdmin?[['admin','Admin']]:[]),
 ];
 return <nav className="quick-nav" aria-label="FX Socials main menu">
  {items.map(([path,label])=><button key={path} onClick={()=>go(path)}>{label}</button>)}
  <button onClick={openApi}>Developer API</button>
 </nav>;
}
