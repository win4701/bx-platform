/* BLOXIO NEWS — HTML-aligned module */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const state = { loading:false, items:[] };
  const setStatus = (message, error=false) => {
    const el=$("newsStatus"); if(el) el.textContent=message;
    const badge=document.querySelector(".bx-page-status");
    if(badge) badge.textContent=error ? "Feed unavailable" : "Editorial feed";
  };
  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function render(){
    const box=$("newsArticles"), empty=$("newsEmptyState");
    if(!box) return;
    box.innerHTML=state.items.map(item=>{
      const title=escapeHTML(item.title || "Untitled update");
      const body=escapeHTML(item.summary || item.description || "");
      const date=item.publishedAt ? new Date(item.publishedAt).toLocaleString() : "";
      const url=typeof item.url==="string" && /^https?:\/\//i.test(item.url) ? item.url : "";
      return `<article class="card news-article"><div class="bx-page-intro"><h2>${title}</h2><small>${escapeHTML(date)}</small></div><p>${body}</p>${url?`<a class="header-btn secondary" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Read update</a>`:""}</article>`;
    }).join("");
    if(empty) empty.hidden=state.items.length>0;
  }
  async function load(){
    if(state.loading) return; state.loading=true;
    const btn=$("newsRefreshBtn"); if(btn) btn.disabled=true;
    setStatus("Loading verified announcements…");
    try{
      if(!window.API?.get) throw new Error("API service unavailable");
      const result=await window.API.get("/news", {auth:false,cache:false});
      if(result?.error) throw new Error(result.message || result.error);
      const payload=result?.data ?? result;
      const rows=Array.isArray(payload) ? payload : (payload?.articles || payload?.items || []);
      if(!Array.isArray(rows)) throw new Error("Unexpected news response");
      state.items=rows; render();
      setStatus(rows.length ? `${rows.length} verified updates loaded` : "No published announcements");
    }catch(error){
      state.items=[]; render();
      setStatus("News feed is not connected. No unverified articles are shown.",true);
      console.warn("[BLOXIO NEWS]",error);
    }finally{state.loading=false;if(btn)btn.disabled=false;}
  }
  function init(){
    $("newsRefreshBtn")?.addEventListener("click",load);
    render();
    if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",load,{once:true}); else load();
  }
  window.BLOXIO_NEWS={init,refresh:load,getState:()=>({...state})};
  init();
})();