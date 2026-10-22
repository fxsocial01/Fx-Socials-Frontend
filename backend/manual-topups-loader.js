import express from 'express';
import { registerManualTopupRoutes } from './manual-topups.js';
const original=express.application.listen;
express.application.listen=function(...args){
  try{
    const app=this;
    const pool=globalThis.__fxSocialsPool;
    const auth=globalThis.__fxSocialsAuth;
    const admin=globalThis.__fxSocialsAdmin;
    if(pool&&auth&&admin)registerManualTopupRoutes({app,pool,auth,admin});
  }catch(e){console.error('Manual top-up route loader:',e)}
  return original.apply(this,args);
};
