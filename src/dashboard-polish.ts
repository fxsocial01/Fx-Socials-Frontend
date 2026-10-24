function polishDashboard(){
  if(location.hash.replace('#/','').split('?')[0]!=='dashboard')return;
  const heading=[...document.querySelectorAll('h1')].find((node)=>String(node.textContent||'').trim().startsWith('Hello,'));
  if(!heading)return;
  const section=heading.closest('section') as HTMLElement|null;
  if(!section)return;
  section.style.background='linear-gradient(145deg,#0d0d0d,#090909 65%,#111)';
  section.style.border='1px solid #292929';
  section.style.borderRadius='28px';
  section.style.padding='clamp(26px,5vw,48px)';
  section.style.boxShadow='0 28px 90px rgba(0,0,0,.38)';
  section.style.marginTop='18px';
  const grid=[...section.querySelectorAll('div')].find((node)=>[...node.children].every((child)=>child.tagName==='BUTTON')&&node.children.length>4) as HTMLElement|null;
  if(!grid)return;
  grid.style.display='grid';
  grid.style.gridTemplateColumns='repeat(3,minmax(0,1fr))';
  grid.style.gap='16px';
  grid.style.marginTop='36px';
  [...grid.querySelectorAll('button')].forEach((button:any)=>{
    button.style.minHeight='154px';
    button.style.padding='22px';
    button.style.borderRadius='22px';
    button.style.border='1px solid #2b2b2b';
    button.style.background='linear-gradient(145deg,#121212,#0b0b0b)';
    button.style.boxShadow='0 16px 35px rgba(0,0,0,.28)';
    button.style.transition='transform .18s ease, border-color .18s ease, background .18s ease';
    const spans=button.querySelectorAll('span');
    if(spans[0]){
      spans[0].style.fontSize='34px';
      spans[0].style.marginBottom='12px';
      spans[0].style.filter='saturate(1.15)';
    }
    const label=button.querySelector('b');
    if(label){label.style.fontSize='19px';label.style.lineHeight='1.15';}
    button.onmouseenter=()=>{button.style.transform='translateY(-3px)';button.style.borderColor='#555';button.style.background='linear-gradient(145deg,#181818,#0d0d0d)';};
    button.onmouseleave=()=>{button.style.transform='translateY(0)';button.style.borderColor='#2b2b2b';button.style.background='linear-gradient(145deg,#121212,#0b0b0b)';};
  });
  const media=document.getElementById('fxs-dashboard-polish');
  if(media)return;
  const style=document.createElement('style');
  style.id='fxs-dashboard-polish';
  style.textContent=`@media(max-width:800px){.fxs-dashboard-placeholder{display:none} .dashboard-polish-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}} @media(max-width:470px){.dashboard-polish-grid{grid-template-columns:1fr!important}.dashboard-polish-grid button{min-height:138px!important}}`;
  document.head.appendChild(style);
  grid.classList.add('dashboard-polish-grid');
}

const observer=new MutationObserver(()=>polishDashboard());
observer.observe(document.documentElement,{subtree:true,childList:true});
setTimeout(polishDashboard,250);
window.addEventListener('hashchange',()=>setTimeout(polishDashboard,120));
