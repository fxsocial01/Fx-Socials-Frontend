const originalFetch=window.fetch.bind(window);

const safeValue=(value:any):string=>{
  if(value===undefined||value===null||value==='')return '';
  if(typeof value==='string'||typeof value==='number')return String(value);
  try{return JSON.stringify(value)}catch{return ''}
};

const savedLog=(o:any):string=>{
  const candidates=[
    o?.logs,o?.log,o?.history,o?.orderLog,o?.accountLog,o?.purchaseLog,
    o?.delivery,o?.accountDetails,o?.account,o?.credentials,
    o?.details,o?.metadata
  ];
  for(const value of candidates){
    if(value===undefined||value===null||value==='')continue;
    if(typeof value==='object'){
      const clean:any={};
      for(const [k,v] of Object.entries(value as Record<string,any>)){
        const key=k.toLowerCase();
        if(key.includes('password')||key.includes('passcode')||key.includes('token')||key.includes('secret'))continue;
        if(v!==undefined&&v!==null&&v!=='')clean[k]=v;
      }
      const text=safeValue(clean);
      if(text&&text!=='{}')return text;
    }else{
      const text=safeValue(value);
      if(text)return text;
    }
  }
  const direct=[o?.accountLogin,o?.login,o?.username,o?.email,o?.phone,o?.number];
  for(const value of direct){const text=safeValue(value);if(text)return text;}
  return '';
};

window.fetch=async(input:RequestInfo|URL,init?:RequestInit):Promise<Response>=>{
  const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
  if(url.includes('/api/fleexa/orders')){
    const fleexaResponse=await originalFetch(input,init);
    const fleexaData=await fleexaResponse.clone().json().catch(()=>({orders:[]}));
    try{
      const token=localStorage.getItem('fxs-session')||'';
      const accountUrl=url.replace('/api/fleexa/orders','/api/me/orders');
      const accountResponse=await originalFetch(accountUrl,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sessionToken:token})
      });
      const accountData=await accountResponse.json().catch(()=>({orders:[]}));
      const serviceOrders=Array.isArray(fleexaData?.orders)?fleexaData.orders:[];
      const accountOrders=accountResponse.ok&&Array.isArray(accountData?.orders)?accountData.orders.map((o:any)=>{
        const log=savedLog(o);
        return {
          ...o,
          service:'Social Account',
          service_name:o.service_name||o.service||o.platform||'Social Account',
          type:'Social Account',
          status:o.status||'completed',
          phone:o.phone||o.number||o.email||log,
          number:o.number||o.phone||o.email||log,
          delivery:o.delivery||log,
          accountLog:log,
          logs:o.logs||log
        };
      }):[];
      const merged=[...accountOrders,...serviceOrders];
      return new Response(JSON.stringify({orders:merged}),{
        status:200,
        headers:{'Content-Type':'application/json'}
      });
    }catch{
      return fleexaResponse;
    }
  }
  return originalFetch(input,init);
};
