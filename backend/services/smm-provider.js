import { marketplaceConfig } from './marketplace-config.js';

const timeoutMs=Number(process.env.SMM_PROVIDER_TIMEOUT_MS||30000);
const serviceCacheTtlMs=Number(process.env.SMM_SERVICE_CACHE_TTL_MS||30000);
const PROVIDER='smm-africa';
const config={name:PROVIDER,label:'SMM Africa',baseUrl:String(marketplaceConfig.smm.baseUrl||'https://smm.africa/api/v3').replace(/\/$/,''),apiKey:String(marketplaceConfig.smm.apiKey||'').trim(),bearer:true,currency:'USD',fx:Number(process.env.SMM_PROVIDER_2_USD_TO_NGN||1370)};
const serviceCache=new Map();
let serviceCacheAt=0;
const encoded=id=>`${PROVIDER}:${String(id)}`;
const decode=value=>{const raw=String(value??'');const prefix=`${PROVIDER}:`;return raw.startsWith(prefix)?{provider:PROVIDER,id:raw.slice(prefix.length)}:{provider:PROVIDER,id:raw};};
const errorFor=(message,status=502,extra={})=>Object.assign(new Error(String(message||'SMM provider request failed')),{status,...extra});

async function request(action,params={},idempotencyKey){
 if(!config.apiKey)throw errorFor('Boosting provider is not configured on the server.',503,{provider:PROVIDER,code:'PROVIDER_NOT_CONFIGURED'});
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const payload={action,...params};
  const headers={Accept:'application/json','User-Agent':'Mozilla/5.0 (compatible; FX-Socials/1.0; +https://fxsocials.top)','Content-Type':'application/json',Authorization:`Bearer ${config.apiKey}`};
  if(idempotencyKey)headers['Idempotency-Key']=idempotencyKey;
  const response=await fetch(config.baseUrl,{method:'POST',signal:controller.signal,headers,body:JSON.stringify(payload)});
  const text=await response.text();let data=null;try{data=JSON.parse(text)}catch{}
  if(!response.ok){const html=!data&&/<(?:!doctype|html|head|body)\b/i.test(text);throw errorFor(data?.error||data?.message||(html?`Boosting provider returned HTML/non-JSON (HTTP ${response.status}).`:`Boosting provider returned HTTP ${response.status}`),response.status,{provider:PROVIDER,providerStatus:response.status,retryable:Boolean(data?.retryable),code:data?.code,html});}
  if(!data||typeof data!=='object')throw errorFor('Boosting provider returned an invalid response.',502,{provider:PROVIDER});
  if(data.error)throw errorFor(data.error,response.status||502,{provider:PROVIDER,retryable:Boolean(data.retryable),code:data.code});
  return data;
 }catch(e){if(e?.name==='AbortError')throw errorFor('Boosting provider timed out before the result was confirmed.',504,{provider:PROVIDER,ambiguous:true});throw e;}finally{clearTimeout(timer)}
}

const listFromResponse=d=>Array.isArray(d)?d:Array.isArray(d?.services)?d.services:Array.isArray(d?.data)?d.data:Array.isArray(d?.data?.services)?d.data.services:Array.isArray(d?.result)?d.result:[];
const firstValue=(obj,keys,fallback='')=>{for(const k of keys){if(obj?.[k]!==undefined&&obj?.[k]!==null&&String(obj[k]).trim()!=='')return obj[k];}return fallback;};

async function services({force=false}={}){
 const now=Date.now();
 if(!force&&serviceCacheAt&&now-serviceCacheAt<serviceCacheTtlMs&&serviceCache.size)return {services:[...serviceCache.values()],errors:[]};
 const d=await request('services');
 const mapped=listFromResponse(d).map(s=>{
  const id=String(firstValue(s,['service','id','service_id','serviceId'],'')).trim();
  const rawRate=Number(firstValue(s,['rate','price','cost','price_per_1000','pricePer1000'],0));
  const rateNgn=rawRate*config.fx;
  const min=Number(firstValue(s,['min','minimum','min_quantity','minQuantity'],1));
  const max=Number(firstValue(s,['max','maximum','max_quantity','maxQuantity'],Number.MAX_SAFE_INTEGER));
  const item={id:encoded(id),service:encoded(id),provider:PROVIDER,providerName:config.label,providerServiceId:id,name:String(firstValue(s,['name','title'],`Service ${id}`)),category:String(firstValue(s,['category','category_name'],'')).trim(),type:String(firstValue(s,['type','service_type'],'')).trim(),description:String(firstValue(s,['description','details'],'')).trim(),providerRate:rawRate,providerCurrency:config.currency,rate:rateNgn,price:rateNgn,pricePer1000:retailFromRate(rateNgn),min,max,refill:Boolean(s.refill??s.refillable??false),cancel:Boolean(s.cancel??s.cancellable??false)};
  return item;
 }).filter(s=>s.providerServiceId&&s.providerRate>0&&s.min>0&&s.max>=s.min);
 serviceCache.clear();for(const item of mapped)serviceCache.set(item.id,item);serviceCacheAt=Date.now();
 return {services:mapped,errors:[]};
}

async function add({service,link,quantity,idempotencyKey}={}){
 const decoded=decode(service);let selected=serviceCache.get(encoded(decoded.id));
 if(!selected){await services({force:false});selected=serviceCache.get(encoded(decoded.id));}
 if(!selected)throw errorFor('The selected boosting service is no longer available.',404,{provider:PROVIDER});
 const key=idempotencyKey||`fxs-${Date.now()}-${Math.random().toString(36).slice(2,12)}`;
 const data=await request('add',{service:selected.providerServiceId,link,quantity:String(quantity),idempotency_key:key},key);
 if(data?.order===undefined||data?.order===null||data?.order==='')throw errorFor('Boosting provider did not return an order ID.',502,{provider:PROVIDER,ambiguous:true});
 return {...data,order:`${PROVIDER}:${String(data.order)}`,provider:PROVIDER,providerName:config.label};
}

async function status(order){
 const decoded=decode(order);const providerOrder=String(order).startsWith(`${PROVIDER}:`)?String(order).slice(`${PROVIDER}:`.length):decoded.id;
 const data=await request('status',{orders:[providerOrder]});
 return Array.isArray(data.orders)?(data.orders[0]||{}):data;
}

export const smm={services,add,status,refill:async order=>{const decoded=decode(order);const providerOrder=String(order).startsWith(`${PROVIDER}:`)?String(order).slice(`${PROVIDER}:`.length):decoded.id;return request('refill',{order:providerOrder});}};
export const retailFromRate=providerRate=>{const rate=Number(providerRate||0);return Math.round(rate*(1+Number(marketplaceConfig.smm.markupPercent||40)/100)*100)/100;};
export const retailTotal=(providerRate,quantity)=>Math.round(retailFromRate(providerRate)*(Number(quantity)/1000)*100)/100;
export const smmProviders=()=>[{id:PROVIDER,name:config.label,configured:Boolean(config.apiKey),currency:config.currency,usdToNgn:config.fx,markupPercent:Number(marketplaceConfig.smm.markupPercent||40)}];
