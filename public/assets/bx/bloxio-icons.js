/* BLOXIO Internal SVG Icon helper */
(function(global){
  "use strict";
  const DEFAULT_SPRITE = "/assets/icons/bloxio-icons.svg";
  function spriteUrl(){
    return document.documentElement.dataset.bxIconSprite || DEFAULT_SPRITE;
  }
  function icon(name, className="", label=""){
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("class",("bx-icon "+className).trim());
    svg.setAttribute("aria-hidden",label?"false":"true");
    if(label) svg.setAttribute("role","img"),svg.setAttribute("aria-label",label);
    const use=document.createElementNS("http://www.w3.org/2000/svg","use");
    use.setAttribute("href",spriteUrl()+"#bx-"+name);
    svg.appendChild(use);
    return svg;
  }
  function mount(root=document){
    root.querySelectorAll("[data-bx-icon]").forEach(el=>{
      if(el.dataset.bxIconMounted==="1") return;
      const name=el.dataset.bxIcon;
      if(!name) return;
      el.prepend(icon(name,el.dataset.bxIconClass||"",el.dataset.bxIconLabel||""));
      el.dataset.bxIconMounted="1";
    });
  }
  async function copy(text, button){
    try{
      await navigator.clipboard.writeText(String(text??""));
      if(button){
        const old=button.getAttribute("aria-label")||"Copy";
        button.setAttribute("aria-label","Copied");
        button.dataset.bxCopied="1";
        setTimeout(()=>{button.setAttribute("aria-label",old);delete button.dataset.bxCopied;},1400);
      }
      return true;
    }catch(_){return false;}
  }
  global.BloxioIcons={icon,mount,copy};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>mount());
  else mount();
})(window);
