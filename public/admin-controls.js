(() => {
  const API = 'https://fx-socials-api.onrender.com';
  const ADMIN = 'yasiyrshehu@gmail.com';
  const token = () => localStorage.getItem('fxs-session') || '';
  const esc = (v) => String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  async function api(path, body = {}) {
    const r = await fetch(API + path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...body, sessionToken:token()}) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
    return d;
  }
  function isAdmin() {
    try { const u = JSON.parse(localStorage.getItem('fxs-user') || 'null'); return String(u?.email || '').toLowerCase() === ADMIN && u?.role === 'admin'; } catch { return false; }
  }
  const money = n => `₦${Number(n || 0).toLocaleString('en-NG',{minimumFractionDigits:2})}`;
  let installed = false;
  async function install() {
    if (!isAdmin() || installed) return;
    const headings = [...document.querySelectorAll('h1,h2,h3')];
    const title = headings.find(x => String(x.textContent || '').trim() === 'Admin Dashboard');
    if (!title) return;
    const userHeading = headings.find(x => String(x.textContent || '').trim() === 'Users');
    if (!userHeading) return;
    const section = userHeading.closest('section') || userHeading.parentElement;
    if (!section || document.getElementById('fxs-admin-account-controls')) return;
    installed = true;
    const box = document.createElement('section');
    box.id = 'fxs-admin-account-controls';
    box.style.cssText='margin:0 0 16px;padding:20px;border:1px solid #2b2b2b;border-radius:18px;background:#0b0b0b;color:#fff;box-shadow:0 10px 30px #0004';
    box.innerHTML=`<h2 style="margin:0 0 6px">Customer Account Controls</h2><p style="color:#999;margin:0 0 16px">Refund/reverse a wallet after an external refund, freeze or block an account, and review the admin audit trail.</p><div id="fxs-ac-msg" style="display:none;margin:0 0 12px;padding:10px;border-radius:10px;background:#fff;color:#111;font-weight:800"></div><div style="display:grid;grid-template-columns:2fr 1fr;gap:10px"><select id="fxs-ac-user" style="padding:12px;border-radius:10px;border:1px solid #333;background:#151515;color:#fff"></select><input id="fxs-ac-amount" type="number" min="0.01" step="0.01" placeholder="Refund amount (₦)" style="padding:12px;border-radius:10px;border:1px solid #333;background:#151515;color:#fff"></div><div id="fxs-ac-balance" style="margin:10px 0;color:#aaa;font-weight:700"></div><input id="fxs-ac-reason" placeholder="Reason, e.g. Customer refunded externally because item was unavailable" style="width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #333;background:#151515;color:#fff"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button id="fxs-ac-full" style="padding:11px 14px;border:0;border-radius:10px;background:#fff;color:#000;font-weight:900">Reverse Full Balance</button><button id="fxs-ac-refund" style="padding:11px 14px;border:0;border-radius:10px;background:#8b1e1e;color:#fff;font-weight:900">Reverse Amount</button><button id="fxs-ac-freeze" style="padding:11px 14px;border:1px solid #555;border-radius:10px;background:#151515;color:#fff;font-weight:900">Freeze</button><button id="fxs-ac-unfreeze" style="padding:11px 14px;border:1px solid #555;border-radius:10px;background:#151515;color:#fff;font-weight:900">Unfreeze</button><button id="fxs-ac-block" style="padding:11px 14px;border:0;border-radius:10px;background:#b91c1c;color:#fff;font-weight:900">Block</button><button id="fxs-ac-unblock" style="padding:11px 14px;border:1px solid #555;border-radius:10px;background:#151515;color:#fff;font-weight:900">Unblock</button><button id="fxs-ac-audit" style="padding:11px 14px;border:1px solid #555;border-radius:10px;background:#151515;color:#fff;font-weight:900">View Audit</button><button id="fxs-ac-refresh" style="padding:11px 14px;border:1px solid #555;border-radius:10px;background:#151515;color:#fff;font-weight:900">Refresh</button></div><div id="fxs-ac-audit-list" style="margin-top:14px"></div>`;
    section.parentElement?.insertBefore(box, section);
    const userEl = box.querySelector('#fxs-ac-user');
    const amountEl = box.querySelector('#fxs-ac-amount');
    const reasonEl = box.querySelector('#fxs-ac-reason');
    const balanceEl = box.querySelector('#fxs-ac-balance');
    const msgEl = box.querySelector('#fxs-ac-msg');
    const auditEl = box.querySelector('#fxs-ac-audit-list');
    let users = [];
    const message = (text, bad=false) => { msgEl.textContent=text; msgEl.style.display='block'; msgEl.style.background=bad?'#3a1111':'#fff'; msgEl.style.color=bad?'#ffb0b0':'#111'; };
    const selected = () => users.find(u => u.userId === userEl.value);
    const refresh = async () => {
      const d = await api('/api/admin/users'); users = d.users || []; userEl.innerHTML = users.map(u => `<option value="${esc(u.userId)}">${esc(u.name)} · ${esc(u.email)} · ${money(u.balance)}</option>`).join('');
      const u = selected(); if (u) { amountEl.value = Number(u.balance || 0).toFixed(2); balanceEl.textContent = `Current wallet balance: ${money(u.balance)}`; } else balanceEl.textContent='No customer selected';
      try { const s=await api('/api/admin/users/control-state'); const states=s.users||[]; users=users.map(u=>({...u,status:(states.find(x=>x.userId===u.userId)||{}).status||'active'})); if(selected()) balanceEl.textContent += ` · Account: ${(selected().status||'active').toUpperCase()}`; } catch {}
    };
    const confirmAction = (text) => window.confirm(text);
    async function refund(full) {
      const u=selected(); if(!u)return message('Select a customer first.',true);
      const n=full?Number(u.balance||0):Number(amountEl.value||0);
      const reason=reasonEl.value.trim(); if(!n||n<=0)return message('Enter a valid refund amount.',true); if(n>Number(u.balance||0))return message('Refund amount cannot exceed the current wallet balance.',true); if(!reason)return message('Enter a reason for the reversal.',true);
      if(!confirmAction(`Confirm wallet reversal?\n\nCustomer: ${u.email}\nAmount: ${money(n)}\nReason: ${reason}\n\nThis reduces the wallet balance and records the reversal.`))return;
      try { await api('/api/admin/users/refund',{userId:u.userId,amountNaira:n,reason}); message(`Wallet reversal completed. New balance: ${money(Number(u.balance||0)-n)}`); await refresh(); } catch(e) { message(e.message,true); }
    }
    async function status(status) {
      const u=selected(); if(!u)return message('Select a customer first.',true);
      const reason=reasonEl.value.trim() || `Admin ${status} account control`;
      if(!confirmAction(`Confirm ${status} for ${u.email}?\n\nThis changes the customer's account access state.`))return;
      try { await api('/api/admin/users/status',{userId:u.userId,status,reason}); message(`Account ${status}.`); await refresh(); } catch(e) { message(e.message,true); }
    }
    async function audit() {
      try { const d=await api('/api/admin/users/audit'); const rows=d.audit||[]; auditEl.innerHTML=rows.length?`<div style="border-top:1px solid #222;padding-top:10px">${rows.map(x=>`<div style="padding:9px 0;border-bottom:1px solid #222;font-size:13px"><b>${esc(x.action)}</b> · ${esc(x.user_email)} · ${x.amount==null?'':money(x.amount)+' · '}${esc(x.reason||'No reason')}<div style="color:#777;margin-top:3px">${new Date(x.created_at).toLocaleString()}</div></div>`).join('')}</div>`:'<p style="color:#888">No admin actions recorded yet.</p>`; } catch(e) { message(e.message,true); }
    }
    userEl.addEventListener('change',()=>{const u=selected();if(u){amountEl.value=Number(u.balance||0).toFixed(2);balanceEl.textContent=`Current wallet balance: ${money(u.balance)} · Account: ${(u.status||'active').toUpperCase()}`;}});
    box.querySelector('#fxs-ac-full').onclick=()=>refund(true); box.querySelector('#fxs-ac-refund').onclick=()=>refund(false); box.querySelector('#fxs-ac-freeze').onclick=()=>status('frozen'); box.querySelector('#fxs-ac-unfreeze').onclick=()=>status('active'); box.querySelector('#fxs-ac-block').onclick=()=>status('blocked'); box.querySelector('#fxs-ac-unblock').onclick=()=>status('active'); box.querySelector('#fxs-ac-audit').onclick=audit; box.querySelector('#fxs-ac-refresh').onclick=()=>refresh().catch(e=>message(e.message,true));
    try { await refresh(); } catch(e) { message(e.message,true); }
  }
  const observer = new MutationObserver(() => { if(isAdmin() && !installed) install(); });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(() => { if(isAdmin() && !installed) install(); },1000);
})();
