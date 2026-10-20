const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';

function paymentReference(){
  const saved=localStorage.getItem('fxs-last-payment-reference')||'';
  const search=new URLSearchParams(location.search);
  const direct=search.get('reference')||search.get('trxref')||'';
  if(direct)return direct;
  const hash=location.hash||'';
  const queryIndex=hash.indexOf('?');
  if(queryIndex>=0){
    const h=new URLSearchParams(hash.slice(queryIndex+1));
    return h.get('reference')||h.get('trxref')||saved;
  }
  return saved;
}

async function autoVerify(){
  const token=localStorage.getItem('fxs-session')||'';
  const reference=paymentReference();
  if(!token||!reference)return;
  try{
    const r=await fetch(`${API_BASE}/api/wallet/verify`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionToken:token,reference})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok) return;
    localStorage.removeItem('fxs-last-payment-reference');
    history.replaceState(null,'',`${location.pathname}#/wallet`);
    sessionStorage.setItem('fxs-payment-credited',data.message||'Payment credited');
    window.dispatchEvent(new CustomEvent('fxs-payment-credited',{detail:data}));
    window.location.reload();
  }catch{}
}

void autoVerify();
