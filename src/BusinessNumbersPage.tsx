import {useState} from 'react';

const WHATSAPP='https://wa.me/2349072978807';
const field:any={width:'100%',boxSizing:'border-box',padding:'13px 14px',border:'1px solid #D9DFEA',borderRadius:12,fontSize:15,background:'#fff',color:'#18213A'};
const label:any={display:'grid',gap:7,fontSize:13,fontWeight:800,color:'#35405A',marginTop:14};
export default function BusinessNumbersPage(){
 const [country,setCountry]=useState('United States');
 const [type,setType]=useState('Dedicated business line');
 const [quantity,setQuantity]=useState('1');
 const [purpose,setPurpose]=useState('');
 const [contact,setContact]=useState('');
 const [notes,setNotes]=useState('');
 const submit=()=>{
  if(!purpose.trim()||!contact.trim()){alert('Please add your business use and contact details.');return;}
  const msg=['FX Socials — Business Number Request','Country: '+country,'Number type: '+type,'Quantity: '+quantity,'Business use: '+purpose,'Contact: '+contact,'Additional details: '+(notes||'None')].join('\n');
  window.open(WHATSAPP+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
 };
 return <main style={{minHeight:'100vh',background:'#F5F7FB',padding:'18px 14px 42px',color:'#17213A'}}>
  <div style={{maxWidth:620,margin:'0 auto'}}>
   <button onClick={()=>location.hash='#/home'} style={{border:0,background:'transparent',padding:'10px 0',fontWeight:800,color:'#53617D'}}>← FX Socials</button>
   <section style={{marginTop:12,padding:'24px 20px',borderRadius:22,background:'linear-gradient(130deg,#14265E,#394EAD)',color:'#fff'}}>
    <div style={{fontSize:12,fontWeight:900,letterSpacing:'.16em',color:'#C8D4FF'}}>FX SOCIALS</div>
    <h1 style={{fontSize:32,margin:'10px 0 8px'}}>Business Numbers</h1>
    <p style={{margin:0,lineHeight:1.65,color:'#E1E7FF'}}>Request a phone number for legitimate business communications, customer support or a team contact line. Tell us what you need and our team will confirm supported countries, availability and pricing before you pay.</p>
   </section>
   <section style={{marginTop:16,padding:20,borderRadius:20,background:'#fff',border:'1px solid #E5E9F1'}}>
    <h2 style={{fontSize:20,margin:'0 0 4px'}}>Request a business line</h2>
    <p style={{fontSize:13,color:'#74809A',lineHeight:1.55,margin:'5px 0 12px'}}>This is a request, not an instant purchase. No wallet payment is taken here.</p>
    <label style={label}>Country<select style={field} value={country} onChange={e=>setCountry(e.target.value)}>{['United States','United Kingdom','Canada','Nigeria','Australia','Germany','France','Austria','Other / please advise'].map(x=><option key={x}>{x}</option>)}</select></label>
    <label style={label}>Number type<select style={field} value={type} onChange={e=>setType(e.target.value)}><option>Dedicated business line</option><option>Customer support line</option><option>Team contact number</option><option>Business calling number</option></select></label>
    <label style={label}>Quantity<select style={field} value={quantity} onChange={e=>setQuantity(e.target.value)}>{['1','2','3','5','10'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
    <label style={label}>How will your business use the number?<textarea style={{...field,minHeight:88,resize:'vertical'}} value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="For example: customer enquiries and appointment calls"/></label>
    <label style={label}>Your WhatsApp number or email<input style={field} value={contact} onChange={e=>setContact(e.target.value)} placeholder="How should we contact you?"/></label>
    <label style={label}>Additional details (optional)<textarea style={{...field,minHeight:70,resize:'vertical'}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any country, area-code or calling requirements"/></label>
    <button onClick={submit} style={{width:'100%',marginTop:18,padding:15,border:0,borderRadius:12,background:'#287A59',color:'#fff',fontSize:15,fontWeight:900}}>Send business number request on WhatsApp</button>
    <p style={{fontSize:11,color:'#8993A6',lineHeight:1.5,margin:'12px 0 0'}}>Business-use requests only. This page does not offer third-party account verification, one-time passcode retrieval or code forwarding. Availability and final price must be confirmed by FX Socials.</p>
   </section>
  </div>
 </main>;
}
