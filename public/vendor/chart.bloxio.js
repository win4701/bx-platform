/*!
 * BLOXIO CHART ENGINE
 * Standalone, dependency-free financial chart renderer.
 * File: public/vendor/chart.bloxio.js
 * No Lightweight Charts, CDN, framework, or third-party runtime required.
 *
 * Usage:
 *   const chart = BloxioChart.create('#chart', {
 *     symbol: 'BTC/USDT',
 *     interval: '1H',
 *     data: candles
 *   });
 *   chart.update({ time: 1794600000, open: 95000, high: 96500,
 *                  low: 94500, close: 96000, volume: 1250 });
 */
(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BloxioChart = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function (root) {
  'use strict';

  const VERSION = '7.0.0';

  const DEFAULTS = {
    symbol: 'BTC/USDT',
    interval: '1H',
    currency: 'USDT',
    locale: 'en-US',
    height: 480,
    minHeight: 220,
    background: '#080D18',
    panelBackground: '#0D1422',
    text: '#A8B4C8',
    muted: '#65738A',
    grid: 'rgba(132,154,190,.11)',
    border: 'rgba(150,170,205,.16)',
    up: '#00E6A0',
    down: '#FF5576',
    accent: '#8B7CFF',
    crosshair: 'rgba(139,124,255,.72)',
    font: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    precision: 2,
    minMove: 0.01,
    showVolume: true,
    showGrid: true,
    showWatermark: true,
    watermark: 'BLOXIO',
    showHeader: true,
    showToolbar: true,
    showLastPrice: true,
    showCrosshair: true,
    showLegend: true,
    candleWidth: 8,
    rightOffset: 3,
    maxVisibleBars: 240,
    minVisibleBars: 12,
    chartType: 'candles',
    volumeRatio: 0.19,
    autoFit: true,
    indicators: [],
    showRSI: false,
    showMACD: false,
    oscillatorHeight: 92,
    websocket: null,
    reconnectDelay: 1500,
    maxReconnectDelay: 30000,
    onMarketMessage: null,
    onSocketStatus: null,
    onCrosshairMove: null,
    onVisibleRangeChange: null,
    onClick: null
  };

  const CSS_ID = 'bloxio-chart-engine-css';
  const CSS = `
  .bx-chart{--bx-bg:#080D18;--bx-panel:#0D1422;--bx-text:#A8B4C8;--bx-muted:#65738A;--bx-border:rgba(150,170,205,.16);display:flex;flex-direction:column;position:relative;width:100%;min-width:0;overflow:hidden;color:var(--bx-text);background:var(--bx-bg);border:1px solid var(--bx-border);border-radius:14px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;isolation:isolate}
  .bx-chart *{box-sizing:border-box}
  .bx-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid var(--bx-border);background:linear-gradient(180deg,rgba(255,255,255,.025),transparent)}
  .bx-brand{display:flex;align-items:center;gap:10px;min-width:0}
  .bx-logo{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:linear-gradient(135deg,#00E6A0,#70FFD2);color:#06130F;font-weight:950;font-size:17px;box-shadow:0 0 22px rgba(0,230,160,.16)}
  .bx-symbol{color:#F3F7FF;font-size:14px;font-weight:800;white-space:nowrap}
  .bx-interval{margin-top:3px;color:var(--bx-muted);font-size:11px}
  .bx-quote{text-align:right;min-width:0}
  .bx-price{color:#F4F7FC;font-size:19px;line-height:1.2;font-weight:800;font-variant-numeric:tabular-nums}
  .bx-change{margin-top:3px;font-size:11px;font-weight:750;font-variant-numeric:tabular-nums}
  .bx-change.up{color:var(--bx-up,#00E6A0)}.bx-change.down{color:var(--bx-down,#FF5576)}
  .bx-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-bottom:1px solid var(--bx-border);background:rgba(255,255,255,.012)}
  .bx-tool-group{display:flex;align-items:center;gap:5px;flex-wrap:wrap}
  .bx-tool{appearance:none;border:1px solid transparent;border-radius:7px;padding:6px 9px;background:transparent;color:var(--bx-muted);font:600 11px inherit;cursor:pointer}
  .bx-tool:hover{color:#F3F7FF;background:rgba(255,255,255,.05)}
  .bx-tool[aria-pressed=true]{color:#00E6A0;border-color:rgba(0,230,160,.22);background:rgba(0,230,160,.08)}
  .bx-legend{display:flex;gap:10px;color:var(--bx-muted);font-size:10px}
  .bx-key{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}
  .bx-stage{position:relative;width:100%;min-height:180px;background:var(--bx-bg);touch-action:pan-y}
  .bx-canvas{display:block;width:100%;height:100%;outline:none;touch-action:none}
  .bx-watermark{position:absolute;left:18px;bottom:25px;pointer-events:none;color:rgba(180,198,224,.065);font-size:29px;line-height:1;font-weight:950;letter-spacing:.16em;user-select:none}
  .bx-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:30px;padding:7px 12px;border-top:1px solid var(--bx-border);background:rgba(255,255,255,.012);color:var(--bx-muted);font-size:10px}
  .bx-live{display:inline-block;width:6px;height:6px;margin-right:6px;border-radius:50%;background:#00E6A0;box-shadow:0 0 8px rgba(0,230,160,.65)}
  .bx-chart button:focus-visible{outline:2px solid #8B7CFF;outline-offset:2px}
  @media(max-width:600px){.bx-head{padding:10px 11px}.bx-tools{padding:7px 8px}.bx-price{font-size:16px}.bx-legend{display:none}.bx-tool{padding:6px 7px}}
  @media(prefers-reduced-motion:reduce){.bx-chart *{transition:none!important;animation:none!important}}
  `;

  function installCss(doc) {
    if (!doc || doc.getElementById(CSS_ID)) return;
    const node = doc.createElement('style');
    node.id = CSS_ID;
    node.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(node);
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function timeNumber(t) {
    if (typeof t === 'number') return t;
    if (typeof t === 'string') {
      const parsed = Date.parse(t);
      if (!Number.isFinite(parsed)) throw new TypeError('Invalid candle time: ' + t);
      return Math.floor(parsed / 1000);
    }
    if (t && Number.isFinite(t.year) && Number.isFinite(t.month) && Number.isFinite(t.day)) {
      return Math.floor(Date.UTC(t.year, t.month - 1, t.day) / 1000);
    }
    throw new TypeError('Candle time must be Unix seconds, an ISO date string, or {year, month, day}.');
  }

  function normalize(c) {
    if (!c || c.time == null) throw new TypeError('Every candle requires a time field.');
    const out = {
      time: timeNumber(c.time),
      open: Number(c.open), high: Number(c.high),
      low: Number(c.low), close: Number(c.close),
      volume: c.volume == null ? 0 : Number(c.volume)
    };
    if (![out.open, out.high, out.low, out.close, out.volume].every(Number.isFinite)) {
      throw new TypeError('OHLC and volume values must be finite numbers.');
    }
    if (out.high < Math.max(out.open, out.close, out.low) ||
        out.low > Math.min(out.open, out.close, out.high) || out.volume < 0) {
      throw new RangeError('Invalid OHLC candle or negative volume.');
    }
    return out;
  }

  function numberFormat(value, options, compact) {
    if (!Number.isFinite(value)) return '—';
    return new Intl.NumberFormat(options.locale, compact ? {
      notation: 'compact', maximumFractionDigits: 2
    } : {
      minimumFractionDigits: options.precision,
      maximumFractionDigits: options.precision
    }).format(value);
  }

  class Engine {
    constructor(target, config) {
      this.options = Object.assign({}, DEFAULTS, config || {});
      this.target = typeof target === 'string' ? root.document.querySelector(target) : target;
      if (!this.target) throw new Error('BloxioChart: target element not found.');
      if (!this.target.ownerDocument) throw new Error('BloxioChart: target must be a DOM element.');

      this.data = [];
      this.viewEnd = 0;
      this.visibleBars = Math.min(this.options.maxVisibleBars, 90);
      this.hoverIndex = -1;
      this.pointer = null;
      this.drag = null;
      this.destroyed = false;
      this.frame = 0;
      this.dpr = 1;
      this.plot = null;
      this._indicatorDefinitions = [];
      this._indicatorCache = [];
      this._indicatorSequence = 0;
      this._drawings = [];
      this._drawingTool = null;
      this._drawingStart = null;
      this._panelCache = {};
      this.socket = null;
      this._socketConfig = null;
      this._manualSocketClose = false;
      this._mount();
      this._events();
      if (Array.isArray(this.options.data)) this.setData(this.options.data);
      this.resize();
    }

    _mount() {
      installCss(this.target.ownerDocument);
      this.target.classList.add('bx-chart');
      this.target.style.setProperty('--bx-bg', this.options.background);
      this.target.style.setProperty('--bx-text', this.options.text);
      this.target.style.setProperty('--bx-muted', this.options.muted);
      this.target.style.setProperty('--bx-border', this.options.border);
      this.target.style.setProperty('--bx-up', this.options.up);
      this.target.style.setProperty('--bx-down', this.options.down);

      this.target.innerHTML = `
        ${this.options.showHeader ? `<div class="bx-head">
          <div class="bx-brand"><div class="bx-logo" aria-hidden="true">B</div><div>
            <div class="bx-symbol">${esc(this.options.symbol)}</div>
            <div class="bx-interval">${esc(this.options.interval)} · BLOXIO MARKET</div>
          </div></div>
          <div class="bx-quote"><div class="bx-price" data-bx-price>—</div><div class="bx-change" data-bx-change>Waiting for data</div></div>
        </div>` : ''}
        ${this.options.showToolbar ? `<div class="bx-tools">
          <div class="bx-tool-group" role="group" aria-label="Chart type">
            <button class="bx-tool" data-type="candles" aria-pressed="true" type="button">Candles</button>
            <button class="bx-tool" data-type="line" aria-pressed="false" type="button">Line</button>
            <button class="bx-tool" data-type="area" aria-pressed="false" type="button">Area</button>
            <button class="bx-tool" data-panel="rsi" aria-pressed="false" type="button">RSI</button>
            <button class="bx-tool" data-panel="macd" aria-pressed="false" type="button">MACD</button>
          </div>
          <div class="bx-tool-group">
            <button class="bx-tool" data-draw="trend" aria-pressed="false" type="button">Trend</button>
            <button class="bx-tool" data-draw="fib" aria-pressed="false" type="button">Fib</button>
            <button class="bx-tool" data-action="clear-drawings" type="button">Clear</button>
            <button class="bx-tool" data-action="fit" type="button">Fit</button>
            <button class="bx-tool" data-action="zoom-in" type="button" aria-label="Zoom in">＋</button>
            <button class="bx-tool" data-action="zoom-out" type="button" aria-label="Zoom out">－</button>
          </div>
        </div>` : ''}
        <div class="bx-stage" style="height:${Math.max(this.options.minHeight, this.options.height)}px">
          <canvas class="bx-canvas" tabindex="0" role="img" aria-label="${esc(this.options.symbol)} price chart"></canvas>
          ${this.options.showWatermark ? `<div class="bx-watermark">${esc(this.options.watermark)}</div>` : ''}
        </div>
        <div class="bx-foot"><span><i class="bx-live"></i><span data-bx-status>Engine ready</span></span><span>BLOXIO CHART ENGINE ${VERSION}</span></div>
      `;

      this.stage = this.target.querySelector('.bx-stage');
      this.canvas = this.target.querySelector('canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      if (!this.ctx) throw new Error('BloxioChart: Canvas 2D is not available in this browser.');
      this.priceNode = this.target.querySelector('[data-bx-price]');
      this.changeNode = this.target.querySelector('[data-bx-change]');
      this.statusNode = this.target.querySelector('[data-bx-status]');
      this._buttons();
      this.target.querySelectorAll('[data-panel]').forEach(button => {
        button.setAttribute('aria-pressed', String(
          button.dataset.panel === 'rsi' ? !!this.options.showRSI : !!this.options.showMACD
        ));
      });
    }

    _buttons() {
      this.target.querySelectorAll('[data-type]').forEach(button => {
        button.addEventListener('click', () => this.setChartType(button.dataset.type));
      });
      this.target.querySelectorAll('[data-panel]').forEach(button => {
        button.addEventListener('click', () => this.togglePanel(button.dataset.panel));
      });
      this.target.querySelectorAll('[data-draw]').forEach(button => {
        button.addEventListener('click', () => this.setDrawingTool(
          this._drawingTool === button.dataset.draw ? null : button.dataset.draw
        ));
      });
      this.target.querySelectorAll('[data-action]').forEach(button => {
        button.addEventListener('click', () => {
          const action = button.dataset.action;
          if (action === 'fit') this.fitContent();
          if (action === 'zoom-in') this.zoom(0.8);
          if (action === 'zoom-out') this.zoom(1.25);
          if (action === 'clear-drawings') this.clearDrawings();
        });
      });
    }

    _events() {
      this._onPointerMove = e => this._pointerMove(e);
      this._onPointerDown = e => this._pointerDown(e);
      this._onPointerUp = e => this._pointerUp(e);
      this._onWheel = e => {
        if (!this.data.length) return;
        e.preventDefault();
        const factor = e.deltaY < 0 ? 0.88 : 1.14;
        this.zoom(factor, this._indexAt(e.offsetX));
      };
      this._onLeave = () => {
        this.pointer = null;
        this.hoverIndex = -1;
        this._scheduleDraw();
      };
      this.canvas.addEventListener('pointermove', this._onPointerMove);
      this.canvas.addEventListener('pointerdown', this._onPointerDown);
      this.canvas.addEventListener('pointerup', this._onPointerUp);
      this.canvas.addEventListener('pointercancel', this._onPointerUp);
      this.canvas.addEventListener('pointerleave', this._onLeave);
      this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
      this._onKeyDown = e => {
        if (e.key === '+' || e.key === '=') { e.preventDefault(); this.zoom(0.8); }
        if (e.key === '-') { e.preventDefault(); this.zoom(1.25); }
        if (e.key === 'Home') { e.preventDefault(); this.fitContent(); }
      };
      this.canvas.addEventListener('keydown', this._onKeyDown);

      if (typeof root.ResizeObserver === 'function') {
        this.observer = new root.ResizeObserver(() => this.resize());
        this.observer.observe(this.target);
      } else {
        this._onWindowResize = () => this.resize();
        root.addEventListener('resize', this._onWindowResize);
      }
    }

    _buttonsState() {
      this.target.querySelectorAll('[data-type]').forEach(b =>
        b.setAttribute('aria-pressed', String(b.dataset.type === this.options.chartType)));
    }

    _pointerDown(e) {
      if (!this.data.length) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.hoverIndex = this._indexAt(this.pointer.x);
      this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, end: this.viewEnd, moved: false };
    }

    _pointerMove(e) {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.canvas.style.cursor = this._drawingTool ? 'crosshair' : (this.drag ? 'grabbing' : 'crosshair');
      this.hoverIndex = this._indexAt(this.pointer.x);
      if (this.drag) {
        const dx = e.clientX - this.drag.x;
        if (Math.abs(dx) > 2) this.drag.moved = true;
        const step = this.plot ? this.plot.candleStep : 8;
        const shift = Math.round(dx / Math.max(1, step));
        this.viewEnd = Math.max(this.visibleBars, Math.min(this.data.length, this.drag.end - shift));
      }
      this._scheduleDraw();
      if (typeof this.options.onCrosshairMove === 'function') {
        const candle = this.data[this.hoverIndex];
        this.options.onCrosshairMove(candle ? Object.assign({}, candle) : null, this.hoverIndex);
      }
    }

    _pointerUp(e) {
      if (this.drag && !this.drag.moved && this._drawingTool && this.plot && this.pointer) {
        const index = this._indexAt(this.pointer.x);
        const value = this._priceAtY(this.pointer.y);
        if (index >= 0 && Number.isFinite(value)) {
          const point = { index, time: this.data[index] && this.data[index].time, price: value };
          if (!this._drawingStart) {
            this._drawingStart = point;
            this.statusNode.textContent = 'Select second point for ' + this._drawingTool;
          } else {
            this._drawings.push({ type: this._drawingTool, a: this._drawingStart, b: point });
            this._drawingStart = null;
            this.statusNode.textContent = 'Drawing added';
          }
          this._scheduleDraw();
        }
      } else if (this.drag && !this.drag.moved && typeof this.options.onClick === 'function') {
        const candle = this.data[this.hoverIndex];
        this.options.onClick(candle ? Object.assign({}, candle) : null, this.hoverIndex);
      }
      this.drag = null;
      if (this.canvas.releasePointerCapture && this.canvas.hasPointerCapture &&
          this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
      if (typeof this.options.onVisibleRangeChange === 'function') {
        this.options.onVisibleRangeChange(this.getVisibleRange());
      }
    }

    _indexAt(x) {
      if (!this.plot || !this.data.length) return -1;
      const raw = Math.floor((x - this.plot.left) / this.plot.candleStep) + this.plot.start;
      return Math.max(0, Math.min(this.data.length - 1, raw));
    }

    resize() {
      if (this.destroyed) return this;
      const width = Math.max(1, this.stage.clientWidth);
      const height = Math.max(this.options.minHeight, this.stage.clientHeight || this.options.height);
      this.dpr = Math.max(1, Math.min(3, root.devicePixelRatio || 1));
      this.canvas.width = Math.round(width * this.dpr);
      this.canvas.height = Math.round(height * this.dpr);
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this._scheduleDraw();
      return this;
    }

    _scheduleDraw() {
      if (this.frame || this.destroyed) return;
      const raf = root.requestAnimationFrame || (fn => root.setTimeout(fn, 16));
      this.frame = raf(() => { this.frame = 0; this._draw(); });
    }

    _visible() {
      const end = Math.min(this.data.length, Math.max(this.visibleBars, this.viewEnd || this.data.length));
      const start = Math.max(0, end - this.visibleBars);
      return { start, end, rows: this.data.slice(start, end) };
    }

    _draw() {
      if (this.destroyed) return;
      const ctx = this.ctx;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = this.options.background;
      ctx.fillRect(0, 0, w, h);

      const left = 12, right = 82, top = 18, bottom = 28;
      const panelCount = (this.options.showRSI ? 1 : 0) + (this.options.showMACD ? 1 : 0);
      const oscillatorTotal = panelCount * Math.max(64, Number(this.options.oscillatorHeight) || 92);
      const volumeHeight = this.options.showVolume ? Math.max(34, h * this.options.volumeRatio) : 0;
      const priceBottom = h - bottom - volumeHeight - oscillatorTotal;
      const plotWidth = Math.max(20, w - left - right);
      const priceHeight = Math.max(40, priceBottom - top);
      const visible = this._visible();
      const rows = visible.rows;
      const candleStep = plotWidth / Math.max(1, this.visibleBars);
      this.plot = { left, right: w - right, top, bottom: priceBottom, start: visible.start,
        end: visible.end, candleStep, priceHeight, volumeTop: priceBottom + 10, width: plotWidth,
        priceMinMax: null };

      if (!rows.length) {
        this._drawEmpty(ctx, w, h);
        return;
      }

      let min = Infinity, max = -Infinity, maxVolume = 0;
      rows.forEach(c => {
        min = Math.min(min, c.low);
        max = Math.max(max, c.high);
        maxVolume = Math.max(maxVolume, c.volume);
      });
      let range = max - min;
      if (!Number.isFinite(range) || range === 0) range = Math.max(Math.abs(max) * 0.002, this.options.minMove || 0.01);
      const padding = range * 0.09;
      min -= padding; max += padding;
      this.plot.priceMinMax = { min, max };
      const y = value => top + (max - value) / (max - min) * priceHeight;
      const x = index => left + (index - visible.start + 0.5) * candleStep;
      const priceAtY = py => max - ((py - top) / priceHeight) * (max - min);

      this._grid(ctx, w, left, right, top, priceBottom, min, max, y);
      if (this.options.chartType === 'candles') this._candles(ctx, rows, visible.start, x, y, candleStep);
      else this._line(ctx, rows, visible.start, x, y, priceBottom, this.options.chartType === 'area');
      this._drawIndicators(ctx, rows, visible.start, x, y);
      this._drawDrawings(ctx, x, y, visible.start, visible.end);
      this._drawPendingDrawing(ctx, x, y, visible.start, visible.end);

      let panelY = priceBottom + volumeHeight;
      if (this.options.showRSI) {
        panelY = this._drawRSIPanel(ctx, rows, visible.start, x, panelY, plotWidth, h);
      }
      if (this.options.showMACD) {
        panelY = this._drawMACDPanel(ctx, rows, visible.start, x, panelY, plotWidth, h);
      }
      if (this.options.showVolume) this._volume(ctx, rows, visible.start, x, candleStep, maxVolume, priceBottom + volumeHeight);
      this._timeAxis(ctx, rows, visible.start, x, w, h, bottom);
      if (this.options.showLastPrice) this._lastPrice(ctx, rows[rows.length - 1].close, y, w, left, right);
      if (this.options.showCrosshair && this.pointer && this.hoverIndex >= visible.start && this.hoverIndex < visible.end) {
        this._crosshair(ctx, this.hoverIndex, x, y, priceAtY, w, h, rows, visible.start);
      }
      this._updateHeader(rows[rows.length - 1]);
    }

    _priceAtY(py) {
      if (!this.plot || !this.plot.priceMinMax) return NaN;
      const { min, max } = this.plot.priceMinMax;
      return max - ((py - this.plot.top) / this.plot.priceHeight) * (max - min);
    }

    togglePanel(name) {
      this._assert();
      if (name === 'rsi') this.options.showRSI = !this.options.showRSI;
      else if (name === 'macd') this.options.showMACD = !this.options.showMACD;
      else throw new TypeError('Panel must be rsi or macd.');
      this.target.querySelectorAll('[data-panel]').forEach(button => {
        const active = button.dataset.panel === name &&
          (name === 'rsi' ? this.options.showRSI : this.options.showMACD);
        button.setAttribute('aria-pressed', String(active));
      });
      this.resize();
      return this;
    }

    setDrawingTool(tool) {
      this._assert();
      if (tool != null && !['trend', 'fib'].includes(tool)) {
        throw new TypeError('Drawing tool must be trend, fib, or null.');
      }
      this._drawingTool = tool;
      this._drawingStart = null;
      this.canvas.style.cursor = tool ? 'crosshair' : 'grab';
      this.target.querySelectorAll('[data-draw]').forEach(button =>
        button.setAttribute('aria-pressed', String(button.dataset.draw === tool)));
      this.statusNode.textContent = tool ? 'Click two points to draw ' + tool : 'Drawing tool disabled';
      return this;
    }

    clearDrawings() {
      this._drawings = [];
      this._drawingStart = null;
      this._scheduleDraw();
      return this;
    }

    _drawDrawings(ctx, x, y, start, end) {
      if (!this._drawings.length) return;
      ctx.save();
      this._drawings.forEach(d => {
        if (!d.a || !d.b) return;
        const ax = x(d.a.index), bx = x(d.b.index);
        const ay = y(d.a.price), by = y(d.b.price);
        if (d.type === 'trend') {
          ctx.strokeStyle = '#F5C451';
          ctx.lineWidth = 1.7;
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          this._drawAnchor(ctx, ax, ay); this._drawAnchor(ctx, bx, by);
        } else if (d.type === 'fib') {
          const levels = [
            [0, '0.0%'], [0.236, '23.6%'], [0.382, '38.2%'],
            [0.5, '50.0%'], [0.618, '61.8%'], [0.786, '78.6%'], [1, '100%']
          ];
          const diff = d.b.price - d.a.price;
          ctx.font = '10px ' + this.options.font;
          levels.forEach(([ratio, label]) => {
            const py = y(d.b.price - diff * ratio);
            ctx.strokeStyle = ratio === 0.5 ? 'rgba(0,230,160,.8)' : 'rgba(139,124,255,.58)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.moveTo(Math.min(ax,bx), py); ctx.lineTo(Math.max(ax,bx), py); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#C9D2E2';
            ctx.textAlign = 'left';
            ctx.fillText(label, Math.min(ax,bx) + 4, py - 3);
          });
        }
      });
      ctx.restore();
    }

    _drawPendingDrawing(ctx, x, y) {
      if (!this._drawingStart || !this.pointer || !this._drawingTool ||
          this.pointer.y < this.plot.top || this.pointer.y > this.plot.bottom) return;
      const a = this._drawingStart;
      const b = { index: this._indexAt(this.pointer.x), price: this._priceAtY(this.pointer.y) };
      if (b.index < 0 || !Number.isFinite(b.price)) return;
      ctx.save();
      ctx.strokeStyle = this._drawingTool === 'fib' ? this.options.accent : '#F5C451';
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(x(a.index), y(a.price));
      ctx.lineTo(x(b.index), y(b.price));
      ctx.stroke();
      ctx.restore();
    }

    _drawAnchor(ctx, x, y) {
      ctx.beginPath();
      ctx.fillStyle = '#F5C451';
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    _panelFrame(ctx, title, yTop, width, height) {
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,.018)';
      ctx.fillRect(this.plot.left, yTop, width, height);
      ctx.strokeStyle = this.options.grid;
      ctx.beginPath(); ctx.moveTo(this.plot.left, yTop); ctx.lineTo(this.plot.right, yTop); ctx.stroke();
      ctx.fillStyle = this.options.muted;
      ctx.font = '10px ' + this.options.font;
      ctx.textAlign = 'left';
      ctx.fillText(title, this.plot.left + 4, yTop + 12);
      ctx.restore();
    }

    _drawRSIPanel(ctx, rows, start, x, yTop, width) {
      const height = Math.max(64, Number(this.options.oscillatorHeight) || 92);
      const top = yTop + 4, bottom = yTop + height - 8;
      const values = BloxioChart.indicators.rsi(this.data, { period: 14 }).values.slice(start, start + rows.length);
      this._panelFrame(ctx, 'RSI 14', yTop, width, height);
      const yy = v => bottom - (v / 100) * (bottom - top);
      ctx.save();
      [30, 50, 70].forEach(level => {
        ctx.strokeStyle = level === 50 ? this.options.grid : 'rgba(139,124,255,.28)';
        ctx.setLineDash(level === 50 ? [] : [3, 4]);
        ctx.beginPath(); ctx.moveTo(this.plot.left, yy(level)); ctx.lineTo(this.plot.right, yy(level)); ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.beginPath();
      let begun = false;
      values.forEach((v, i) => {
        if (v == null) { begun = false; return; }
        if (!begun) { ctx.moveTo(x(start + i), yy(v)); begun = true; }
        else ctx.lineTo(x(start + i), yy(v));
      });
      ctx.strokeStyle = '#8B7CFF'; ctx.lineWidth = 1.7; ctx.stroke();
      ctx.fillStyle = this.options.muted; ctx.font = '9px ' + this.options.font;
      ctx.textAlign = 'right'; ctx.fillText('70', this.plot.right + 30, yy(70) + 3);
      ctx.fillText('30', this.plot.right + 30, yy(30) + 3);
      ctx.restore();
      return yTop + height;
    }

    _drawMACDPanel(ctx, rows, start, x, yTop, width) {
      const height = Math.max(64, Number(this.options.oscillatorHeight) || 92);
      const top = yTop + 15, bottom = yTop + height - 8;
      const full = BloxioChart.indicators.macd(this.data, { fast: 12, slow: 26, signal: 9 });
      const result = {
        values: full.values.slice(start, start + rows.length),
        signal: full.signal.slice(start, start + rows.length),
        histogram: full.histogram.slice(start, start + rows.length)
      };
      const all = result.values.concat(result.signal, result.histogram).filter(Number.isFinite);
      let abs = 1e-9;
      for (let i = 0; i < all.length; i++) abs = Math.max(abs, Math.abs(all[i]));
      const zeroY = (top + bottom) / 2;
      const scale = (bottom - top) / (2 * abs * 1.12);
      this._panelFrame(ctx, 'MACD 12 · 26 · 9', yTop, width, height);
      ctx.save();
      ctx.strokeStyle = this.options.grid;
      ctx.beginPath(); ctx.moveTo(this.plot.left, zeroY); ctx.lineTo(this.plot.right, zeroY); ctx.stroke();
      const barW = Math.max(1, Math.min(8, this.plot.candleStep * .58));
      result.histogram.forEach((v, i) => {
        if (v == null) return;
        ctx.fillStyle = v >= 0 ? 'rgba(0,230,160,.65)' : 'rgba(255,85,118,.65)';
        const yy = zeroY - v * scale;
        ctx.fillRect(x(start + i) - barW / 2, Math.min(yy, zeroY), barW, Math.max(1, Math.abs(yy - zeroY)));
      });
      const drawLine = (values, color, lineWidth) => {
        ctx.beginPath(); let begun = false;
        values.forEach((v, i) => {
          if (v == null) { begun = false; return; }
          const xx = x(start + i), yy = zeroY - v * scale;
          if (!begun) { ctx.moveTo(xx, yy); begun = true; } else ctx.lineTo(xx, yy);
        });
        ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.stroke();
      };
      drawLine(result.values, '#8B7CFF', 1.5);
      drawLine(result.signal, '#F5C451', 1.3);
      ctx.restore();
      return yTop + height;
    }

    _drawEmpty(ctx, w, h) {
      ctx.save();
      ctx.fillStyle = this.options.muted;
      ctx.font = '12px ' + this.options.font;
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for market data', w / 2, h / 2);
      ctx.restore();
    }

    _grid(ctx, w, left, right, top, bottom, min, max, y) {
      ctx.save();
      ctx.font = '10px ' + this.options.font;
      ctx.lineWidth = 1;
      const count = 5;
      for (let i = 0; i <= count; i++) {
        const yy = top + (bottom - top) * i / count;
        const value = max - (max - min) * i / count;
        if (this.options.showGrid) {
          ctx.strokeStyle = this.options.grid;
          ctx.beginPath(); ctx.moveTo(left, Math.round(yy) + .5); ctx.lineTo(w - right, Math.round(yy) + .5); ctx.stroke();
        }
        ctx.fillStyle = this.options.muted;
        ctx.textAlign = 'left';
        ctx.fillText(numberFormat(value, this.options), w - right + 9, yy + 3);
      }
      ctx.restore();
    }

    _candles(ctx, rows, start, x, y, step) {
      ctx.save();
      const bodyWidth = Math.max(1, Math.min(18, step * 0.66));
      rows.forEach((c, i) => {
        const xx = x(start + i);
        const bullish = c.close >= c.open;
        const color = bullish ? this.options.up : this.options.down;
        const openY = y(c.open), closeY = y(c.close);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = Math.max(1, Math.min(1.5, step * .12));
        ctx.beginPath(); ctx.moveTo(xx, y(c.high)); ctx.lineTo(xx, y(c.low)); ctx.stroke();
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(1, Math.abs(closeY - openY));
        if (bodyHeight < 2) {
          ctx.fillRect(xx - bodyWidth / 2, bodyTop, bodyWidth, 1.5);
        } else {
          ctx.fillRect(xx - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);
        }
      });
      ctx.restore();
    }

    _line(ctx, rows, start, x, y, bottom, area) {
      if (!rows.length) return;
      ctx.save();
      ctx.beginPath();
      rows.forEach((c, i) => {
        const xx = x(start + i), yy = y(c.close);
        if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      });
      if (area) {
        ctx.lineTo(x(start + rows.length - 1), bottom);
        ctx.lineTo(x(start), bottom);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, bottom);
        gradient.addColorStop(0, 'rgba(139,124,255,.27)');
        gradient.addColorStop(1, 'rgba(139,124,255,0)');
        ctx.fillStyle = gradient; ctx.fill();
        ctx.beginPath();
        rows.forEach((c, i) => {
          const xx = x(start + i), yy = y(c.close);
          if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
        });
      }
      ctx.strokeStyle = area ? this.options.accent : this.options.up;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }

    _drawIndicators(ctx, rows, start, x, y) {
      const list = this._indicatorCache || [];
      if (!list.length) return;
      ctx.save();
      list.forEach(indicator => {
        if (!indicator.visible || !indicator.values) return;
        ctx.beginPath();
        let begun = false;
        const drawPath = values => {
          ctx.beginPath();
          let begun = false;
          values.forEach((value, i) => {
            if (value == null || !Number.isFinite(value)) { begun = false; return; }
            const px = x(start + i), py = y(value);
            if (!begun) { ctx.moveTo(px, py); begun = true; }
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        };
        ctx.strokeStyle = indicator.color;
        ctx.lineWidth = indicator.width || 1.6;
        ctx.setLineDash(indicator.dash || []);
        const visibleValues = indicator.values.slice(start, start + this.plot.end - this.plot.start);
        drawPath(visibleValues);
        if (indicator.upper) {
          ctx.strokeStyle = indicator.bandColor || indicator.color;
          drawPath(indicator.upper.slice(start, start + this.plot.end - this.plot.start));
        }
        if (indicator.lower) {
          ctx.strokeStyle = indicator.bandColor || indicator.color;
          drawPath(indicator.lower.slice(start, start + this.plot.end - this.plot.start));
        }
      });
      ctx.setLineDash([]);
      ctx.restore();
    }

    _refreshIndicators() {
      this._indicatorCache = (this._indicatorDefinitions || []).map(def => {
        const result = BloxioChart.indicators[def.type](this.data, def.params || {});
        return {
          id: def.id,
          type: def.type,
          color: def.color || '#8B7CFF',
          width: def.width || 1.6,
          dash: def.dash || [],
          visible: def.visible !== false,
          values: result.values || result,
          upper: result.upper || null,
          lower: result.lower || null,
          bandColor: def.bandColor || 'rgba(139,124,255,.55)'
        };
      });
    }

    addIndicator(type, params, style) {
      this._assert();
      if (!BloxioChart.indicators[type]) throw new TypeError('Unknown indicator: ' + type);
      if (type === 'rsi' || type === 'macd') {
        throw new Error('RSI and MACD are oscillator indicators. Use BloxioChart.calculate() until the dedicated oscillator panels are enabled.');
      }
      this._indicatorDefinitions = this._indicatorDefinitions || [];
      const id = 'bx-ind-' + (++this._indicatorSequence || (this._indicatorSequence = 1));
      this._indicatorDefinitions.push(Object.assign({ id, type, params: params || {} }, style || {}));
      this._refreshIndicators();
      this._scheduleDraw();
      return id;
    }

    removeIndicator(id) {
      this._assert();
      this._indicatorDefinitions = (this._indicatorDefinitions || []).filter(item => item.id !== id);
      this._refreshIndicators();
      this._scheduleDraw();
      return this;
    }

    clearIndicators() {
      this._assert();
      this._indicatorDefinitions = [];
      this._indicatorCache = [];
      this._scheduleDraw();
      return this;
    }

    connectWebSocket(url, options) {
      this._assert();
      if (typeof root.WebSocket !== 'function') throw new Error('WebSocket is not supported by this browser.');
      this.disconnectWebSocket();
      const cfg = Object.assign({
        reconnect: true,
        reconnectDelay: this.options.reconnectDelay,
        maxReconnectDelay: this.options.maxReconnectDelay,
        mapMessage: message => message,
        onOpen: null,
        onClose: null,
        onError: null
      }, options || {});
      this._socketConfig = { url, cfg };
      this._reconnectAttempt = 0;
      this._manualSocketClose = false;
      this._openSocket();
      return this;
    }

    _socketStatus(status, detail) {
      if (this.statusNode) this.statusNode.textContent = status;
      if (typeof this.options.onSocketStatus === 'function') {
        this.options.onSocketStatus(status, detail || null);
      }
    }

    _openSocket() {
      if (!this._socketConfig || this.destroyed) return;
      const { url, cfg } = this._socketConfig;
      let socket;
      try {
        socket = new root.WebSocket(url);
      } catch (error) {
        this._scheduleReconnect(error);
        return;
      }
      this.socket = socket;
      this._socketStatus('Connecting to market…');
      socket.onopen = event => {
        this._reconnectAttempt = 0;
        this._socketStatus('Live market connected');
        if (typeof cfg.onOpen === 'function') cfg.onOpen(event, socket);
      };
      socket.onmessage = event => {
        try {
          const raw = JSON.parse(event.data);
          const mapped = cfg.mapMessage(raw);
          if (mapped) {
            const items = Array.isArray(mapped) ? mapped : [mapped];
            items.forEach(item => {
              if (item && item.time != null && item.open != null) this.update(item);
            });
            if (typeof this.options.onMarketMessage === 'function') {
              this.options.onMarketMessage(raw, mapped);
            }
          }
        } catch (error) {
          this._socketStatus('Market message rejected', error);
        }
      };
      socket.onerror = event => {
        this._socketStatus('Market connection error', event);
        if (typeof cfg.onError === 'function') cfg.onError(event);
      };
      socket.onclose = event => {
        if (typeof cfg.onClose === 'function') cfg.onClose(event);
        if (!this._manualSocketClose) this._scheduleReconnect(event);
      };
    }

    _scheduleReconnect(reason) {
      if (!this._socketConfig || this._manualSocketClose || !this._socketConfig.cfg.reconnect) return;
      const cfg = this._socketConfig.cfg;
      const delay = Math.min(cfg.maxReconnectDelay,
        cfg.reconnectDelay * Math.pow(2, this._reconnectAttempt || 0));
      this._reconnectAttempt = (this._reconnectAttempt || 0) + 1;
      this._socketStatus('Reconnecting in ' + Math.ceil(delay / 1000) + 's', reason);
      if (this._reconnectTimer) root.clearTimeout(this._reconnectTimer);
      this._reconnectTimer = root.setTimeout(() => this._openSocket(), delay);
    }

    disconnectWebSocket() {
      this._manualSocketClose = true;
      if (this._reconnectTimer) root.clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
      if (this.socket) {
        const old = this.socket;
        this.socket = null;
        old.onopen = old.onmessage = old.onerror = old.onclose = null;
        if (old.readyState === 0 || old.readyState === 1) old.close();
      }
      return this;
    }

    _volume(ctx, rows, start, x, step, maxVolume, bottom) {
      if (!maxVolume) return;
      const top = this.plot.volumeTop;
      const available = Math.max(10, bottom - top);
      ctx.save();
      ctx.strokeStyle = this.options.grid;
      ctx.beginPath(); ctx.moveTo(this.plot.left, top); ctx.lineTo(this.plot.right, top); ctx.stroke();
      const bw = Math.max(1, Math.min(18, step * .66));
      rows.forEach((c, i) => {
        const height = c.volume / maxVolume * available * .9;
        ctx.fillStyle = c.close >= c.open ? 'rgba(0,230,160,.36)' : 'rgba(255,85,118,.36)';
        ctx.fillRect(x(start + i) - bw / 2, bottom - height, bw, height);
      });
      ctx.restore();
    }

    _timeAxis(ctx, rows, start, x, w, h, bottom) {
      if (!rows.length) return;
      ctx.save();
      ctx.font = '10px ' + this.options.font;
      ctx.fillStyle = this.options.muted;
      ctx.textAlign = 'center';
      const slots = Math.max(2, Math.floor(this.plot.width / 105));
      for (let i = 0; i <= slots; i++) {
        const idx = Math.min(rows.length - 1, Math.floor(i * (rows.length - 1) / slots));
        const date = new Date(rows[idx].time * 1000);
        const label = rows.length > 1 && rows[idx].time - rows[0].time > 86400 * 2
          ? date.toLocaleDateString(this.options.locale, { month: 'short', day: 'numeric' })
          : date.toLocaleTimeString(this.options.locale, { hour: '2-digit', minute: '2-digit', hour12: false });
        ctx.fillText(label, x(start + idx), h - 9);
      }
      ctx.restore();
    }

    _lastPrice(ctx, price, y, w, left, right) {
      const yy = y(price);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = this.options.up;
      ctx.globalAlpha = .65;
      ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(w - right, yy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      const label = numberFormat(price, this.options);
      ctx.font = '10px ' + this.options.font;
      const boxW = Math.max(60, ctx.measureText(label).width + 14);
      ctx.fillStyle = this.options.up;
      ctx.fillRect(w - right + 3, yy - 10, boxW, 20);
      ctx.fillStyle = '#04130E';
      ctx.textAlign = 'center';
      ctx.fillText(label, w - right + 3 + boxW / 2, yy + 3.5);
      ctx.restore();
    }

    _crosshair(ctx, index, x, y, priceAtY, w, h, rows, start) {
      const c = this.data[index];
      if (!c) return;
      const px = x(index);
      const py = this.pointer.y;
      ctx.save();
      ctx.strokeStyle = this.options.crosshair;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(px, this.plot.top); ctx.lineTo(px, h - 26); ctx.stroke();
      if (py >= this.plot.top && py <= this.plot.bottom) {
        ctx.beginPath(); ctx.moveTo(this.plot.left, py); ctx.lineTo(this.plot.right, py); ctx.stroke();
      }
      ctx.setLineDash([]);
      const date = new Date(c.time * 1000).toLocaleString(this.options.locale);
      const label = `${date}  O ${numberFormat(c.open,this.options)}  H ${numberFormat(c.high,this.options)}  L ${numberFormat(c.low,this.options)}  C ${numberFormat(c.close,this.options)}`;
      ctx.font = '10px ' + this.options.font;
      const tw = Math.min(w - 20, ctx.measureText(label).width + 18);
      const bx = Math.max(6, Math.min(w - tw - 6, px - tw / 2));
      ctx.fillStyle = '#151E30';
      ctx.fillRect(bx, 5, tw, 22);
      ctx.strokeStyle = this.options.border;
      ctx.strokeRect(bx, 5, tw, 22);
      ctx.fillStyle = '#DCE5F3';
      ctx.textAlign = 'center';
      ctx.fillText(label, bx + tw / 2, 19);
      ctx.restore();
    }

    _updateHeader(candle) {
      if (!this.priceNode || !candle) return;
      this.priceNode.textContent = numberFormat(candle.close, this.options);
      const first = this.data[0];
      if (first && first.open !== 0) {
        const pct = ((candle.close - first.open) / first.open) * 100;
        this.changeNode.textContent = (pct >= 0 ? '+' : '') + pct.toFixed(2) + '% since loaded range';
        this.changeNode.classList.toggle('up', pct >= 0);
        this.changeNode.classList.toggle('down', pct < 0);
      }
    }

    setData(input) {
      this._assert();
      if (!Array.isArray(input)) throw new TypeError('setData expects an array.');
      const normalized = input.map(normalize).sort((a,b) => a.time - b.time);
      for (let i = 1; i < normalized.length; i++) {
        if (normalized[i].time === normalized[i - 1].time) {
          throw new Error('Duplicate candle timestamps are not allowed in setData().');
        }
      }
      this.data = normalized;
      this.viewEnd = normalized.length;
      if (this.options.autoFit) this.visibleBars = Math.min(this.options.maxVisibleBars, Math.max(this.options.minVisibleBars, normalized.length));
      this.statusNode.textContent = normalized.length ? normalized.length.toLocaleString() + ' candles loaded' : 'Waiting for market data';
      this._refreshIndicators();
      this._scheduleDraw();
      return this;
    }

    update(input) {
      this._assert();
      const candle = normalize(input);
      const last = this.data[this.data.length - 1];
      if (last && candle.time < last.time) throw new Error('Out-of-order update. Use setData() for historical corrections.');
      if (last && candle.time === last.time) this.data[this.data.length - 1] = candle;
      else {
        this.data.push(candle);
        if (this.viewEnd >= this.data.length - 1) this.viewEnd = this.data.length;
      }
      if (this.data.length > 100000) this.data.splice(0, this.data.length - 100000);
      this.statusNode.textContent = 'Live market update';
      this._refreshIndicators();
      this._scheduleDraw();
      return this;
    }

    setChartType(type) {
      this._assert();
      if (!['candles','line','area'].includes(type)) throw new TypeError('Type must be candles, line, or area.');
      this.options.chartType = type;
      this._buttonsState();
      this._scheduleDraw();
      return this;
    }

    setSymbol(symbol, interval) {
      this._assert();
      this.options.symbol = String(symbol || this.options.symbol);
      if (interval) this.options.interval = String(interval);
      const a = this.target.querySelector('.bx-symbol');
      const b = this.target.querySelector('.bx-interval');
      if (a) a.textContent = this.options.symbol;
      if (b) b.textContent = this.options.interval + ' · BLOXIO MARKET';
      if (this.canvas) this.canvas.setAttribute('aria-label', this.options.symbol + ' price chart');
      return this;
    }

    setTheme(theme) {
      this._assert();
      Object.assign(this.options, theme || {});
      this.target.style.setProperty('--bx-bg', this.options.background);
      this.target.style.setProperty('--bx-text', this.options.text);
      this.target.style.setProperty('--bx-muted', this.options.muted);
      this.target.style.setProperty('--bx-border', this.options.border);
      this.target.style.setProperty('--bx-up', this.options.up);
      this.target.style.setProperty('--bx-down', this.options.down);
      this._scheduleDraw();
      return this;
    }

    fitContent() {
      this._assert();
      this.viewEnd = this.data.length;
      this.visibleBars = Math.min(this.options.maxVisibleBars, Math.max(this.options.minVisibleBars, this.data.length));
      this._scheduleDraw();
      return this;
    }

    zoom(factor, anchorIndex) {
      this._assert();
      const old = this.visibleBars;
      const next = Math.max(this.options.minVisibleBars,
        Math.min(this.options.maxVisibleBars, Math.round(old * factor)));
      if (anchorIndex != null && old > 0) {
        const ratio = (anchorIndex - (this.viewEnd - old)) / old;
        this.viewEnd = Math.min(this.data.length, Math.max(next,
          Math.round(anchorIndex + (1 - ratio) * next)));
      }
      this.visibleBars = next;
      this._scheduleDraw();
      return this;
    }

    getVisibleRange() {
      const v = this._visible();
      return {
        from: v.rows.length ? v.rows[0].time : null,
        to: v.rows.length ? v.rows[v.rows.length - 1].time : null,
        fromIndex: v.start,
        toIndex: v.end - 1
      };
    }

    getData() { return this.data.map(c => Object.assign({}, c)); }

    _assert() {
      if (this.destroyed) throw new Error('BloxioChart instance has been destroyed.');
    }

    destroy() {
      if (this.destroyed) return;
      this.disconnectWebSocket();
      this.pauseReplay();
      if (this._drawingObserver) this._drawingObserver.disconnect();
      if (this._depthWrap && this._depthWrap.parentNode) this._depthWrap.parentNode.removeChild(this._depthWrap);
      if (this._drawingCanvas && this._drawingCanvas.parentNode) this._drawingCanvas.parentNode.removeChild(this._drawingCanvas);
      this.destroyed = true;
      if (this.observer) this.observer.disconnect();
      if (this._onWindowResize) root.removeEventListener('resize', this._onWindowResize);
      if (this.frame) {
        const cancel = root.cancelAnimationFrame || root.clearTimeout;
        cancel(this.frame);
      }
      this.canvas.removeEventListener('pointermove', this._onPointerMove);
      this.canvas.removeEventListener('pointerdown', this._onPointerDown);
      this.canvas.removeEventListener('pointerup', this._onPointerUp);
      this.canvas.removeEventListener('pointercancel', this._onPointerUp);
      this.canvas.removeEventListener('pointerleave', this._onLeave);
      this.canvas.removeEventListener('wheel', this._onWheel);
      this.canvas.removeEventListener('keydown', this._onKeyDown);
      this.target.innerHTML = '';
      this.target.classList.remove('bx-chart');
    }
  }

  function closes(data) {
    return data.map(c => Number(c.close));
  }

  function emaArray(values, period) {
    const p = Math.max(1, Math.floor(period || 14));
    const out = new Array(values.length).fill(null);
    if (values.length < p) return out;
    let seed = 0;
    for (let i = 0; i < p; i++) seed += values[i];
    let previous = seed / p;
    out[p - 1] = previous;
    const alpha = 2 / (p + 1);
    for (let i = p; i < values.length; i++) {
      previous = values[i] * alpha + previous * (1 - alpha);
      out[i] = previous;
    }
    return out;
  }

  const indicators = {
    sma(data, params) {
      const values = closes(data), period = Math.max(1, Math.floor(params.period || 20));
      const out = new Array(values.length).fill(null);
      let sum = 0;
      for (let i = 0; i < values.length; i++) {
        sum += values[i];
        if (i >= period) sum -= values[i - period];
        if (i >= period - 1) out[i] = sum / period;
      }
      return { values: out };
    },
    ema(data, params) {
      return { values: emaArray(closes(data), params.period || 20) };
    },
    bollinger(data, params) {
      const values = closes(data), period = Math.max(2, Math.floor(params.period || 20));
      const multiplier = Number(params.multiplier || 2);
      const middle = indicators.sma(data, { period }).values;
      const upper = new Array(values.length).fill(null);
      const lower = new Array(values.length).fill(null);
      for (let i = period - 1; i < values.length; i++) {
        let variance = 0;
        for (let j = i - period + 1; j <= i; j++) variance += Math.pow(values[j] - middle[i], 2);
        const deviation = Math.sqrt(variance / period);
        upper[i] = middle[i] + multiplier * deviation;
        lower[i] = middle[i] - multiplier * deviation;
      }
      return { values: middle, upper, lower };
    },
    rsi(data, params) {
      const values = closes(data), period = Math.max(2, Math.floor(params.period || 14));
      const out = new Array(values.length).fill(null);
      if (values.length <= period) return { values: out };
      let gains = 0, losses = 0;
      for (let i = 1; i <= period; i++) {
        const delta = values[i] - values[i - 1];
        gains += Math.max(0, delta);
        losses += Math.max(0, -delta);
      }
      let avgGain = gains / period, avgLoss = losses / period;
      out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      for (let i = period + 1; i < values.length; i++) {
        const delta = values[i] - values[i - 1];
        avgGain = (avgGain * (period - 1) + Math.max(0, delta)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.max(0, -delta)) / period;
        out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
      return { values: out };
    },
    macd(data, params) {
      const values = closes(data);
      const fast = Math.max(2, Math.floor(params.fast || 12));
      const slow = Math.max(fast + 1, Math.floor(params.slow || 26));
      const signal = Math.max(2, Math.floor(params.signal || 9));
      const fastEma = emaArray(values, fast);
      const slowEma = emaArray(values, slow);
      const line = values.map((_, i) =>
        fastEma[i] == null || slowEma[i] == null ? null : fastEma[i] - slowEma[i]);
      const firstValid = line.findIndex(v => v != null);
      const compact = firstValid < 0 ? [] : line.slice(firstValid);
      const signalCompact = emaArray(compact, signal);
      const signalLine = new Array(values.length).fill(null);
      const histogram = new Array(values.length).fill(null);
      signalCompact.forEach((v, i) => {
        const index = firstValid + i;
        signalLine[index] = v;
        if (v != null && line[index] != null) histogram[index] = line[index] - v;
      });
      return { values: line, signal: signalLine, histogram };
    }
  };



  // V5 add-ons are implemented directly on the standalone engine.
  Engine.prototype.startReplay = function (options) {
    this._assert();
    const cfg = Object.assign({ speed: 1, interval: 500, from: 0 }, options || {});
    const history = this.getData();
    if (history.length < 2) throw new Error('Replay requires at least two candles.');
    this.pauseReplay();
    this._replayHistory = history;
    this._replayIndex = Math.max(1, Math.min(history.length, Math.floor(cfg.from) || 1));
    this._replaySpeed = Math.max(.25, Math.min(32, Number(cfg.speed) || 1));
    this._replayInterval = Math.max(50, Number(cfg.interval) || 500);
    this._applyReplayFrame();
    this.statusNode.textContent = 'Replay ' + this._replayIndex + ' / ' + history.length;
    this._replayTimer = root.setInterval(() => {
      if (this._replayIndex >= this._replayHistory.length) {
        this.pauseReplay();
        this.statusNode.textContent = 'Replay complete';
        return;
      }
      this._replayIndex++;
      const end = this._replayIndex;
      this._applyReplayFrame();
      this.statusNode.textContent = 'Replay ' + end + ' / ' + this._replayHistory.length;
    }, this._replayInterval / this._replaySpeed);
    return this;
  };

  Engine.prototype._applyReplayFrame = function () {
    this.data = this._replayHistory.slice(0, this._replayIndex);
    this.viewEnd = this.data.length;
    this.visibleBars = Math.min(this.options.maxVisibleBars,
      Math.max(this.options.minVisibleBars, this.data.length));
    this.lastCandle = this.data[this.data.length - 1] || null;
    if (typeof this._refreshIndicators === 'function') this._refreshIndicators();
    this._scheduleDraw();
    return this;
  };

  Engine.prototype.pauseReplay = function () {
    if (this._replayTimer) root.clearInterval(this._replayTimer);
    this._replayTimer = null;
    return this;
  };

  Engine.prototype.setReplaySpeed = function (speed) {
    const wasRunning = !!this._replayTimer;
    const history = this._replayHistory;
    const index = this._replayIndex;
    const interval = this._replayInterval;
    this._replaySpeed = Math.max(.25, Math.min(32, Number(speed) || 1));
    if (wasRunning && history) {
      this.pauseReplay();
      this._replayHistory = history;
      this._replayIndex = index;
      this._replayInterval = interval;
      this._replayTimer = root.setInterval(() => {
        if (this._replayIndex >= this._replayHistory.length) {
          this.pauseReplay();
          this.statusNode.textContent = 'Replay complete';
          return;
        }
        this._replayIndex++;
        this._applyReplayFrame();
      }, this._replayInterval / this._replaySpeed);
    }
    return this;
  };

  Engine.prototype.stepReplay = function (step) {
    this._assert();
    this.pauseReplay();
    if (!this._replayHistory) this._replayHistory = this.getData();
    if (!this._replayHistory.length) return this;
    this._replayIndex = Math.max(1, Math.min(this._replayHistory.length,
      (this._replayIndex || this._replayHistory.length) + Math.trunc(Number(step) || 1)));
    this._applyReplayFrame();
    this.statusNode.textContent = 'Replay ' + this._replayIndex + ' / ' + this._replayHistory.length;
    return this;
  };

  Engine.prototype.setOrderBook = function (bids, asks, options) {
    this._assert();
    const clean = rows => (Array.isArray(rows) ? rows : []).map(row => ({
      price: Number(Array.isArray(row) ? row[0] : row.price),
      amount: Number(Array.isArray(row) ? row[1] : row.amount)
    })).filter(row => Number.isFinite(row.price) && Number.isFinite(row.amount) &&
      row.price > 0 && row.amount > 0).sort((a,b) => a.price - b.price);
    this._orderBook = {
      bids: clean(bids).sort((a,b) => b.price - a.price),
      asks: clean(asks).sort((a,b) => a.price - b.price)
    };
    this._renderOrderBook(options);
    return this;
  };

  Engine.prototype._renderOrderBook = function (options) {
    if (!this._orderBook) return;
    const cfg = Object.assign({ levels: 12, height: 180 }, options || {});
    if (!this._depthWrap) {
      const doc = this.target.ownerDocument;
      this._depthWrap = doc.createElement('section');
      this._depthWrap.className = 'bx-depth-v5';
      this._depthWrap.style.cssText = 'padding:12px;border-top:1px solid rgba(150,170,205,.16);background:#0D1422;color:#A8B4C8';
      this._depthWrap.innerHTML = '<div style="display:flex;justify-content:space-between;font:700 11px sans-serif;margin-bottom:8px"><span>MARKET DEPTH</span><span data-bx-spread></span></div><canvas style="display:block;width:100%;height:' + cfg.height + 'px"></canvas>';
      this.target.appendChild(this._depthWrap);
    }
    const canvas = this._depthWrap.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const width = Math.max(1, canvas.clientWidth);
    const height = cfg.height;
    const dpr = Math.max(1, Math.min(3, root.devicePixelRatio || 1));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,width,height);
    const bids = this._orderBook.bids.slice(0,cfg.levels);
    const asks = this._orderBook.asks.slice(0,cfg.levels);
    const bestBid = bids[0] && bids[0].price;
    const bestAsk = asks[asks.length - 1] && asks[asks.length - 1].price;
    const spread = bestBid && bestAsk ? bestAsk - bestBid : null;
    const spreadNode = this._depthWrap.querySelector('[data-bx-spread]');
    spreadNode.textContent = spread == null ? 'Spread —' : 'Spread ' + numberFormat(spread,this.options);
    const bidSum = bids.reduce((a,r)=>a+r.amount,0);
    const askSum = asks.reduce((a,r)=>a+r.amount,0);
    const max = Math.max(1e-12,bidSum,askSum);
    const mid = width/2, rowH = (height-24)/Math.max(1,cfg.levels);
    ctx.font='10px ' + this.options.font;
    bids.forEach((row,i)=>{
      const y=18+i*rowH, bar=row.amount/max*(width*.43);
      ctx.fillStyle='rgba(0,230,160,.22)';
      ctx.fillRect(mid-bar,y,bar,Math.max(2,rowH-2));
      ctx.fillStyle=this.options.text;ctx.textAlign='right';
      ctx.fillText(numberFormat(row.price,this.options)+' · '+numberFormat(row.amount,this.options),mid-bar-5,y+rowH*.65);
    });
    asks.forEach((row,i)=>{
      const y=18+i*rowH, bar=row.amount/max*(width*.43);
      ctx.fillStyle='rgba(255,85,118,.22)';
      ctx.fillRect(mid,y,bar,Math.max(2,rowH-2));
      ctx.fillStyle=this.options.text;ctx.textAlign='left';
      ctx.fillText(numberFormat(row.price,this.options)+' · '+numberFormat(row.amount,this.options),mid+bar+5,y+rowH*.65);
    });
  };

  Engine.prototype.enableDrawings = function () {
    this._assert();
    if (this._drawingCanvas) return this;
    const canvas = this.target.ownerDocument.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:auto;touch-action:none;z-index:3;cursor:crosshair';
    this.stage.style.position = 'relative';
    this.stage.appendChild(canvas);
    this._drawingCanvas = canvas;
    this._drawingContext = canvas.getContext('2d');
    this._drawingItems = [];
    this._drawingPending = null;
    const resize = () => {
      const w=this.stage.clientWidth,h=this.stage.clientHeight,dpr=Math.max(1,Math.min(3,root.devicePixelRatio||1));
      canvas.width=w*dpr;canvas.height=h*dpr;
      this._drawingContext.setTransform(dpr,0,0,dpr,0,0);
      this._paintDrawings();
    };
    this._drawingResize = resize;
    this._drawingObserver = typeof root.ResizeObserver==='function' ? new root.ResizeObserver(resize) : null;
    if(this._drawingObserver)this._drawingObserver.observe(this.stage);
    resize();
    canvas.addEventListener('pointerdown', e => {
      const rect=canvas.getBoundingClientRect();
      const point={x:e.clientX-rect.left,y:e.clientY-rect.top};
      if(!this._drawingPending)this._drawingPending=point;
      else {this._drawingItems.push({a:this._drawingPending,b:point});this._drawingPending=null;}
      this._paintDrawings();
    });
    canvas.addEventListener('pointermove', e => {
      if(!this._drawingPending)return;
      const rect=canvas.getBoundingClientRect();
      this._drawingPreview={x:e.clientX-rect.left,y:e.clientY-rect.top};
      this._paintDrawings();
    });
    return this;
  };

  Engine.prototype._paintDrawings = function () {
    if(!this._drawingCanvas)return;
    const ctx=this._drawingContext,w=this.stage.clientWidth,h=this.stage.clientHeight;
    ctx.clearRect(0,0,w,h);
    ctx.lineWidth=1.6;
    const line=(a,b,color)=>{ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
    (this._drawingItems||[]).forEach(item=>{
      line(item.a,item.b,'#F5C451');
      ctx.fillStyle='#F5C451';
      [item.a,item.b].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();});
    });
    if(this._drawingPending&&this._drawingPreview)line(this._drawingPending,this._drawingPreview,'rgba(139,124,255,.8)');
  };

  Engine.prototype.clearDrawingObjects = function () {
    this._drawingItems=[];
    this._drawingPending=null;
    this._drawingPreview=null;
    this._paintDrawings();
    return this;
  };

  function createMulti(targets, options) {
    const nodes = typeof targets === 'string'
      ? Array.from(root.document.querySelectorAll(targets))
      : Array.from(targets || []);
    if (!nodes.length) throw new Error('createMulti requires at least one chart container.');
    const instances = nodes.map((node, index) =>
      new Engine(node, Object.assign({}, options || {}, options && options.charts && options.charts[index] || {})));
    return {
      charts: instances,
      get: index => instances[index] || null,
      setData(datasets) {
        instances.forEach((chart, index) => chart.setData(datasets[index] || []));
        return this;
      },
      destroy() { instances.forEach(chart => chart.destroy()); }
    };
  }

  function createCasinoAnalytics(target, rounds, options) {
    const node = typeof target === 'string' ? root.document.querySelector(target) : target;
    if (!node) throw new Error('Casino analytics target not found.');
    const cfg = Object.assign({
      background: '#080D18', text: '#A8B4C8', up: '#00E6A0',
      down: '#FF5576', accent: '#8B7CFF', currency: 'USDT'
    }, options || {});
    const canvas = node.ownerDocument.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:270px';
    node.innerHTML = '';
    node.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let data = [];
    const normalizeRounds = rows => (Array.isArray(rows) ? rows : []).map(row => ({
      wager: Number(row.wager) || 0,
      payout: Number(row.payout) || 0,
      game: String(row.game || 'Game'),
      time: row.time || null
    })).filter(row => row.wager >= 0 && row.payout >= 0);
    data = normalizeRounds(rounds);
    const draw = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = 270;
      const dpr = Math.max(1, Math.min(3, root.devicePixelRatio || 1));
      canvas.width = Math.round(width * dpr);
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = cfg.background;
      ctx.fillRect(0, 0, width, height);
      const wager = data.reduce((sum, row) => sum + row.wager, 0);
      const payout = data.reduce((sum, row) => sum + row.payout, 0);
      const net = wager - payout;
      const edge = wager ? net / wager * 100 : 0;
      const cards = [
        ['ROUNDS', String(data.length)],
        ['WAGER', wager.toFixed(2) + ' ' + cfg.currency],
        ['PAYOUT', payout.toFixed(2) + ' ' + cfg.currency],
        ['NET', net.toFixed(2) + ' ' + cfg.currency],
        ['HOUSE EDGE', edge.toFixed(2) + '%']
      ];
      const gap = 8, cardWidth = (width - gap * 6) / 5;
      cards.forEach((card, index) => {
        const x = gap + index * (cardWidth + gap);
        ctx.fillStyle = '#0D1422';
        ctx.fillRect(x, 10, cardWidth, 56);
        ctx.fillStyle = cfg.text;
        ctx.font = '9px sans-serif';
        ctx.fillText(card[0], x + 7, 27);
        ctx.fillStyle = index === 3 ? (net >= 0 ? cfg.up : cfg.down) : '#F4F7FC';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(card[1].slice(0, 19), x + 7, 49);
      });
      const visible = data.slice(-Math.max(1, Math.floor((width - 48) / 14)));
      const maxValue = Math.max(1, ...visible.map(row => Math.max(row.wager, row.payout)));
      const base = 226, top = 88, slot = (width - 48) / Math.max(1, visible.length);
      visible.forEach((row, index) => {
        const x = 24 + index * slot;
        const barWidth = Math.max(2, slot * .34);
        const wagerHeight = row.wager / maxValue * (base - top);
        const payoutHeight = row.payout / maxValue * (base - top);
        ctx.fillStyle = cfg.accent;
        ctx.fillRect(x, base - wagerHeight, barWidth, wagerHeight);
        ctx.fillStyle = cfg.up;
        ctx.fillRect(x + barWidth + 2, base - payoutHeight, barWidth, payoutHeight);
      });
      ctx.fillStyle = cfg.text;
      ctx.font = '10px sans-serif';
      ctx.fillText('Wager', 18, 252);
      ctx.fillStyle = cfg.accent;
      ctx.fillRect(58, 244, 8, 8);
      ctx.fillStyle = cfg.text;
      ctx.fillText('Payout', 76, 252);
      ctx.fillStyle = cfg.up;
      ctx.fillRect(118, 244, 8, 8);
    };
    draw();
    const observer = typeof root.ResizeObserver === 'function' ? new root.ResizeObserver(draw) : null;
    if (observer) observer.observe(node);
    return {
      update(rows) { data = normalizeRounds(rows); draw(); return this; },
      getSummary() {
        const wager = data.reduce((sum, row) => sum + row.wager, 0);
        const payout = data.reduce((sum, row) => sum + row.payout, 0);
        return { rounds: data.length, wager, payout, net: wager - payout, houseEdge: wager ? (wager - payout) / wager : 0 };
      },
      destroy() { if (observer) observer.disconnect(); node.innerHTML = ''; }
    };
  }


  const pluginRegistry = {
    indicators: Object.create(null),
    strategies: Object.create(null),
    plugins: Object.create(null)
  };

  function registerPlugin(plugin) {
    if (!plugin || typeof plugin.name !== 'string' || !plugin.name.trim()) {
      throw new TypeError('A plugin requires a non-empty name.');
    }
    const name = plugin.name.trim();
    if (pluginRegistry.plugins[name]) throw new Error('Plugin already registered: ' + name);
    const addedIndicators = [], addedStrategies = [];
    Object.keys(plugin.indicators || {}).forEach(key => {
      if (typeof plugin.indicators[key] !== 'function') throw new TypeError('Indicator plugin must be a function: ' + key);
      if (indicators[key] || pluginRegistry.indicators[key]) throw new Error('Indicator already exists: ' + key);
      pluginRegistry.indicators[key] = plugin.indicators[key];
      indicators[key] = plugin.indicators[key];
      addedIndicators.push(key);
    });
    Object.keys(plugin.strategies || {}).forEach(key => {
      if (typeof plugin.strategies[key] !== 'function') throw new TypeError('Strategy plugin must be a function: ' + key);
      if (pluginRegistry.strategies[key]) throw new Error('Strategy already exists: ' + key);
      pluginRegistry.strategies[key] = plugin.strategies[key];
      addedStrategies.push(key);
    });
    pluginRegistry.plugins[name] = { indicators: addedIndicators, strategies: addedStrategies };
    return {
      name,
      unregister() {
        addedIndicators.forEach(key => { delete indicators[key]; delete pluginRegistry.indicators[key]; });
        addedStrategies.forEach(key => { delete pluginRegistry.strategies[key]; });
        delete pluginRegistry.plugins[name];
      }
    };
  }

  function backtest(data, strategy, options) {
    if (!Array.isArray(data) || data.length < 2) throw new Error('Backtest requires at least two candles.');
    const candles = data.map(normalize).sort((a,b)=>a.time-b.time);
    if (typeof strategy === 'string') {
      if (!pluginRegistry.strategies[strategy]) throw new Error('Unknown registered strategy: ' + strategy);
      strategy = pluginRegistry.strategies[strategy];
    }
    if (typeof strategy !== 'function') throw new TypeError('Backtest strategy must be a function or registered strategy name.');
    const cfg = Object.assign({
      initialCapital: 10000,
      feeRate: 0.001,
      slippage: 0,
      positionSize: 1,
      allowShort: false
    }, options || {});
    if (!(cfg.initialCapital > 0) || cfg.feeRate < 0 || cfg.slippage < 0 ||
        !(cfg.positionSize > 0 && cfg.positionSize <= 1)) {
      throw new RangeError('Invalid backtest capital, fee, slippage, or positionSize.');
    }

    let cash = cfg.initialCapital, quantity = 0, entryPrice = 0, entryFee = 0;
    const trades = [], equityCurve = [];
    let peak = cfg.initialCapital, maxDrawdown = 0;
    const history = [];
    const execute = (action, candle, index, size) => {
      const rawPrice = candle.close;
      if (action === 'buy' && quantity === 0) {
        const price = rawPrice * (1 + cfg.slippage);
        const budget = cash * Math.min(cfg.positionSize, size || cfg.positionSize);
        const qty = budget / (price * (1 + cfg.feeRate));
        if (!(qty > 0)) return;
        const notional = qty * price, fee = notional * cfg.feeRate;
        cash -= notional + fee;
        quantity = qty;
        entryPrice = price;
        entryFee = fee;
        trades.push({ side: 'buy', time: candle.time, price, quantity: qty, fee, index });
      } else if (action === 'sell' && quantity > 0) {
        const price = rawPrice * (1 - cfg.slippage);
        const notional = quantity * price, fee = notional * cfg.feeRate;
        cash += notional - fee;
        const pnl = (price - entryPrice) * quantity - fee - entryFee;
        trades.push({ side: 'sell', time: candle.time, price, quantity, fee, pnl, index });
        quantity = 0; entryPrice = 0; entryFee = 0;
      }
    };

    candles.forEach((candle, index) => {
      const snapshot = Object.assign({}, candle);
      const signal = strategy({
        index, candle: snapshot, history: history.slice(),
        position: { quantity, entryPrice },
        cash, equity: cash + quantity * candle.close
      });
      const action = typeof signal === 'string' ? signal : signal && signal.action;
      if (action === 'buy' || action === 'sell') {
        execute(action, candle, index, signal && signal.size);
      }
      history.push(snapshot);
      const equity = cash + quantity * candle.close;
      peak = Math.max(peak, equity);
      const drawdown = peak > 0 ? (peak - equity) / peak : 0;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      equityCurve.push({ time: candle.time, equity, cash, positionValue: quantity * candle.close });
    });

    const last = candles[candles.length - 1];
    if (quantity > 0) execute('sell', last, candles.length - 1);
    const finalEquity = cash;
    const closed = trades.filter(t => t.side === 'sell');
    const wins = closed.filter(t => t.pnl > 0);
    const losses = closed.filter(t => t.pnl < 0);
    const grossProfit = wins.reduce((sum,t)=>sum+t.pnl,0);
    const grossLoss = Math.abs(losses.reduce((sum,t)=>sum+t.pnl,0));
    const returns = [];
    for (let i=1;i<equityCurve.length;i++) {
      const prev=equityCurve[i-1].equity;
      if(prev>0) returns.push((equityCurve[i].equity-prev)/prev);
    }
    const mean = returns.length ? returns.reduce((a,b)=>a+b,0)/returns.length : 0;
    const variance = returns.length ? returns.reduce((a,b)=>a+(b-mean)**2,0)/returns.length : 0;
    const std = Math.sqrt(variance);
    return {
      initialCapital: cfg.initialCapital,
      finalEquity,
      netProfit: finalEquity - cfg.initialCapital,
      returnPct: (finalEquity / cfg.initialCapital - 1) * 100,
      maxDrawdownPct: maxDrawdown * 100,
      totalTrades: closed.length,
      winRatePct: closed.length ? wins.length / closed.length * 100 : 0,
      profitFactor: grossLoss ? grossProfit / grossLoss : (grossProfit ? Infinity : 0),
      sharpeLike: std ? mean / std * Math.sqrt(returns.length) : 0,
      trades,
      equityCurve
    };
  }

  function createMarketAggregator(options) {
    const cfg = Object.assign({ interval: 60, onCandle: null, maxCandles: 50000 }, options || {});
    const candles = [];
    let socket = null;
    let closed = false;
    function ingest(trade) {
      if (closed) throw new Error('Market aggregator is closed.');
      const timeMs = trade.timestamp != null ? Number(trade.timestamp) :
        trade.time != null ? Number(trade.time) * 1000 : Date.now();
      const price = Number(trade.price), volume = Number(trade.volume != null ? trade.volume : trade.quantity);
      if (!Number.isFinite(timeMs) || !Number.isFinite(price) || price <= 0 ||
          !Number.isFinite(volume) || volume < 0) throw new TypeError('Trade requires valid timestamp, positive price, and non-negative volume.');
      const bucket = Math.floor(timeMs / (cfg.interval * 1000)) * cfg.interval;
      let candle = candles[candles.length - 1];
      if (!candle || candle.time !== bucket) {
        candle = { time: bucket, open: price, high: price, low: price, close: price, volume: 0 };
        candles.push(candle);
        if (candles.length > cfg.maxCandles) candles.shift();
      } else {
        candle.high = Math.max(candle.high, price);
        candle.low = Math.min(candle.low, price);
        candle.close = price;
      }
      candle.volume += volume;
      const result = Object.assign({}, candle);
      if (typeof cfg.onCandle === 'function') cfg.onCandle(result, candles.length - 1);
      return result;
    }
    return {
      ingest,
      getCandles: () => candles.map(c=>Object.assign({},c)),
      connect(url, mapTrade) {
        if (typeof root.WebSocket !== 'function') throw new Error('WebSocket is not supported.');
        if (socket) socket.close();
        socket = new root.WebSocket(url);
        socket.onmessage = event => {
          try {
            const raw = JSON.parse(event.data);
            const mapped = typeof mapTrade === 'function' ? mapTrade(raw) : raw;
            if (mapped) (Array.isArray(mapped) ? mapped : [mapped]).forEach(ingest);
          } catch (error) {
            if (typeof cfg.onError === 'function') cfg.onError(error);
          }
        };
        return this;
      },
      disconnect() { if (socket) socket.close(); socket = null; },
      destroy() { closed = true; this.disconnect(); candles.length = 0; }
    };
  }

  function createDepthHeatmap(target, snapshots, options) {
    const node = typeof target === 'string' ? root.document.querySelector(target) : target;
    if (!node) throw new Error('Depth heatmap target not found.');
    const cfg = Object.assign({ height: 260, maxRows: 80, background: '#080D18',
      bidColor: [0,230,160], askColor: [255,85,118] }, options || {});
    const canvas = node.ownerDocument.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:' + cfg.height + 'px';
    node.innerHTML = ''; node.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let data = [];
    const normalizeSnapshot = snap => ({
      time: Number(snap.time),
      bids: (snap.bids || []).map(x=>({price:Number(Array.isArray(x)?x[0]:x.price),size:Number(Array.isArray(x)?x[1]:x.size)})),
      asks: (snap.asks || []).map(x=>({price:Number(Array.isArray(x)?x[0]:x.price),size:Number(Array.isArray(x)?x[1]:x.size)}))
    });
    const draw = () => {
      const w=Math.max(1,canvas.clientWidth),h=cfg.height,dpr=Math.max(1,Math.min(3,root.devicePixelRatio||1));
      canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.fillStyle=cfg.background;ctx.fillRect(0,0,w,h);
      const rows=data.slice(-cfg.maxRows);
      if(!rows.length)return;
      const levels=rows.flatMap(r=>r.bids.concat(r.asks)).filter(x=>Number.isFinite(x.price)&&Number.isFinite(x.size)&&x.size>=0);
      if(!levels.length)return;
      const min=Math.min(...levels.map(x=>x.price)),max=Math.max(...levels.map(x=>x.price));
      const span=Math.max(1e-12,max-min);
      const cellW=w/rows.length,cellH=h/Math.max(1,Math.min(40,Math.max(...rows.map(r=>Math.max(r.bids.length,r.asks.length)))));
      rows.forEach((snap,i)=>{
        const paint=(levels,color)=>{
          levels.forEach(level=>{
            const x=i*cellW;
            const y=(max-level.price)/span*h;
            const intensity=Math.max(0,Math.min(1,Math.log1p(level.size)/Math.log1p(Math.max(1,...levels.map(v=>v.size)))));
            ctx.fillStyle='rgba('+color.join(',')+','+(0.08+intensity*.68)+')';
            ctx.fillRect(x,Math.max(0,y-cellH/2),Math.max(1,cellW+0.5),Math.max(2,cellH));
          });
        };
        paint(snap.bids,cfg.bidColor);paint(snap.asks,cfg.askColor);
      });
      ctx.fillStyle='#A8B4C8';ctx.font='10px sans-serif';
      ctx.fillText(numberFormat(max,{locale:'en-US',precision:2}),5,12);
      ctx.fillText(numberFormat(min,{locale:'en-US',precision:2}),5,h-5);
    };
    const observer=typeof root.ResizeObserver==='function'?new root.ResizeObserver(draw):null;
    if(observer)observer.observe(node);
    const api={
      update(next){data=(next||[]).map(normalizeSnapshot);draw();return this;},
      push(snapshot){data.push(normalizeSnapshot(snapshot));if(data.length>cfg.maxRows)data.shift();draw();return this;},
      destroy(){if(observer)observer.disconnect();node.innerHTML='';}
    };
    api.update(snapshots || []);
    return api;
  }

  function createTerminal(target, options) {
    const node = typeof target === 'string' ? root.document.querySelector(target) : target;
    if (!node) throw new Error('Terminal target not found.');
    const cfg = Object.assign({ symbol:'BTC/USDT', interval:'1m', height:480,
      showDepth:true, background:'#080D18' }, options || {});
    node.innerHTML = `
      <section class="bx-terminal" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,28%);gap:10px;background:${cfg.background};padding:10px;border-radius:14px">
        <div data-bx-terminal-chart style="min-width:0;grid-column:1;grid-row:1"></div>
        <aside data-bx-terminal-side style="min-width:0;grid-column:2;grid-row:1"></aside>
        <div data-bx-terminal-metrics style="grid-column:1/-1"></div>
      </section>`;
    const chartNode=node.querySelector('[data-bx-terminal-chart]');
    const sideNode=node.querySelector('[data-bx-terminal-side]');
    sideNode.innerHTML = '<div style="border:1px solid rgba(150,170,205,.16);border-radius:10px;padding:10px;background:#0D1422;color:#A8B4C8"><div style="display:flex;justify-content:space-between;font:700 11px sans-serif;margin-bottom:10px"><span>ORDER BOOK</span><span data-bx-terminal-spread>Spread —</span></div><canvas data-bx-terminal-book style="display:block;width:100%;height:' + Math.max(260,cfg.height-90) + 'px"></canvas></div>';
    const chart=new Engine(chartNode,{symbol:cfg.symbol,interval:cfg.interval,height:cfg.height});
    const bookCanvas=sideNode.querySelector('[data-bx-terminal-book]');
    const bookCtx=bookCanvas.getContext('2d');
    let book={bids:[],asks:[]};
    const drawBook=()=>{
      const w=Math.max(1,bookCanvas.clientWidth),h=Math.max(1,bookCanvas.clientHeight);
      const dpr=Math.max(1,Math.min(3,root.devicePixelRatio||1));
      bookCanvas.width=Math.round(w*dpr);bookCanvas.height=Math.round(h*dpr);
      bookCtx.setTransform(dpr,0,0,dpr,0,0);bookCtx.clearRect(0,0,w,h);
      const bids=book.bids.slice(0,14),asks=book.asks.slice(0,14);
      const max=Math.max(1e-12,...bids.concat(asks).map(x=>x.amount));
      const rowH=(h-8)/28;
      const render=(rows,offset,color,label)=>{
        bookCtx.font='10px sans-serif';bookCtx.textAlign='left';
        rows.forEach((r,i)=>{
          const y=4+i*rowH,bar=(w-12)*r.amount/max;
          bookCtx.fillStyle=color;bookCtx.globalAlpha=.23;
          bookCtx.fillRect(6,y,bar,rowH-1);bookCtx.globalAlpha=1;
          bookCtx.fillStyle='#DCE5F3';
          bookCtx.fillText(numberFormat(r.price,chart.options)+'  ·  '+numberFormat(r.amount,chart.options),8,y+rowH*.72);
        });
      };
      render(asks,0,'#FF5576','ASK');
      render(bids,0,'#00E6A0','BID');
      const bestBid=bids[0]&&bids[0].price;
      const bestAsk=asks[0]&&asks[0].price;
      const spread=bestBid&&bestAsk?bestAsk-bestBid:null;
      sideNode.querySelector('[data-bx-terminal-spread]').textContent =
        spread==null?'Spread —':'Spread '+numberFormat(spread,chart.options);
    };
    const metrics=createCasinoAnalytics(node.querySelector('[data-bx-terminal-metrics]'),[],{currency:cfg.currency||'USDT'});
    const observer=typeof root.ResizeObserver==='function'?new root.ResizeObserver(drawBook):null;
    if(observer)observer.observe(sideNode);
    return {
      chart,
      setData(data){chart.setData(data);return this;},
      setOrderBook(bids,asks){
        const clean=rows=>(rows||[]).map(row=>({price:Number(Array.isArray(row)?row[0]:row.price),amount:Number(Array.isArray(row)?row[1]:row.amount)}))
          .filter(row=>Number.isFinite(row.price)&&Number.isFinite(row.amount)&&row.price>0&&row.amount>=0)
          .sort((a,b)=>a.price-b.price);
        book={bids:clean(bids).sort((a,b)=>b.price-a.price),asks:clean(asks)};
        drawBook();return this;
      },
      updateTrade(candle){chart.update(candle);return this;},
      setMetrics(rounds){metrics.update(rounds);return this;},
      destroy(){if(observer)observer.disconnect();chart.destroy();metrics.destroy();node.innerHTML='';}
    };
  }


  // V7: deterministic paper execution, risk controls, and event-driven alerts.
  // This module never sends real orders or handles private exchange credentials.
  function createRiskManager(options) {
    const cfg = Object.assign({
      maxPositionSize: Infinity,
      maxExposure: Infinity,
      maxDailyLoss: Infinity,
      maxOrderSize: Infinity,
      allowShort: false
    }, options || {});
    let dayKey = null;
    let dayStartEquity = null;

    function validate(order, account) {
      const side = String(order.side || '').toLowerCase();
      const qty = Number(order.quantity);
      const price = Number(order.price != null ? order.price : account.markPrice);
      const equity = Number(account.equity);
      const exposure = Math.abs(Number(account.positionQty || 0) * Number(account.markPrice || price));
      const reasons = [];
      if (!['buy', 'sell'].includes(side)) reasons.push('side must be buy or sell');
      if (!Number.isFinite(qty) || qty <= 0) reasons.push('quantity must be a positive number');
      if (!Number.isFinite(price) || price <= 0) reasons.push('price must be positive');
      if (qty > cfg.maxOrderSize) reasons.push('order exceeds maxOrderSize');
      if (Math.abs(qty) > cfg.maxPositionSize) reasons.push('order exceeds maxPositionSize');
      if (side === 'sell' && !cfg.allowShort && Number(account.positionQty || 0) <= 0) {
        reasons.push('short selling is disabled and there is no long position to sell');
      }
      const addedExposure = qty * price;
      if (exposure + addedExposure > cfg.maxExposure) reasons.push('order would exceed maxExposure');
      if (Number.isFinite(equity) && dayStartEquity != null &&
          dayStartEquity - equity >= cfg.maxDailyLoss) reasons.push('maxDailyLoss reached');
      return { allowed: reasons.length === 0, reasons };
    }
    function updateEquity(equity, timestamp) {
      const date = new Date(Number(timestamp || Date.now())).toISOString().slice(0, 10);
      if (date !== dayKey) { dayKey = date; dayStartEquity = Number(equity); }
      return { day: dayKey, startEquity: dayStartEquity, equity: Number(equity),
        dailyPnL: Number(equity) - Number(dayStartEquity) };
    }
    return { validate, updateEquity, limits: () => Object.assign({}, cfg) };
  }

  function createPaperTrader(options) {
    const cfg = Object.assign({
      initialBalance: 10000, feeRate: 0.001, slippage: 0,
      currency: 'USDT', symbol: 'BTC/USDT', allowShort: false,
      risk: {}
    }, options || {});
    let cash = Number(cfg.initialBalance);
    if (!Number.isFinite(cash) || cash <= 0) throw new TypeError('initialBalance must be positive.');
    const risk = createRiskManager(Object.assign({}, cfg.risk, { allowShort: !!cfg.allowShort }));
    let markPrice = null, positionQty = 0, avgEntry = 0, realizedPnL = 0;
    let sequence = 0;
    const orders = [], fills = [], listeners = new Set();
    const emit = (type, payload) => {
      const event = Object.assign({ type, timestamp: Date.now(), symbol: cfg.symbol }, payload || {});
      listeners.forEach(fn => { try { fn(event); } catch (_) {} });
      if (typeof cfg.onEvent === 'function') { try { cfg.onEvent(event); } catch (_) {} }
    };
    const equity = () => cash + (positionQty * (markPrice || avgEntry));
    const snapshot = () => ({
      symbol: cfg.symbol, currency: cfg.currency, cash, markPrice,
      positionQty, averageEntry: avgEntry, realizedPnL,
      unrealizedPnL: markPrice == null ? 0 : (markPrice - avgEntry) * positionQty,
      equity: equity(), feesPaid: fills.reduce((sum, f) => sum + f.fee, 0),
      orders: orders.map(x => Object.assign({}, x)), fills: fills.map(x => Object.assign({}, x))
    });
    function setMarkPrice(price, timestamp) {
      price = Number(price);
      if (!Number.isFinite(price) || price <= 0) throw new TypeError('mark price must be positive.');
      markPrice = price;
      risk.updateEquity(equity(), timestamp);
      emit('mark', { price, account: snapshot() });
      return snapshot();
    }
    function placeOrder(input) {
      const order = Object.assign({}, input || {});
      const side = String(order.side || '').toLowerCase();
      const type = String(order.type || 'market').toLowerCase();
      const quantity = Number(order.quantity);
      const limitPrice = order.price == null ? null : Number(order.price);
      if (!['market', 'limit'].includes(type)) throw new TypeError('order type must be market or limit.');
      if (type === 'limit' && (!Number.isFinite(limitPrice) || limitPrice <= 0)) throw new TypeError('limit order requires a positive price.');
      const record = { id: 'paper-' + (++sequence), side, type, quantity, price: limitPrice,
        status: 'open', createdAt: Date.now(), symbol: cfg.symbol };
      if (!['buy', 'sell'].includes(side) || !Number.isFinite(quantity) || quantity <= 0) {
        record.status = 'rejected'; record.reason = 'Invalid side or quantity'; orders.push(record);
        emit('orderRejected', { order: Object.assign({}, record) }); return Object.assign({}, record);
      }
      orders.push(record);
      emit('orderCreated', { order: Object.assign({}, record) });
      if (type === 'market') {
        if (markPrice == null) {
          record.status = 'rejected'; record.reason = 'Set a mark price before placing a market order.';
          emit('orderRejected', { order: Object.assign({}, record) });
        } else execute(record, markPrice);
      } else if (markPrice != null) matchLimits();
      return Object.assign({}, record);
    }
    function execute(order, referencePrice) {
      if (order.status !== 'open') return false;
      if (!Number.isFinite(Number(referencePrice)) || Number(referencePrice) <= 0) return false;
      const fillPrice = Number(referencePrice) * (order.side === 'buy' ? 1 + Number(cfg.slippage) : 1 - Number(cfg.slippage));
      const account = { equity: equity(), positionQty, markPrice: Number(referencePrice) };
      const check = risk.validate({ side: order.side, quantity: order.quantity, price: fillPrice }, account);
      if (!check.allowed) {
        order.status = 'rejected'; order.reason = check.reasons.join('; ');
        emit('orderRejected', { order: Object.assign({}, order), reasons: check.reasons }); return false;
      }
      if (order.side === 'sell' && !cfg.allowShort && order.quantity > positionQty) {
        order.status = 'rejected'; order.reason = 'Insufficient long position';
        emit('orderRejected', { order: Object.assign({}, order) }); return false;
      }
      const signed = order.side === 'buy' ? order.quantity : -order.quantity;
      const fee = Math.abs(order.quantity * fillPrice) * Number(cfg.feeRate);
      const oldQty = positionQty, nextQty = oldQty + signed;
      if (oldQty === 0 || Math.sign(oldQty) === Math.sign(signed)) {
        avgEntry = (Math.abs(oldQty) * avgEntry + Math.abs(signed) * fillPrice) / Math.abs(nextQty);
      } else {
        const closed = Math.min(Math.abs(oldQty), Math.abs(signed));
        realizedPnL += (fillPrice - avgEntry) * closed * Math.sign(oldQty);
        if (nextQty === 0) avgEntry = 0;
        else if (Math.sign(nextQty) !== Math.sign(oldQty)) avgEntry = fillPrice;
      }
      cash -= signed * fillPrice;
      cash -= fee;
      positionQty = nextQty;
      order.status = 'filled'; order.filledAt = Date.now(); order.averageFillPrice = fillPrice;
      order.fee = fee;
      const fill = { orderId: order.id, side: order.side, quantity: order.quantity,
        price: fillPrice, fee, timestamp: Date.now(), realizedPnL };
      fills.push(fill);
      risk.updateEquity(equity(), fill.timestamp);
      emit('fill', { order: Object.assign({}, order), fill: Object.assign({}, fill), account: snapshot() });
      return true;
    }
    function matchLimits() {
      orders.forEach(order => {
        if (order.status !== 'open' || order.type !== 'limit') return;
        if ((order.side === 'buy' && markPrice <= order.price) ||
            (order.side === 'sell' && markPrice >= order.price)) execute(order, order.price);
      });
    }
    function cancelOrder(id) {
      const order = orders.find(x => x.id === id);
      if (!order || order.status !== 'open') return false;
      order.status = 'cancelled'; emit('orderCancelled', { order: Object.assign({}, order) }); return true;
    }
    function closePosition() {
      if (!positionQty || markPrice == null) return null;
      return placeOrder({ side: positionQty > 0 ? 'sell' : 'buy', quantity: Math.abs(positionQty), type: 'market' });
    }
    return {
      setMarkPrice, placeOrder, cancelOrder, matchLimits, closePosition,
      getAccount: snapshot,
      getOrders: () => orders.map(x => Object.assign({}, x)),
      getFills: () => fills.map(x => Object.assign({}, x)),
      on: fn => { if (typeof fn !== 'function') throw new TypeError('listener must be a function'); listeners.add(fn); return () => listeners.delete(fn); },
      destroy: () => listeners.clear()
    };
  }

  function createAlertEngine(options) {
    const cfg = Object.assign({ cooldownMs: 0, onAlert: null }, options || {});
    const rules = new Map();
    function add(rule) {
      if (!rule || !rule.id) throw new TypeError('Alert rule requires an id.');
      const type = rule.type || 'price';
      if (!['price', 'volume', 'changePct'].includes(type)) throw new TypeError('Unsupported alert type.');
      const direction = rule.direction || 'above';
      if (!['above', 'below'].includes(direction)) throw new TypeError('direction must be above or below.');
      rules.set(String(rule.id), Object.assign({ enabled: true, triggered: false, lastTriggered: 0 }, rule));
      return this;
    }
    function evaluate(candle) {
      const close = Number(candle.close), volume = Number(candle.volume || 0);
      const previous = Number(candle.previousClose);
      const fired = [];
      rules.forEach(rule => {
        if (!rule.enabled) return;
        let value, threshold = Number(rule.value);
        if (rule.type === 'volume') value = volume;
        else if (rule.type === 'changePct') value = Number.isFinite(previous) && previous !== 0 ? (close - previous) / previous * 100 : NaN;
        else value = close;
        if (!Number.isFinite(value) || !Number.isFinite(threshold)) return;
        const hit = rule.direction === 'above' ? value >= threshold : value <= threshold;
        const now = Date.now();
        if (hit && (!rule.triggered || now - rule.lastTriggered >= Number(rule.cooldownMs == null ? cfg.cooldownMs : rule.cooldownMs))) {
          rule.triggered = true; rule.lastTriggered = now;
          const event = { id: rule.id, type: rule.type, direction: rule.direction, value, threshold, candle };
          fired.push(event);
          if (typeof rule.callback === 'function') { try { rule.callback(event); } catch (_) {} }
          if (typeof cfg.onAlert === 'function') { try { cfg.onAlert(event); } catch (_) {} }
        } else if (!hit) rule.triggered = false;
      });
      return fired;
    }
    return {
      add, remove: id => rules.delete(String(id)),
      enable(id, enabled) { const rule = rules.get(String(id)); if (rule) rule.enabled = enabled !== false; return !!rule; },
      evaluate, list: () => Array.from(rules.values()).map(x => Object.assign({}, x)),
      clear: () => rules.clear()
    };
  }

  return {
    version: VERSION,
    create: (target, options) => new Engine(target, options),
    createMulti,
    createCasinoAnalytics,
    createTerminal,
    createDepthHeatmap,
    createMarketAggregator,
    createPaperTrader,
    createRiskManager,
    createAlertEngine,
    backtest,
    registerPlugin,
    plugins: () => Object.keys(pluginRegistry.plugins),
    defaults: () => Object.assign({}, DEFAULTS),
    indicators,
    calculate: (type, data, params) => {
      if (!indicators[type]) throw new TypeError('Unknown indicator: ' + type);
      return indicators[type](data.map(normalize), params || {});
    }
  };
});
