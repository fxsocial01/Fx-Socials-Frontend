const ADMIN_EMAIL='yasiyrshehu@gmail.com';

function installAdminAccess(){
  try{
    const raw=localStorage.getItem('fxs-user');
    const user=raw?JSON.parse(raw):null;
    if(String(user?.email||'').trim().toLowerCase()!==ADMIN_EMAIL)return;
    if(user.role!=='admin'){
      user.role='admin';
      localStorage.setItem('fxs-user',JSON.stringify(user));
    }
    const clean=()=>{
      if(location.hash.replace('#/','').split('?')[0]!=='dashboard')return;
      // AppFixed already renders the single Admin dashboard tile. Remove legacy injected copies.
      document.querySelectorAll('[data-fxs-legacy-admin]').forEach((node)=>node.remove());
      document.querySelectorAll('button').forEach((button)=>{
        const text=String(button.textContent||'').trim();
        if(text==='🛠️ Admin' || text==='Admin'){
          button.setAttribute('data-fxs-legacy-admin','true');
          button.remove();
        }
      });
    };
    setTimeout(clean,100);
    setTimeout(clean,500);
    window.addEventListener('hashchange',()=>setTimeout(clean,100));
    setInterval(clean,1200);
  }catch{}
}

installAdminAccess();
window.addEventListener('storage',installAdminAccess);
