/* =========================================================
   market.js — FINAL PRODUCTION BASELINE
   Scope: Market only (Safe / Scoped)
   ========================================================= */

(() => {
  'use strict';
  if (window.__MARKET_BASELINE__) return;
  window.__MARKET_BASELINE__ = true;

  /* ================= CONFIG ================= */
  const CFG = {
    BASE: 'BX',
    BX_USDT: 38,           // reference
    ROWS: 15,
    BASE_SPREAD: 0.0008,
    EMA_PERIOD: 21,
    CHART_POINTS: 300,
    RENDER_MS: 80,
    FEE_RATE: 0.001
  };

  /* ================= STATE ================= */
  const S = {
    quote: 'USDT',
    bxQuote: CFG.BX_USDT,
    bids: [],
    asks: [],
    mid: CFG.BX_USDT,
    selectedPrice: null,
    lastRender: 0,
    vol: 0,
    lastMid: null,
    trades: []
  };

  /* ================= POSITIONS ================= */
  const POS = {
    size: 0,
    avg: 0,
    realized: 0
  };

  /* ================= REAL PRICES (BINANCE) ================= */
  const REAL = { USDT: 1, USDC: 1 };
  const PRICE_STREAMS = [
    'btcusdt@ticker','ethusdt@ticker','bnbusdt@ticker',
    'solusdt@ticker','avaxusdt@ticker','ltcusdt@ticker',
    'zecusdt@ticker','tonusdt@ticker'
  ];
  let priceWS = null;
  let tradesWS = null;

  /* ================= DOM ================= */
  const $ = id => document.getElementById(id);
  const root = document.querySelector('#market') || document.querySelector('.market-view');
  if (!root) return;

  const D = {
    price: $('marketPrice'),
    approx: $('marketApprox'),
    quote: $('quoteAsset'),
    bids: $('bids'),
    asks: $('asks'),
    ladder: $('priceLadder'),
    chart: $('bxChart'),
    amount: $('amountInput'),
    execPrice: $('execPrice'),
    slippage: $('slippage'),
    spread: $('spread'),
    buyBtn: document.querySelector('.buy-btn'),
    sellBtn: document.querySelector('.sell-btn'),
    posSize: $('posSize'),
    posAvg: $('posAvg'),
    pnlU: $('pnlUnreal'),
    pnlR: $('pnlReal'),
    pairs: root.querySelectorAll('[data-quote]')
  };

  /* ================= INIT ================= */
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (!D.bids || !D.asks || !D.ladder) return requestAnimationFrame(init);
    bindPairs();
    initBookRows();
    initChart();
    connectPrices();
    connectTrades();
    rebuild();
  }

  /* ================= BINANCE PRICES ================= */
  function connectPrices() {
    if (priceWS) return;
    priceWS = new WebSocket(
      `wss://stream.binance.com:9443/stream?streams=${PRICE_STREAMS.join('/')}`
    );
    priceWS.onmessage = e => {
      const d = JSON.parse(e.data)?.data;
      if (!d || !d.s) return;
      const asset = d.s.replace('USDT','');
      REAL[asset] = +d.c;
      if (S.quote === asset) rebuild();
    };
  }

  /* ================= BINANCE TRADES ================= */
  function connectTrades() {
    if (tradesWS) tradesWS.close();
    const sym = `${S.quote}USDT`.toLowerCase();
    tradesWS = new WebSocket(
      `wss://stream.binance.com:9443/ws/${sym}@trade`
    );
    tradesWS.onmessage = e => {
      const t = JSON.parse(e.data);
      S.trades.push({ price:+t.p, qty:+t.q, side:t.m?'SELL':'BUY' });
      if (S.trades.length > 50) S.trades.shift();
    };
  }

  /* ================= PAIRS ================= */
  function bindPairs() {
    D.pairs.forEach(btn=>{
      btn.onclick=()=>{
        D.pairs.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        S.quote = btn.dataset.quote;
        connectTrades();
        rebuild(true);
      };
    });
  }

  /* ================= PRICE ================= */
  function computeQuote() {
    if (S.quote==='USDT'||S.quote==='USDC') S.bxQuote=CFG.BX_USDT;
    else if (REAL[S.quote]) S.bxQuote=CFG.BX_USDT/REAL[S.quote];
  }

  /* ================= MM / SPREAD ================= */
  function updateVol() {
    if (S.lastMid) S.vol=Math.abs(S.mid-S.lastMid)/S.lastMid;
    S.lastMid=S.mid;
  }
  function dynSpread() {
    return CFG.BASE_SPREAD*(1+Math.min(S.vol*50,5));
  }

  /* ================= ORDER BOOK ================= */
  const rows={b:[],a:[],p:[]};
  function initBookRows(){
    if(rows.b.length) return;
    for(let i=0;i<CFG.ROWS;i++){
      const b=document.createElement('div'),
            p=document.createElement('div'),
            a=document.createElement('div');
      b.className='ob-row bid';
      p.className='price-row';
      a.className='ob-row ask';
      b.onclick=()=>selectPrice(b.dataset.price);
      a.onclick=()=>selectPrice(a.dataset.price);
      D.bids.appendChild(b);
      D.ladder.appendChild(p);
      D.asks.appendChild(a);
      rows.b.push(b); rows.p.push(p); rows.a.push(a);
    }
  }

  function buildBook(){
    S.bids=[]; S.asks=[];
    const half=Math.floor(CFG.ROWS/2);
    const step=dynSpread();
    for(let i=0;i<CFG.ROWS;i++){
      const lvl=i-half;
      const price=S.bxQuote*(1+lvl*step);
      const qty=Math.random()*10+1;
      if(lvl<0) S.bids.unshift({price,qty});
      if(lvl>0) S.asks.push({price,qty});
    }
    S.mid=(S.bids.at(-1).price+S.asks[0].price)/2;
    updateVol();
  }

  function renderBook(){
    const now=performance.now();
    if(now-S.lastRender<CFG.RENDER_MS) return;
    S.lastRender=now;

    const maxB=Math.max(...S.bids.map(b=>b.qty));
    const maxA=Math.max(...S.asks.map(a=>a.qty));
    const half=Math.floor(CFG.ROWS/2);

    for(let i=0;i<CFG.ROWS;i++){
      const lvl=i-half;
      rows.b[i].textContent='';
      rows.a[i].textContent='';
      rows.p[i].classList.remove('mid');

      if(lvl<0){
        const b=S.bids[-lvl-1];
        rows.b[i].dataset.price=b.price;
        rows.b[i].textContent=b.price.toFixed(6);
        rows.b[i].style.background=
          `linear-gradient(to left,rgba(0,200,120,.35) ${(b.qty/maxB)*100}%,transparent)`;
        rows.p[i].textContent=b.price.toFixed(6);
      }
      if(lvl>0){
        const a=S.asks[lvl-1];
        rows.a[i].dataset.price=a.price;
        rows.a[i].textContent=a.price.toFixed(6);
        rows.a[i].style.background=
          `linear-gradient(to right,rgba(220,60,60,.35) ${(a.qty/maxA)*100}%,transparent)`;
        rows.p[i].textContent=a.price.toFixed(6);
      }
      if(lvl===0){
        rows.p[i].textContent=S.mid.toFixed(6);
        rows.p[i].classList.add('mid');
      }
    }
    if(D.spread) D.spread.textContent=
      (S.asks[0].price-S.bids.at(-1).price).toFixed(6);
  }

  /* ================= CLICK / SLIPPAGE ================= */
  function selectPrice(p){
    S.selectedPrice=+p;
    if(D.execPrice) D.execPrice.textContent=(+p).toFixed(6);
    calcSlippage();
  }

  function calcSlippage(){
    const amt=+D.amount?.value;
    if(!amt||!S.selectedPrice) return;
    let cost=0,left=amt;
    for(const a of S.asks){
      const take=Math.min(left,a.qty);
      cost+=take*a.price; left-=take;
      if(!left) break;
    }
    const avg=cost/amt;
    const slip=((avg-S.selectedPrice)/S.selectedPrice)*100;
    if(D.slippage) D.slippage.textContent=slip.toFixed(2)+'%';
  }
  D.amount?.addEventListener('input',calcSlippage);

  /* ================= EXECUTION / WALLET STUB ================= */
  async function execute(side){
    if(!S.selectedPrice) return alert('Select price');
    const amt=+D.amount.value;
    const slip=+D.slippage.textContent.replace('%','');
    const fee=amt*CFG.FEE_RATE;
    const fill=S.selectedPrice*(1+(side==='BUY'?slip:-slip)/100);
    applyPosition(side,fill,amt,fee);
    alert(`${side} BX @ ${fill.toFixed(6)}`);
  }
  D.buyBtn?.addEventListener('click',()=>execute('BUY'));
  D.sellBtn?.addEventListener('click',()=>execute('SELL'));

  /* ================= POSITIONS / PnL ================= */
  function applyPosition(side,price,qty,fee){
    if(side==='BUY'){
      const cost=POS.avg*POS.size+price*qty;
      POS.size+=qty;
      POS.avg=cost/POS.size;
    }else{
      const pnl=(price-POS.avg)*qty;
      POS.size-=qty;
      POS.realized+=pnl-fee;
      if(POS.size<=0) POS.avg=0;
    }
    updatePnL();
  }
  function updatePnL(){
    const unreal=POS.size*(S.mid-POS.avg);
    if(D.posSize) D.posSize.textContent=POS.size.toFixed(4);
    if(D.posAvg) D.posAvg.textContent=POS.avg.toFixed(6);
    if(D.pnlU) D.pnlU.textContent=unreal.toFixed(2);
    if(D.pnlR) D.pnlR.textContent=POS.realized.toFixed(2);
  }

  /* ================= CHART ================= */
  let chart,series,midSeries,emaSeries,vwapSeries;
  let emaVal=null,vwapPV=0,vwapVol=0,cd=[];
  function initChart(){
    if(!D.chart||!window.LightweightCharts) return;
    chart=LightweightCharts.createChart(D.chart,{height:260});
    series=chart.addLineSeries({color:'#00e676'});
    midSeries=chart.addLineSeries({color:'#ffd54f',lineStyle:2});
    emaSeries=chart.addLineSeries({color:'#42a5f5'});
    vwapSeries=chart.addLineSeries({color:'#ab47bc'});
  }
  function updateChart(){
    if(!series) return;
    const t=Math.floor(Date.now()/1000);
    cd.push({time:t,value:S.bxQuote});
    if(cd.length>CFG.CHART_POINTS) cd.shift();
    series.setData(cd);
    midSeries.update({time:t,value:S.mid});
    const k=2/(CFG.EMA_PERIOD+1);
    emaVal=emaVal==null?S.bxQuote:(S.bxQuote*k+emaVal*(1-k));
    emaSeries.update({time:t,value:emaVal});
    const vol=S.bids[0].qty+S.asks[0].qty;
    vwapPV+=S.mid*vol; vwapVol+=vol;
    vwapSeries.update({time:t,value:vwapPV/vwapVol});
  }

  /* ================= PIPELINE ================= */
  function rebuild(resetChart=false){
    computeQuote();
    buildBook();
    if(resetChart) initChart();
    renderBook();
    updateChart();
    if(D.price) D.price.textContent=S.bxQuote.toFixed(6);
    if(D.quote) D.quote.textContent=S.quote;
    if(D.approx) D.approx.textContent=`≈ ${CFG.BX_USDT} USDT`;
  }

})();
