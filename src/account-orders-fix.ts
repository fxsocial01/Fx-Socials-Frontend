const originalFetch=window.fetch.bind(window);

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
      const accountOrders=accountResponse.ok&&Array.isArray(accountData?.orders)?accountData.orders.map((o:any)=>({
        ...o,
        service:'Social Account',
        type:'Social Account',
        status:o.status||'completed'
      })):[];
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
