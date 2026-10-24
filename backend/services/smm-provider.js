import { marketplaceConfig } from './marketplace-config.js';

const timeoutMs = Number(process.env.SMM_PROVIDER_TIMEOUT_MS || 30000);
const P1 = 'smm-panel-ng';
const P2 = 'smm-africa';

const configs = {
  [P1]: { name: P1, label: 'SMM Panel Nigeria', baseUrl: String(marketplaceConfig.smm.baseUrl || 'https://app.smmpanel.ng/api/v2').replace(/\/$/, ''), apiKey: String(marketplaceConfig.smm.apiKey || '').trim(), bearer: false },
  [P2]: { name: P2, label: 'SMM Africa', baseUrl: String(marketplaceConfig.smmBackup?.baseUrl || 'https://smm.africa/api/v3').replace(/\/$/, ''), apiKey: String(marketplaceConfig.smmBackup?.apiKey || '').trim(), bearer: true }
};

const encodedService = (provider, id) => `${provider}:${String(id)}`;
const decodeService = value => { const raw=String(value??''); const i=raw.indexOf(':'); return i>0&&configs[raw.slice(0,i)]?{provider:raw.slice(0,i),id:raw.slice(i+1)}:{provider:P1,id:raw}; };
const errorFor = (message,status=502,extra={}) => Object.assign(new Error(String(message||'SMM provider request failed')),{status,...extra});

async function request(config, action, params={}, {idempotencyKey}={}) {
  if(!config.apiKey) throw errorFor(`${config.label} is not configured on the server.`,503);
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    const headers={Accept:'application/json','User-Agent':'FX-Socials/1.0'}; let body;
    if(config.bearer){headers.Authorization=`Bearer ${config.apiKey}`;headers['Content-Type']='application/json';body=JSON.stringify({action,...params});}
    else {headers['Content-Type']='application/x-www-form-urlencoded';body=new URLSearchParams({action,key:config.apiKey,...params});}
    if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
    const response=await fetch(config.baseUrl,{method:'POST',signal:controller.signal,headers,body});
    const text=await response.text(); let data=null; try{data=JSON.parse(text)}catch{}
    if(!response.ok)throw errorFor(data?.error||data?.message||`${config.label} returned HTTP ${response.status}`,response.status,{provider:config.name,providerStatus:response.status,retryable:Boolean(data?.retryable),code:data?.code});
    if(!data||typeof data!=='object')throw errorFor(`${config.label} returned an invalid response.`,502,{provider:config.name});
    if(data.error)throw errorFor(data.error,response.status||502,{provider:config.name,retryable:Boolean(data.retryable),code:data.code});
    return data;
  }catch(e){if(e?.name==='AbortError')throw errorFor(`${config.label} timed out before the result was confirmed.`,504,{provider:config.name,ambiguous:true});throw e;}
  finally{clearTimeout(timer)}
}

const safeFailover = e => { if(e?.ambiguous)return false; const s=Number(e?.status||0),c=String(e?.code||'').toUpperCase(); if([400,401,403,423].includes(s)||c==='INVALID_API_KEY')return false; return s===429||s>=500||s===0||Boolean(e?.retryable); };
const callProvider=(provider,action,params={},options={})=>request(configs[provider],action,params,options);
const listFromResponse=d => Array.isArray(d)?d:Array.isArray(d?.services)?d.services:Array.isArray(d?.data)?d.data:Array.isArray(d?.data?.services)?d.data.services:Array.isArray(d?.result)?d.result:[];
const firstValue=(obj,keys,fallback='')=>{for(const k of keys){if(obj?.[k]!==undefined&&obj?.[k]!==null&&String(obj[k]).trim()!=='')return obj[k];}return fallback;};

async function servicesFor(provider){
  const d=await callProvider(provider,'services');
  const list=listFromResponse(d);
  return list.map(s=>{
    const id=String(firstValue(s,['service','id','service_id','serviceId'],'')).trim();
    const rate=Number(firstValue(s,['rate','price','cost','price_per_1000','pricePer1000'],0));
    const min=Number(firstValue(s,['min','minimum','min_quantity','minQuantity'],1));
    const max=Number(firstValue(s,['max','maximum','max_quantity','maxQuantity'],Number.MAX_SAFE_INTEGER));
    const encoded=encodedService(provider,id);
    return {id:encoded,service:encoded,provider,providerName:configs[provider].label,providerServiceId:id,name:String(firstValue(s,['name','title'],`Service ${id}`)),category:String(firstValue(s,['category','category_name'],'')).trim(),type:String(firstValue(s,['type','service_type'],'')).trim(),description:String(firstValue(s,['description','details'],'')).trim(),providerRate:rate,rate,price:rate,pricePer1000:retailFromRate(rate),min,max,refill:Boolean(s.refill??s.refillable??false),cancel:Boolean(s.cancel??s.cancellable??false)};
  }).filter(s=>s.providerServiceId&&s.providerRate>0&&s.min>0&&s.max>=s.min);
}

async function allServices(){
  const results=await Promise.allSettled([servicesFor(P1),servicesFor(P2)]); const services=[],errors=[];
  results.forEach((r,i)=>{const provider=i===0?P1:P2;if(r.status==='fulfilled')services.push(...r.value);else errors.push({provider,message:r.reason?.message||'Unavailable'});});
  if(!services.length)throw errorFor('Both boosting providers are currently unavailable.',502,{providerErrors:errors});
  return {services,errors};
}

async function add({service,link,quantity}){
  const decoded=decodeService(service),requested=decoded.provider,fallback=requested===P1?P2:P1;
  const key=`fxs-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
  try{
    const data=await callProvider(requested,'add',{service:decoded.id,link,quantity:String(quantity),idempotency_key:key},{idempotencyKey:key});
    if(data?.order===undefined||data?.order===null||data?.order==='')throw errorFor(`${configs[requested].label} did not return an order ID.`,502,{provider:requested});
    return {...data,order:`${requested}:${String(data.order)}`,provider:requested,providerName:configs[requested].label};
  }catch(e){
    if(!safeFailover(e)||!configs[fallback].apiKey)throw e;
    const fallbackKey=`fxs-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
    const data=await callProvider(fallback,'add',{service:decoded.id,link,quantity:String(quantity),idempotency_key:fallbackKey},{idempotencyKey:fallbackKey});
    if(data?.order===undefined||data?.order===null||data?.order==='')throw errorFor(`${configs[fallback].label} did not return an order ID.`,502,{provider:fallback});
    return {...data,order:`${fallback}:${String(data.order)}`,provider:fallback,providerName:configs[fallback].label,failedOverFrom:requested};
  }
}

async function status(order){const raw=String(order??''),d=decodeService(raw),providerOrder=raw.startsWith(`${d.provider}:`)?raw.slice(d.provider.length+1):raw;const data=await callProvider(d.provider,'status',d.provider===P2?{orders:[providerOrder]}:{order:providerOrder});return d.provider===P2&&Array.isArray(data.orders)?(data.orders[0]||{}):data;}

export const smm={
  services:allServices,
  add,
  status,
  refill:async order=>{const raw=String(order??''),d=decodeService(raw),providerOrder=raw.startsWith(`${d.provider}:`)?raw.slice(d.provider.length+1):raw;return callProvider(d.provider,'refill',{order:providerOrder});}
};

export const retailFromRate=providerRate=>{const rate=Number(providerRate||0);return Math.round(rate*(1+Number(marketplaceConfig.smm.markupPercent||40)/100)*100)/100;};
export const retailTotal=(providerRate,quantity)=>Math.round(retailFromRate(providerRate)*(Number(quantity)/1000)*100)/100;
export const smmProviders=()=>Object.values(configs).map(c=>({id:c.name,name:c.label,configured:Boolean(c.apiKey),markupPercent:Number(marketplaceConfig.smm.markupPercent||40)}));
