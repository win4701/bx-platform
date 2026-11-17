/* BLOXIO P2P — HTML-aligned module; server-authoritative only */
"use strict";
(() => {
  const $=id=>document.getElementById(id);
  const state={loading:false,submitting:false,offers:[]};
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const status=(msg,error=false)=>{
    const el=$("p2pStatus");if(el)el.textContent=msg;
    const badge=document.querySelector(".bx-page-status");if(badge)badge.textContent=error?"Service unavailable":"P2P marketplace";
  };
  function render(){
    const box=$("p2pOffers"),empty=$("p2pEmptyState");if(!box)return;
    box.innerHTML=state.offers.map(o=>`<article class="card p2p-offer"><div class="bx-page-intro"><strong>${esc(o.side||"Offer").toUpperCase()} ${esc(o.asset||"")}/${esc(o.quoteCurrency||o.quote||"")}</strong><span>${esc(o.status||"open")}</span></div><p>Price: ${esc(o.price)} · Amount: ${esc(o.amount)}</p></article>`).join("");
    if(empty)empty.hidden=state.offers.length>0;
  }
  async function load(){
    if(state.loading)return;state.loading=true;const b=$("p2pRefreshBtn");if(b)b.disabled=true;status("Loading live offers…");
    try{
      if(!window.API?.get)throw new Error("API service unavailable");
      const result=await window.API.get("/p2p/offers",{auth:false,cache:false});
      if(result?.error)throw new Error(result.message||result.error);
      const payload=result?.data??result;const rows=Array.isArray(payload)?payload:(payload?.offers||[]);
      if(!Array.isArray(rows))throw new Error("Unexpected offers response");
      state.offers=rows;render();status(rows.length?`${rows.length} offers loaded`:"No active offers");
    }catch(e){state.offers=[];render();status("P2P API is not connected. Trading remains disabled.",true);console.warn("[BLOXIO P2P]",e);}
    finally{state.loading=false;if(b)b.disabled=false;}
  }
  async function submit(event){
    event.preventDefault();if(state.submitting)return;
    const form=$("p2pOfferForm");if(!form?.reportValidity())return;
    if(!window.API?.post){status("API service unavailable",true);return;}
    const payload={
      side:$("p2pSide")?.value,
      asset:$("p2pAsset")?.value?.trim().toUpperCase(),
      quoteCurrency:$("p2pQuoteCurrency")?.value?.trim().toUpperCase(),
      price:Number($("p2pPrice")?.value),
      amount:Number($("p2pAmount")?.value)
    };
    if(!["buy","sell"].includes(payload.side)||!payload.asset||!payload.quoteCurrency||!Number.isFinite(payload.price)||payload.price<=0||!Number.isFinite(payload.amount)||payload.amount<=0){status("Enter valid offer details",true);return;}
    state.submitting=true;const btn=form.querySelector('[type="submit"]');if(btn)btn.disabled=true;status("Submitting offer to the server…");
    try{
      const result=await window.API.post("/p2p/offers",payload,{auth:true,cache:false});
      if(result?.error)throw new Error(result.message||result.error);
      form.reset();status("Offer submitted. Refreshing offers…");await load();
    }catch(e){status("Offer was not accepted by the P2P server.",true);console.warn("[BLOXIO P2P]",e);}
    finally{state.submitting=false;if(btn)btn.disabled=false;}
  }
  function init(){
    $("p2pRefreshBtn")?.addEventListener("click",load);
    $("p2pOfferForm")?.addEventListener("submit",submit);
    render();
    if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",load,{once:true});else load();
  }
  window.BLOXIO_P2P={init,refresh:load,getState:()=>({...state})};init();
})();