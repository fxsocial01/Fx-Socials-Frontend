const ADMIN_EMAIL='yasiyrshehu@gmail.com';
function installAdminAccess(){
  try{
    const raw=localStorage.getItem('fxs-user');
    const user=raw?JSON.parse(raw):null;
    if(String(user?.email||'').trim().toLowerCase()!==ADMIN_EMAIL)return;
    if(user.role!=='admin'){user.role='admin';localStorage.setItem('fxs-user',JSON.stringify(user));}
    const add=()=>{
      if(location.hash.replace('#/','').split('?')[0]!=='dashboard')return;
      if([...document.querySelectorAll('button')].some(b=>b.textContent?.trim()==='Admin'))return;
      const buttons=[...document.querySelectorAll('button')];
      const dashboardButton=buttons.find(b=>b.textContent?.includes('My account'));
      const target=dashboardButton?.parentElement;
      if(!target)return;
      const b=document.createElement('button');
      b.textContent='🛠️ Admin';
      b.style.cssText='background:#121212;border:1px solid #2b2b2b;border-radius:16px;color:#fff;padding:18px;text-align:left;font-weight:900;cursor:pointer;display:block;width:100%;';
      b.onclick=()=>{location.hash='#/admin'};
      target.appendChild(b);
    };
    setTimeout(add,100);setTimeout(add,500);window.addEventListener('hashchange',()=>setTimeout(add,100));
  }catch{}
}
installAdminAccess();
window.addEventListener('storage',installAdminAccess);