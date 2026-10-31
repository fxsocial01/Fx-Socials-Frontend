// The wallet page now has a first-party manual top-up flow in AppFixed.tsx.
// Keep this legacy overlay disabled so it cannot mount a second, stale payment form.
const API_BASE=(import.meta as any).env.VITE_API_BASE_URL||'https://fx-socials-api.onrender.com';
const token=()=>localStorage.getItem('fxs-session')||'';

async function autoVerify(){
  const reference = new URLSearchParams(location.search).get('reference')
    || new URLSearchParams(location.search).get('trxref')
    || localStorage.getItem('fxs-last-payment-reference');
  if (!token() || !reference) return;
  try {
    const response = await fetch(`${API_BASE}/api/wallet/verify`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionToken:token(),reference})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok) return;
    localStorage.removeItem('fxs-last-payment-reference');
    window.dispatchEvent(new CustomEvent('fxs-payment-credited',{detail:data}));
    window.location.reload();
  } catch (error) {
    console.error('Wallet payment verification failed:',error);
  }
}

void autoVerify();
