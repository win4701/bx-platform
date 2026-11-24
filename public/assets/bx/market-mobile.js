/* BLOXIO Market quote picker + selected pair emblem */
(() => {
 const $=id=>document.getElementById(id);
 const init=()=>{
  const select=$('bxMarketQuote'),trigger=$('bxQuoteTrigger'),menu=$('bxQuoteMenu'),value=$('bxQuoteValue');
  if(select&&trigger&&menu&&value&&!menu.dataset.ready){
   menu.dataset.ready='1';
   const render=()=>{
    const selected=select.options[select.selectedIndex];
    value.textContent=selected?selected.textContent:'All';
    [...menu.querySelectorAll('button')].forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===select.value)));
   };
   [...select.options].forEach(opt=>{
    const b=document.createElement('button');b.type='button';b.className='bx-quote-option';b.dataset.value=opt.value;b.setAttribute('role','option');b.textContent=opt.textContent;
    b.addEventListener('click',()=>{select.value=opt.value;select.dispatchEvent(new Event('change',{bubbles:true}));render();menu.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.focus();});
    menu.appendChild(b);
   });
   trigger.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;trigger.setAttribute('aria-expanded',String(open));});
   document.addEventListener('click',e=>{if(!e.target.closest('#bxQuotePicker')){menu.hidden=true;trigger.setAttribute('aria-expanded','false');}});
   trigger.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.hidden=true;trigger.setAttribute('aria-expanded','false');}});
   select.addEventListener('change',render);render();
  }
  const image=$('marketPairIcon');
  const updatePairIcon=()=>{
   if(!image)return;
   const pair=window.MARKET?.displayPair||window.MARKET?.pair||'BX/USDT';
   const base=String(pair).split(/[\/_]/)[0].toUpperCase();
   const commodity=['XAU','XAG','XPT','XPD','COPPER','OIL','BRENT','NG','RHODIUM','IRIDIUM'].includes(base);
   const activeCategory=document.querySelector('[data-market-category][aria-selected="true"]')?.dataset.marketCategory||'crypto';
   const aliases={XAU:'gold',XAG:'silver',XPT:'platinum',XPD:'palladium'};
   const file=(aliases[base]||base.toLowerCase())+'.png';
   image.hidden=false;image.alt=base;
   const folder=commodity?'commodities':activeCategory==='companies'?'companies':activeCategory==='fan-tokens'?'fan-tokens':'coins';
   image.src='/assets/images/'+folder+'/'+file;
   image.onerror=()=>{image.hidden=true;image.parentElement.dataset.fallback=base.slice(0,3);};
  };
  const pairList=$('marketPairAssets');
  if(pairList&&!pairList.dataset.iconWatch){pairList.dataset.iconWatch='1';pairList.addEventListener('click',()=>setTimeout(updatePairIcon,0));}
  const pairLabel=$('marketPair');
  if(pairLabel&&!pairLabel.dataset.iconWatch){pairLabel.dataset.iconWatch='1';new MutationObserver(updatePairIcon).observe(pairLabel,{childList:true,subtree:true,characterData:true});}
  updatePairIcon();
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();