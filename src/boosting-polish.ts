function boostStyles(){if(document.getElementById('fxs-boosting-polish'))return;const s=document.createElement('style');s.id='fxs-boosting-polish';s.textContent=`
main.fxs-boost-page{background:radial-gradient(circle at 50% -10%,#171717 0,#070707 34%,#050505 70%)!important}
main.fxs-boost-page>div{max-width:1040px!important;padding:42px 22px 90px!important}
main.fxs-boost-page h1{font-size:clamp(44px,8vw,76px)!important;line-height:.95!important;letter-spacing:-.065em!important;margin:16px 0!important}
main.fxs-boost-page section{margin-top:30px!important;border-radius:28px!important;padding:28px!important;background:linear-gradient(145deg,#111,#090909)!important;border:1px solid #2b2b2b!important;box-shadow:0 22px 65px rgba(0,0,0,.2)!important}
main.fxs-boost-page section:first-of-type>div:nth-child(2){gap:16px!important;margin-top:16px!important}
main.fxs-boost-page section:first-of-type>div:nth-child(2)>button{min-height:150px!important;border-radius:22px!important;padding:24px!important;display:grid!important;grid-template-columns:1fr auto!important;grid-template-rows:auto auto!important;align-items:center!important;gap:7px 18px!important;text-align:left!important}
main.fxs-boost-page section:first-of-type>div:nth-child(2)>button b{font-size:22px!important}
main.fxs-boost-page section:first-of-type>div:nth-child(2)>button span:nth-child(2){font-size:13px!important;grid-column:1!important;line-height:1.5!important;margin:0!important}
main.fxs-boost-page section:first-of-type>div:nth-child(2)>button span:nth-child(3){grid-column:2!important;grid-row:1/3!important;align-self:center!important;margin:0!important}
main.fxs-boost-page section:nth-of-type(2)>div{gap:14px!important}
main.fxs-boost-page section:nth-of-type(2) button{min-height:118px!important;border-radius:22px!important;padding:20px 12px!important;gap:11px!important;font-size:14px!important}
main.fxs-boost-page section:nth-of-type(2) button img{width:34px!important;height:34px!important}
main.fxs-boost-page input{height:58px!important;border-radius:16px!important;background:#111!important;border-color:#303030!important;padding-left:46px!important;font-size:16px!important}
main.fxs-boost-page section:nth-of-type(3){padding:14px!important;background:transparent!important;border:0!important;box-shadow:none!important}
main.fxs-boost-page section:nth-of-type(3)>div{gap:14px!important}
main.fxs-boost-page section:nth-of-type(3) button{min-height:116px!important;border-radius:22px!important;padding:23px!important;background:linear-gradient(145deg,#111,#0a0a0a)!important;border-color:#2b2b2b!important;box-shadow:0 12px 35px rgba(0,0,0,.2)!important}
main.fxs-boost-page section:nth-of-type(3) button b{font-size:16px!important;line-height:1.25!important}
main.fxs-boost-page section:nth-of-type(3) button>span:last-child{font-size:15px!important;font-weight:900!important;white-space:nowrap!important}
main.fxs-boost-page section:nth-of-type(4){padding:30px!important}
main.fxs-boost-page label{line-height:1.5!important;margin-top:22px!important}
main.fxs-boost-page section:nth-of-type(4) button{height:58px!important;border-radius:16px!important}
main.fxs-boost-page>div>section:last-child{margin-top:42px!important}
@media(max-width:720px){main.fxs-boost-page>div{padding:28px 16px 70px!important}main.fxs-boost-page section{padding:21px!important;border-radius:23px!important}main.fxs-boost-page section:first-of-type>div:nth-child(2){grid-template-columns:1fr!important}main.fxs-boost-page section:first-of-type>div:nth-child(2)>button{min-height:132px!important}main.fxs-boost-page section:nth-of-type(2)>div{grid-template-columns:repeat(3,minmax(0,1fr))!important}main.fxs-boost-page section:nth-of-type(2) button{min-height:108px!important;padding:16px 8px!important}main.fxs-boost-page section:nth-of-type(3) button{min-height:126px!important}}
@media(max-width:430px){main.fxs-boost-page section:nth-of-type(2)>div{grid-template-columns:repeat(2,minmax(0,1fr))!important}main.fxs-boost-page section:nth-of-type(3) button{min-height:140px!important;padding:20px!important}main.fxs-boost-page section:nth-of-type(3) button>span:last-child{font-size:14px!important}}
`;
document.head.appendChild(s)}
function polishBoost(){boostStyles();const isBoost=location.hash.replace('#/','').split('?')[0]==='boosting';const main=document.querySelector('main');if(isBoost&&main)main.classList.add('fxs-boost-page');else main?.classList.remove('fxs-boost-page')}
const boostObserver=new MutationObserver(()=>polishBoost());boostObserver.observe(document.documentElement,{subtree:true,childList:true});setTimeout(polishBoost,300);window.addEventListener('hashchange',()=>setTimeout(polishBoost,100));
