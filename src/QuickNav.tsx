export default function QuickNav(){
 const go=(path:string)=>{location.hash=`#/${path}`};
 const items=[
  ['marketplace','Buy accounts'],
  ['services','Buy number'],
  ['services?tab=esim','Buy eSIM'],
  ['boosting','Boost social media'],
  ['sell','Sell account'],
  ['support','Customer support'],
  ['how','How it works'],
  ['dashboard','My account'],
 ];
 let isAdmin=false;
 try{
  const u=JSON.parse(localStorage.getItem('fxs-user')||'null');
  isAdmin=String(u?.role||'').toLowerCase()==='admin';
 }catch{}
 if(isAdmin) items.push(['admin','Admin']);
 return <nav className="quick-nav" aria-label="FX Socials main menu">
  {items.map(([path,label])=><button key={path} onClick={()=>go(path)}>{label}</button>)}
 </nav>;
}
