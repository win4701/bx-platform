// market.engine.js
(() => {
  if (!document.getElementById('market')) return;

  const Market = {
    state: {
      base: 'BX',
      quote: 'USDT',
      price: 38,
      bids: [],
      asks: [],
      chart: null,
      series: null
    },

    els: {},

    init() {
      this.cacheDOM();
      this.bindPairs();
      this.initChart();
      this.generateMockData();
      this.renderAll();
    },

    cacheDOM() {
      this.els.price = document.getElementById('marketPrice');
      this.els.approx = document.getElementById('marketApprox');
      this.els.quote = document.getElementById('quoteAsset');

      this.els.bids = document.getElementById('bids');
      this.els.asks = document.getElementById('asks');
      this.els.ladder = document.getElementById('priceLadder');

      this.els.pairs = document.querySelectorAll('.pair-btn');
      this.els.chartWrap = document.getElementById('bxChartWrap');
    },

    bindPairs() {
      this.els.pairs.forEach(btn => {
        btn.addEventListener('click', () => {
          this.els.pairs.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.changePair(btn.dataset.quote);
        });
      });
    },

    changePair(quote) {
      this.state.quote = quote;
      this.state.price = this.randomPrice();
      this.generateMockData();
      this.renderAll();
      this.updateChart();
    },

    generateMockData() {
      const p = this.state.price;
      this.state.bids = [];
      this.state.asks = [];

      for (let i = 15; i > 0; i--) {
        this.state.bids.push((p - i * 0.03).toFixed(4));
        this.state.asks.push((p + i * 0.03).toFixed(4));
      }
    },

    renderAll() {
      this.renderHeader();
      this.renderOrderBook();
    },

    renderHeader() {
      this.els.price.textContent = this.state.price.toFixed(2);
      this.els.quote.textContent = this.state.quote;
      this.els.approx.textContent = `≈ ${this.state.price.toFixed(2)} ${this.state.quote}`;
    },

    renderOrderBook() {
      this.els.bids.innerHTML = '';
      this.els.asks.innerHTML = '';
      this.els.ladder.innerHTML = '';

      this.state.bids.forEach((p, i) => {
        this.els.bids.innerHTML += `<div>${p}</div>`;
        this.els.ladder.innerHTML += `<div>${this.state.price.toFixed(2)}</div>`;
        this.els.asks.innerHTML += `<div>${this.state.asks[i]}</div>`;
      });
    },

    initChart() {
      const chart = LightweightCharts.createChart(
        document.getElementById('bxChart'),
        {
          layout: { background: { color: '#0b0f14' }, textColor: '#ccc' },
          grid: { vertLines: { color: '#1e2a35' }, horzLines: { color: '#1e2a35' } },
          timeScale: { timeVisible: true }
        }
      );

      const series = chart.addLineSeries({ color: '#00e676' });

      this.state.chart = chart;
      this.state.series = series;
      this.updateChart();
    },

    updateChart() {
      const data = [];
      let t = Math.floor(Date.now() / 1000);

      for (let i = 30; i > 0; i--) {
        data.push({
          time: t - i * 60,
          value: this.state.price + (Math.random() - 0.5)
        });
      }

      this.state.series.setData(data);
    },

    randomPrice() {
      return +(30 + Math.random() * 20).toFixed(2);
    }
  };

  document.addEventListener('DOMContentLoaded', () => Market.init());
})();
