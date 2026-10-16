(() => {
gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
addEventListener('beforeunload', () => scrollTo(0, 0));
scrollTo(0, 0);
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ACCENT = '#ff6a14', INK = '#071b33';
// the theme: light or dark on <html data-theme>; INK-coloured strokes and text follow it
const isDark = () => document.documentElement.dataset.theme === 'dark';
const inkNow = () => (isDark() ? '#e8edf3' : INK);
const isLg = () => innerWidth >= 1024;
document.querySelector('[data-year]').textContent = new Date().getFullYear();

/* ---------------- math (Terminal "ao" utils) ---------------- */
const lerp = (a, b, t) => a + (b - a) * t;
const iLerp = (v, a, b) => (v - a) / (b - a);
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const mod = (a, n) => ((a % n) + n) % n;
const randInt = n => Math.floor(Math.random() * n);
const pow2in = t => t * t;

/* ---------------- rounded polyline → SVG path (port of Qc / om) ---------------- */
const r2 = v => Math.round(v * 100) / 100;
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a, s) => ({ x: a.x * s, y: a.y * s });
const norm = a => { const l = Math.hypot(a.x, a.y); return l === 0 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l }; };
const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
function corner(e, prev, next) {
  const r = norm(sub(e, prev)), i = norm(sub(next, e));
  const s = -(r.x * i.x + r.y * i.y);
  const o = Math.acos(clamp(s, -1, 1)) / 2;
  const h = Math.min(dist(prev, e), dist(e, next)) / 2;
  let f = e.radius || 0; if (f > h) f = h;
  const p = f * Math.tan(o);
  return { start: sub(e, mul(r, f)), end: add(e, mul(i, f)), radius: p, sweep: (r.x * i.y - r.y * i.x) < 0 ? 0 : 1, tooLarge: p >= 1e3 };
}
function roundedPath(pts) {
  if (pts.length < 2) return '';
  const first = pts[0], last = pts[pts.length - 1];
  let d;
  if (first.radius && pts.length > 2) {
    const c = corner(first, last, pts[1]);
    d = `M ${r2(c.start.x)},${r2(c.start.y)}` + (c.tooLarge ? ` L ${r2(c.end.x)},${r2(c.end.y)}` : ` A ${r2(c.radius)},${r2(c.radius)} 0 0 ${c.sweep} ${r2(c.end.x)},${r2(c.end.y)}`);
  } else d = `M ${r2(first.x)},${r2(first.y)}`;
  for (let i = 1; i < pts.length; i++) {
    const s = pts[i];
    if (s.radius) {
      const c = corner(s, pts[i - 1], i === pts.length - 1 ? pts[0] : pts[i + 1]);
      d += c.tooLarge ? ` L ${r2(c.start.x)},${r2(c.start.y)}` : ` L ${r2(c.start.x)},${r2(c.start.y)} A ${r2(c.radius)},${r2(c.radius)} 0 0 ${c.sweep} ${r2(c.end.x)},${r2(c.end.y)}`;
    } else d += ` L ${r2(s.x)},${r2(s.y)}`;
  }
  return d;
}

/* ---------------- SVGMask: animated notches via clip-path ---------------- */
const DIR = { top: 0, right: 1, bottom: 2, left: 3 };
const AS = .5;
class NotchMask {
  constructor(el, notches) {
    this.el = el; this.slot = el.querySelector(':scope > .slot'); this.notches = notches;
    this.w = 1; this.h = 1; this.last = '';
    this.visible = true; this.sig = '';
    new ResizeObserver(() => { this.w = el.offsetWidth || 1; this.h = el.offsetHeight || 1; this.sig = ''; this.update(); }).observe(el);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; }, { rootMargin: '200px' }).observe(el);
    this.tick = () => {
      if (!el.isConnected) { gsap.ticker.remove(this.tick); return; }
      if (this.visible) this.update();
    };
    gsap.ticker.add(this.tick);
  }
  edge(dir) { return Math.abs(this.notches.filter(n => n.direction === dir).reduce((m, n) => Math.min(m, n.offset), 0)); }
  pts(v) {
    const { w, h } = this, f = this.edge(v.direction);
    const P = Array.from({ length: 4 }, () => ({ x: 0, y: 0, radius: 40 / v.size * v.radius * .01 }));
    const S = (1 - v.notchWidth) * w * .25;
    const a = v.position - v.size * .5, b = v.position + v.size * .5;
    switch (v.direction) {
      case DIR.top: P[0].x = w * a - S; P[0].y = f; P[1].x = w * a + S; P[1].y = f + v.offset; P[2].x = w * b - S; P[2].y = f + v.offset; P[3].x = w * b + S; P[3].y = f; break;
      case DIR.right: P[0].x = w - f; P[0].y = h * a - S; P[1].x = w - f - v.offset; P[1].y = h * a + S; P[2].x = w - f - v.offset; P[2].y = h * b - S; P[3].x = w - f; P[3].y = h * b + S; break;
      case DIR.bottom: P[0].x = w * b + S; P[0].y = h - f; P[1].x = w * b - S; P[1].y = h - f - v.offset; P[2].x = w * a + S; P[2].y = h - f - v.offset; P[3].x = w * a - S; P[3].y = h - f; break;
      case DIR.left: P[0].x = f; P[0].y = h * b + S; P[1].x = f + v.offset; P[1].y = h * b - S; P[2].x = f + v.offset; P[2].y = h * a + S; P[3].x = f; P[3].y = h * a - S; break;
    }
    return P;
  }
  update() {
    const { w, h } = this;
    const sig = w + ',' + h + ';' + this.notches.map(n => [n.direction, n.offset, n.position, n.size, n.notchWidth, n.radius].map(v => typeof v === 'number' ? v.toFixed(4) : v).join(',')).join(';');
    if (sig === this.sig) return; this.sig = sig;
    const by = d => this.notches.filter(n => n.direction === d).map(n => ({ radius: 8, notchWidth: .9, ...n }));
    const top = by(DIR.top).sort((a, b) => a.position - b.position), right = by(DIR.right).sort((a, b) => a.position - b.position);
    const bottom = by(DIR.bottom).sort((a, b) => b.position - a.position), left = by(DIR.left).sort((a, b) => b.position - a.position);
    const L = Math.max(-AS, this.edge(DIR.left) - AS), T = Math.max(-AS, this.edge(DIR.top) - AS);
    const R = Math.min(w + AS, w - this.edge(DIR.right) + AS), B = Math.min(h + AS, h - this.edge(DIR.bottom) + AS);
    const pts = [{ x: L, y: T }, ...top.flatMap(n => this.pts(n)), { x: R, y: T }, ...right.flatMap(n => this.pts(n)), { x: R, y: B }, ...bottom.flatMap(n => this.pts(n)), { x: L, y: B }, ...left.flatMap(n => this.pts(n)), { x: L, y: T }];
    const d = roundedPath(pts);
    if (d !== this.last) { this.last = d; this.slot.style.clipPath = `path('${d}')`; }
  }
}

/* ---------------- BackgroundCanvas: masked dot/line grid (wave | pulse) + comets ---------------- */
const CELL = 15, DOT = 3, GAP = 48, PAD = 13, PITCH = DOT + GAP + 2 * PAD;
function makeBlob() {
  // soft comet sprite (drawn at 115x65): wide faint halo + a softer core, tail fading behind
  const c = document.createElement('canvas'); c.width = 320; c.height = 220;
  const x = c.getContext('2d');
  const rgb = getComputedStyle(document.documentElement).getPropertyValue('--c-accent-rgb').trim();
  const g = x.createLinearGradient(40, 0, 260, 0);
  g.addColorStop(0, 'rgba(255,154,92,0)'); g.addColorStop(.75, 'rgba(255,154,92,.8)'); g.addColorStop(1, 'rgba(255,140,70,.9)');
  x.fillStyle = g;
  x.filter = 'blur(26px)'; x.globalAlpha = .22; x.beginPath(); x.ellipse(165, 110, 80, 22, 0, 0, Math.PI * 2); x.fill();
  x.filter = 'blur(14px)'; x.globalAlpha = .45; x.beginPath(); x.ellipse(172, 110, 68, 10, 0, 0, Math.PI * 2); x.fill();
  return c;
}
let BLOB = null;
class GridCanvas {
  constructor(wrapper, mode, blobs) {
    this.wrapper = wrapper; this.canvas = wrapper.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
    this.mode = mode; this.blobs = blobs; this.comets = []; this.visible = false;
    this.setColors();
    document.addEventListener('sn:theme', () => { this.setColors(); if (this.W) this.resize(true); this.lastT = undefined; this.render(gsap.ticker.time, true); });
    const mk = () => { const c = document.createElement('canvas'); return { canvas: c, ctx: c.getContext('2d') }; };
    this.dots = mk(); this.lines = mk(); this.field = mk();
    this.field.canvas.width = this.field.canvas.height = CELL;
    this.img = this.field.ctx.createImageData(CELL, CELL);
    for (let i = 0; i < this.img.data.length; i += 4) { this.img.data[i] = this.img.data[i + 1] = this.img.data[i + 2] = 255; }
    new ResizeObserver(() => this.resize()).observe(wrapper);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.schedule(); }).observe(wrapper);
    gsap.ticker.add(t => this.render(t));
    if (!BLOB) BLOB = makeBlob();
  }
  setColors() { if (this.palette) { this.colors = isDark() ? this.palette.dark : this.palette.light; return; } this.colors = isDark() ? { line: 'rgb(24,36,54)', rect: 'rgb(46,62,86)' } : { line: 'rgb(222,222,222)', rect: 'rgb(173,173,173)' }; }
  resize(force) {
    const W = this.wrapper.clientWidth, H = this.wrapper.clientHeight;
    // a layout pass that leaves the size alone must not reallocate and re-bake the canvases
    if (!force && W === this.W && H === this.H) return;
    this.W = W; this.H = H;
    [this.canvas, this.dots.canvas, this.lines.canvas].forEach(c => { c.width = W; c.height = H; });
    this.cols = Math.ceil(W / PITCH); this.rows = Math.ceil(H / PITCH);
    this.ox = mod(W, PITCH); this.oy = mod(H, PITCH);
    this.rects = []; this.segs = [];
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const x = c * PITCH + DOT * .5 + this.ox * .5, y = r * PITCH + DOT * .5 + this.oy * .5;
      this.rects.push({ x: x - (DOT - 1) * .5, y: y - (DOT - 1) * .5, w: DOT, h: DOT });
      if (c !== this.cols - 1) { const a = x + PAD + DOT * .5, b = x + GAP + PAD + DOT * .5; this.segs.push({ x: a, y, w: b - a, h: 1 }); }
      if (r !== this.rows - 1) { const a = y + DOT * .5 + PAD, b = y + DOT * .5 + GAP + PAD; this.segs.push({ x, y: a, w: 1, h: b - a }); }
    }
    // bake the static layers once
    const bake = (layer, list, color) => { layer.ctx.clearRect(0, 0, W, H); layer.ctx.fillStyle = color; for (const r of list) layer.ctx.fillRect(r.x, r.y, r.w, r.h); };
    if (!this.dotsStatic) { const mk = () => { const c = document.createElement('canvas'); return { canvas: c, ctx: c.getContext('2d') }; }; this.dotsStatic = mk(); this.linesStatic = mk(); }
    [this.dotsStatic.canvas, this.linesStatic.canvas].forEach(c => { c.width = W; c.height = H; });
    bake(this.dotsStatic, this.rects, this.colors.rect); bake(this.linesStatic, this.segs, this.colors.line);
    if (RM) this.render(2.2, true);
  }
  colX(c) { return c * PITCH + DOT * .5 + this.ox * .5; }
  rowY(r) { return r * PITCH + DOT * .5 + this.oy * .5; }
  pulse(t) {
    const { data } = this.img, n = CELL, a = CELL, asp = innerWidth / innerHeight;
    for (let i = 0; i < n; i++) for (let u = 0; u < a; u++) {
      const c = Math.abs(u - a * .5) * asp, v = Math.abs(i - n * .5), b = Math.sqrt(c * c + v * v);
      const k = (Math.sin(b / n * Math.PI * 5 - t * 2) + 1) / 2;
      data[(i * a + u) * 4 + 3] = Math.floor(pow2in(k) * 255);
    }
  }
  wave(t, big) {
    const { data } = this.img, n = CELL, s = CELL, asp = innerWidth / innerHeight;
    for (let i = 3; i < data.length; i += 4) data[i] = 0;
    for (let c = 0; c < 3; c++) {
      const cx = Math.cos(t + c * .6) * n * (big ? .35 : .2) + n * .5, cy = Math.sin(t + c * .6) * s * .35 + s * .5;
      const k = n * .55 * (big ? .7 : 1) * lerp(1, .5, iLerp(c, 0, 2));
      for (let m = 0; m < s; m++) for (let I = 0; I < n; I++) {
        const V = Math.abs(I - cx) * asp, F = Math.abs(m - cy), L = clamp(1 - Math.sqrt(V * V + F * F) / k, 0, 1) * 255, K = (m * n + I) * 4 + 3;
        data[K] = Math.min(data[K] + L, 255);
      }
    }
  }
  composite(layer, baked, t, big) {
    if (this.mode === 'pulse') this.pulse(t * 1.8); else this.wave(t, big);
    this.field.ctx.putImageData(this.img, 0, 0);
    const c = layer.ctx;
    c.globalCompositeOperation = 'copy';
    c.drawImage(this.field.canvas, 0, 0, this.W, this.H);      // upscaled soft mask
    c.globalCompositeOperation = 'source-in';
    c.drawImage(baked.canvas, 0, 0);                          // keep grid only where the mask is
    c.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(layer.canvas, 0, 0);
  }
  render(t, force) {
    if ((!this.visible && !force) || !this.W || !this.H || (RM && !force)) return;
    // the wave is slow: 30 redraws a second look the same and halve the cost
    if (!force && this.lastT !== undefined && t - this.lastT < 1 / 31) return;
    this.lastT = t;
    const { ctx, W, H } = this;
    ctx.clearRect(0, 0, W, H);
    this.mode === 'wave' ? this.composite(this.dots, this.dotsStatic, -t, true) : this.composite(this.dots, this.dotsStatic, t);
    this.composite(this.lines, this.linesStatic, t);
    for (const c of this.comets) this.drawComet(c);
  }
  drawComet(e) {
    const { ctx } = this; ctx.save(); ctx.translate(e.x, e.y);
    if (e.orientation === 'vertical') { ctx.rotate(Math.PI * .5); ctx.translate(0, -1); }
    if (e.direction === -1) ctx.rotate(Math.PI);
    ctx.globalAlpha = e.opacity;
    const gs = Math.max(0.45, Math.min(1, innerWidth / 1280));
    ctx.drawImage(BLOB, -160 * .5 * gs, -110 * .5 * gs, 160 * gs, 110 * gs);
    ctx.fillStyle = inkNow(); ctx.fillRect(-115 * .15, e.direction === 1 ? 0 : -1, 115 * .15, 1);
    ctx.restore();
  }
  spawn() {
    const o = Math.random() > .5 ? 'horizontal' : 'vertical', e = Math.random();
    const x = o === 'horizontal' ? lerp(100, this.W - 100, e) : this.colX(randInt(this.cols));
    const y = o === 'horizontal' ? this.rowY(randInt(this.rows)) : lerp(100, this.H - 100, e);
    const dir = e > .5 ? -1 : 1, c = { x, y, orientation: o, direction: dir, opacity: 0 };
    this.comets.push(c);
    const tl = gsap.timeline({ onComplete: () => { this.comets = this.comets.filter(k => k !== c); } });
    tl.fromTo(c, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power1.in' }, 0)
      .to(c, { [o === 'horizontal' ? 'x' : 'y']: `+=${800 * dir}`, duration: 3.5, ease: 'power1.in' }, '<')
      .to(c, { opacity: 0, duration: .5, ease: 'expo.out' }, '>-=0.5');
  }
  schedule() {
    clearTimeout(this.timer);
    if (!this.blobs || !this.visible || RM) return;
    const loop = () => { this.timer = setTimeout(() => { this.spawn(); loop(); }, Math.random() * 1250 + 1250); };
    loop();
  }
}

/* ---------------- PathBackground: rounded circuit lines + travelling glow ---------------- */
const SVGNS = 'http://www.w3.org/2000/svg';
const GLOW_CACHE = {};
function glowSprite(color, alpha) {
  const key = color + alpha; if (GLOW_CACHE[key]) return GLOW_CACHE[key];
  // 155x89 shape box + 60px padding on every side so the blur never gets clipped
  const k = 2, P = 60, c = document.createElement('canvas'); c.width = (155 + P * 2) * k; c.height = (89 + P * 2) * k;
  const x = c.getContext('2d'); x.scale(k, k); x.translate(P, P); x.fillStyle = color;
  const shape = new Path2D(BLUR_D);
  x.filter = `blur(${34 * k}px)`; x.globalAlpha = alpha * .28; x.fill(shape);   // airy halo
  x.filter = `blur(${20 * k}px)`; x.globalAlpha = alpha * .55; x.fill(shape);   // soft glow
  return (GLOW_CACHE[key] = c.toDataURL());
}
const BLUR_D = 'M55.1257 34C40.6277 34 34 36.52 34 44.5C34 54.16 38.9708 55 55.1257 55C78.4606 55 121.817 45.34 120.988 44.5C119.817 43.312 78.4606 34 55.1257 34Z';
let pathUid = 0;
function layoutPoints(layout, w, h, el) {
  const lg = isLg();
  if (typeof layout === 'function') return layout(w, h, el);
  switch (layout) {
    case 'hero':
      return lg ? [
        [{ x: 0, y: h * .2 }, { x: w * .1, y: h * .2, radius: 60 }, { x: w * .1, y: h * .64, radius: 60 }, { x: w * .2, y: h * .64, radius: 40 }, { x: w * .2, y: h }],
        [{ x: w, y: h * .14 }, { x: w * .88, y: h * .14, radius: 60 }, { x: w * .88, y: h * .5, radius: 60 }, { x: w * .79, y: h * .5, radius: 40 }, { x: w * .79, y: h }],
        [{ x: w * .34, y: h }, { x: w * .34, y: h * .86, radius: 40 }, { x: w * .66, y: h * .86, radius: 40 }, { x: w * .66, y: h }]
      ] : [
        [{ x: 0, y: h * .14 }, { x: w * .3, y: h * .14, radius: 30 }, { x: w * .3, y: h * .08, radius: 20 }, { x: w, y: h * .08 }],
        [{ x: w, y: h * .86 }, { x: w * .62, y: h * .86, radius: 40 }, { x: w * .62, y: h }]
      ];
    case 'panel':
      return [
        [{ x: 0, y: h * .2 }, { x: w * .32, y: h * .2, radius: 30 }, { x: w * .32, y: h * .09, radius: 30 }, { x: w, y: h * .09 }],
        [{ x: w, y: h * .8 }, { x: w * .62, y: h * .8, radius: 30 }, { x: w * .62, y: h * .92, radius: 30 }, { x: 0, y: h * .92 }],
        [{ x: w * .1, y: h * .3 }, { x: w * .1, y: h * .7 }],
        [{ x: w * .9, y: h * .3 }, { x: w * .9, y: h * .7 }]
      ];
    case 'next-to-grid': {
      const m = Math.min(innerWidth * .03646, 93.33), col = (w - 2 * m) / 12;
      const r = (m + 5 * col) / w, a = (m + 9 * col) / w;
      return lg ? [
        [{ x: w * r + 1, y: 0 }, { x: w * r, y: h * .25, radius: 50 }, { x: w * .25, y: h * .25, radius: 50 }, { x: w * .1, y: h * .25, radius: 50 }, { x: w * .1, y: h * .45, radius: 75 }, { x: 0, y: h * .37 }],
        [{ x: w * a, y: 0 }, { x: w * a, y: h * .3, radius: 50 }, { x: w * .9, y: h * .3, radius: 50 }, { x: w * .9, y: h * .5, radius: 50 }, { x: w, y: h * .5 }],
        [{ x: w, y: h * .8 }, { x: w * .6, y: h * .8, radius: 50 }, { x: w * .6, y: h }],
        [{ x: 0, y: h * .7 }, { x: w * .2, y: h * .7, radius: 75 }, { x: w * .02, y: h }]
      ] : [
        [{ x: w * .5, y: 0 }, { x: w * .5, y: h * .2, radius: 40 }, { x: 0, y: h * .2 }],
        [{ x: w, y: h * .8 }, { x: w * .7, y: h * .8, radius: 30 }, { x: w * .7, y: h }],
        [{ x: 0, y: h * .75 }, { x: w * .3, y: h * .75, radius: 75 }, { x: 0, y: h * .95 }]
      ];
    }
    case 'footer':
      return lg ? [
        [{ x: w * .4, y: 0 }, { x: w * .4, y: h * .15, radius: 50 }, { x: w * .25, y: h * .15, radius: 50 }, { x: w * .1, y: h * .15, radius: 50 }, { x: w * .1, y: h * .55, radius: 75 }, { x: 0, y: h * .37 }],
        [{ x: w * .6, y: 0 }, { x: w * .6, y: h * .23, radius: 50 }, { x: w * .9, y: h * .23, radius: 50 }, { x: w * .9, y: h * .45, radius: 50 }, { x: w, y: h * .45 }],
        [{ x: w, y: h * .8 }, { x: w * .9, y: h * .65, radius: 20 }, { x: w * .65, y: h * .65, radius: 50 }, { x: w * .65, y: h }],
        [{ x: 0, y: h * .65 }, { x: w * .3, y: h * .65, radius: 120 }, { x: w * .1, y: h }]
      ] : DEFAULT_SMALL(w, h);
    case 'loader':
      return lg ? [
        [{ x: w * .4, y: 0 }, { x: w * .4, y: h * .15, radius: 50 }, { x: w * .25, y: h * .15, radius: 50 }, { x: w * .1, y: h * .15, radius: 50 }, { x: w * .1, y: h * .55, radius: 75 }, { x: 0, y: h * .37 }],
        [{ x: w * .6, y: 0 }, { x: w * .6, y: h * .23, radius: 50 }, { x: w * .9, y: h * .23, radius: 50 }, { x: w * .9, y: h * .45, radius: 50 }, { x: w, y: h * .45 }],
        [{ x: w, y: h * .9 }, { x: w * .95, y: h * .8, radius: 20 }, { x: w * .7, y: h * .8, radius: 50 }, { x: w * .7, y: h }],
        [{ x: 0, y: h * .8 }, { x: w * .25, y: h * .8, radius: 75 }, { x: w * .15, y: h }]
      ] : DEFAULT_SMALL(w, h);
    default:
      return lg ? [
        [{ x: 0, y: h * .4 }, { x: w * .2, y: h * .05, radius: 100 }, { x: w * .2, y: h * .35 }],
        [{ x: w * .95, y: 0 }, { x: w * .95, y: h * .45, radius: 100 }, { x: w * .8, y: h * .1 }],
        [{ x: w, y: h * .9 }, { x: w * .75, y: h * .9 }],
        [{ x: 0, y: h * .8 }, { x: w * .17, y: h * .8, radius: 50 }, { x: w * .17, y: h }]
      ] : DEFAULT_SMALL(w, h);
  }
}
function DEFAULT_SMALL(w, h) {
  return [
    [{ x: 0, y: h * .05 }, { x: w * .2, y: h * .05, radius: 20 }, { x: w * .7, y: h * .3, radius: 60 }, { x: w * .7, y: h * .05, radius: 30 }, { x: w, y: h * .05 }],
    [{ x: w, y: h * .8 }, { x: w * .7, y: h * .8, radius: 30 }, { x: w * .7, y: h }],
    [{ x: 0, y: h * .75 }, { x: w * .3, y: h * .75, radius: 75 }, { x: 0, y: h * .95 }]
  ];
}
class PathBackground {
  constructor(el, { layout = 0, stroke = INK, glow = ACCENT, shapeOpacity = 1, duration = 3, trigger = el, static: isStatic = false, dividers = false, strokeOpacity = .15 } = {}) {
    Object.assign(this, { el, layout, stroke, glow, shapeOpacity, duration, isStatic, dividers, strokeOpacity });
    this.inked = stroke === INK;
    if (this.inked) { this.stroke = inkNow(); document.addEventListener('sn:theme', () => { this.stroke = inkNow(); this.svg.querySelectorAll('path').forEach((p) => p.setAttribute('stroke', this.stroke)); }); }
    this.id = 'pb-' + (++pathUid);
    this.svg = document.createElementNS(SVGNS, 'svg'); this.svg.setAttribute('aria-hidden', 'true');
    el.prepend(this.svg);
    this.items = []; this.y = 0; this.damped = 0; this.visible = false; this.w = 0; this.h = 0;
    new ResizeObserver(() => this.build()).observe(el);
    if (!isStatic) {
      ScrollTrigger.create({ trigger, start: 'top bottom', end: 'bottom top', onToggle: s => { this.visible = s.isActive; } });
      gsap.ticker.add((t, dms) => this.tick(dms / 1000));
    }
  }
  build(force) {
    const w = this.el.offsetWidth || 1, h = this.el.offsetHeight || 1;
    if (!force && w === this.w && h === this.h) return; this.w = w; this.h = h;
    this.items.forEach(it => { it.enter.kill(); it.loop.kill(); });
    this.svg.setAttribute('width', w); this.svg.setAttribute('height', h); this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this.svg.innerHTML = `<defs><filter id="${this.id}" x="0" y="0" width="155" height="89" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="17"/></filter></defs>`;
    const u = this.duration;
    this.items = layoutPoints(this.layout, w, h, this.el).map(pts => {
      const d = roundedPath(pts);
      const blur = document.createElementNS(SVGNS, 'image');
      // the glow is sized for desktop; on small screens it shrinks with the viewport (and fades a little) so it stays a
      // soft light running along the line, never a big blob over the text
      const gs = Math.max(0.42, Math.min(1, innerWidth / 1280)), ga = innerWidth < 768 ? 0.7 : 1;
      blur.setAttribute('href', glowSprite(this.glow === ACCENT ? '#ff9a5c' : this.glow, .6 * this.shapeOpacity * ga)); blur.setAttribute('width', 275 * gs); blur.setAttribute('height', 209 * gs); blur.setAttribute('x', -60 * gs); blur.setAttribute('y', -60 * gs);
      const full = document.createElementNS(SVGNS, 'path');
      full.setAttribute('d', d); full.setAttribute('stroke', this.stroke); full.setAttribute('fill', 'none'); full.setAttribute('stroke-opacity', this.strokeOpacity); full.setAttribute('stroke-width', '1');
      const part = document.createElementNS(SVGNS, 'path');
      part.setAttribute('d', d); part.setAttribute('stroke', this.stroke); part.setAttribute('fill', 'none'); part.setAttribute('stroke-width', '1'); part.setAttribute('stroke-linecap', 'round');
      this.svg.append(blur, full, part);
      if (this.isStatic) { gsap.set(blur, { opacity: 0 }); gsap.set(part, { opacity: 0 }); return { enter: gsap.timeline(), loop: gsap.timeline() }; }
      const enter = gsap.timeline({ paused: true }), loop = gsap.timeline({ paused: true });
      enter.fromTo(full, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'power1.inOut', duration: this.dividers ? u * .2 : u }, 0);
      loop.fromTo(part, { opacity: 0 }, { opacity: 1, ease: 'power1.in', duration: .5 }, 0)
        .fromTo(part, { drawSVG: '0% 1%' }, { drawSVG: '99% 100%', ease: 'power1.inOut', duration: u }, 0)
        .fromTo(blur, { opacity: 0 }, { opacity: 1, ease: 'power1.in', duration: .5 }, 0)
        .to(blur, { motionPath: { path: full, align: full, autoRotate: true, alignOrigin: [.5, .5], start: 0, end: 1 }, ease: 'power1.inOut', duration: u }, 0)
        .to(part, { opacity: 0, ease: 'power1.out', duration: .2 }, '-=0.4')
        .to(blur, { opacity: 0, ease: 'power1.out', duration: .2 }, '<');
      return { enter, loop };
    });
    this.apply();
  }
  tick(dt) {
    if (!this.visible) return;
    this.damped = damp(this.damped, 1, 3, dt);
    this.y = Math.max(0, this.y + dt * this.damped);
    // the glow drifts slowly: redrawing it every other frame looks the same and halves the repaint
    this.skip = !this.skip;
    if (this.skip && !this.items.some((it) => it.enter.progress() < 1)) return;
    this.apply();
  }
  apply() {
    const u = this.duration;
    this.items.forEach((it, t) => {
      if (this.dividers) { // Terminal "card-dividers" timing
        const f = t * .2, e = Math.max(0, this.y - f);
        it.enter.time(clamp(e, 0, it.enter.duration()));
        const g = Math.max(0, this.y - u * 2 - f), L = it.loop.duration() || u;
        it.loop.time(g <= 0 ? 0 : mod(g, L));
        return;
      }
      const el = this.y - t * u - t * u * .5;
      it.enter.time(clamp(el, 0, it.enter.duration()));
      const L = it.loop.duration() || u;
      it.loop.time(el <= 0 ? 0 : mod(el, L));
    });
  }
}

/* ---------------- shared text animations ---------------- */
// BILfmRaY: bold words inside headers sweep  #eee → accent → ink, char by char
function animatedStrong(header, trigger, { start = ACCENT, end = INK } = {}) {
  SplitText.create(header, { type: 'words, chars', tag: 'span', charsClass: '--char' });
  const chars = header.querySelectorAll('strong .--char');
  if (!chars.length) return;
  const inked = end === INK, fin = () => (inked ? inkNow() : end);
  if (inked) document.addEventListener('sn:theme', () => { chars.forEach((c) => { if (c.style.color) c.style.color = 'var(--c-ink)'; }); });
  if (RM) { gsap.set(chars, { color: inked ? 'var(--c-ink)' : end }); return; }
  gsap.timeline({ scrollTrigger: { trigger, start: 'top 40%' } })
    .to(chars, { color: start, duration: .4, stagger: .05, ease: 'power2.inOut' }, 0)
    .to(chars, { color: fin, duration: .5, stagger: .05, ease: 'power2.inOut', onComplete: () => { if (inked) chars.forEach((c) => { c.style.color = 'var(--c-ink)'; }); } }, .25);
}
// ButtonTilt: chars typed in, every other char flashes as a solid block
function buttonTilt(el, trigger = el) {
  const temp = el.dataset.temp || ACCENT, fin = el.dataset.final || 'var(--c-ink)';
  el.style.setProperty('--lineColor', fin);
  const s = SplitText.create(el, { type: 'chars, lines', charsClass: '--char', linesClass: '--line' });
  if (RM) { gsap.set(s.chars, { autoAlpha: 1 }); return; }
  const t = gsap.timeline({ scrollTrigger: { trigger, start: 'top 85%', end: 'bottom 20%', toggleActions: 'play none none reverse' } });
  s.chars.forEach((n, a) => {
    t.to(n, { autoAlpha: 1, duration: 0 }, a * .05);
    if (a % 2 === 0) { const at = a * .05 + (Math.random() * .5 + .1); t.set(n, { background: temp, color: temp }, at).set(n, { background: 'transparent', color: fin }, at + .02); }
  });
  let enter = null, leave = null;
  el.addEventListener('mouseenter', () => {
    if (t.isActive()) return; leave && leave.revert(); enter = gsap.timeline();
    s.chars.forEach((o, r) => { if (r % 2 === 0) { enter.set(o, { background: temp, color: temp }, r * .025); enter.set(o, { background: 'transparent', color: fin }, r * .025 + .2); } });
  });
  el.addEventListener('mouseleave', () => {
    if (t.isActive()) return; enter && enter.revert(); leave = gsap.timeline();
    s.chars.map((c, i) => ({ c, i })).filter(({ i }) => i % 2 === 1).reverse().forEach(({ c }, n) => {
      leave.set(c, { background: temp, color: temp }, n * .025); leave.set(c, { background: 'transparent', color: fin }, n * .025 + .2);
    });
  });
}
// TextRevealChar: chars turn on (gray → accent → ink) as scroll progress passes them; keeps <strong> etc.
function revealChars(p, { trigger = p, start = 'top 85%', end = 'top 45%', auto = false, manual = false } = {}) {
  const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = p.textContent.replace(/\s+/g, ' ').trim();
  const spans = [];
  const walk = node => [...node.childNodes].forEach(n => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      [...n.textContent.replace(/\s+/g, ' ')].forEach(ch => { const c = document.createElement('span'); c.className = 'text-reveal-char'; c.setAttribute('aria-hidden', 'true'); c.textContent = ch; frag.append(c); spans.push(c); });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(p); p.prepend(sr);
  let shown = 0;
  const update = progress => {
    const n = Math.min(spans.length, Math.ceil(progress * spans.length - 1e-6));
    if (n > shown) for (let i = shown; i < n; i++) spans[i].classList.add('show');
    else for (let i = n; i < shown; i++) spans[i].classList.remove('show');
    shown = n;
  };
  const st = { v: 0 };
  const play = (dur = 2.2, delay = 0) => { gsap.killTweensOf(st); st.v = 0; update(0); gsap.to(st, { v: 1, duration: dur, ease: 'power2.inOut', delay, onUpdate: () => update(st.v) }); };
  const api = { play, update };
  if (RM) { update(1); return api; }
  if (manual) return api;
  if (auto) { play(2.4, .3); return api; }
  ScrollTrigger.create({ trigger, start, end, scrub: true, onUpdate: ({ progress }) => update(progress) });
  return api;
}

/* ---------------- cross grid (lines, crosses that flicker) ---------------- */
function crossFlicker() {
  const w = document.createElement('div'); w.className = 'cross-flicker';
  w.innerHTML = '<div class="vertical"></div><div class="horizontal"></div>';
  if (!RM) {
    const [v, h] = w.children, e = gsap.timeline({ repeat: -1, delay: Math.random() * 2 });
    e.to(v, { scaleY: 0, duration: 2.5, ease: 'expo.inOut' }, 0).to(v, { scaleY: 1, duration: 2.5, ease: 'expo.inOut' }, 2.5)
     .to(h, { scaleX: 0, duration: 2.5, ease: 'expo.inOut' }, 0).to(h, { scaleX: 1, duration: 2.5, ease: 'expo.inOut' }, 2.5);
  }
  return w;
}
function buildCrossGrid(grid) {
  const fillers = grid.querySelectorAll('.cell.filler'); fillers.forEach(f => f.remove());
  const cols = isLg() ? +grid.dataset.colsLg : +grid.dataset.cols;
  let cells = grid.querySelectorAll('.cell');
  if (grid.hasAttribute('data-fill')) {
    const total = Math.ceil(cells.length / cols) * cols;
    for (let i = cells.length; i < total; i++) { const f = document.createElement('div'); f.className = 'cell filler'; grid.append(f); }
    cells = grid.querySelectorAll('.cell');
  }
  cells.forEach(c => c.style.flexBasis = (100 / cols) + '%');
  const rows = Math.ceil(cells.length / cols);
  grid.dataset.c = cols; grid.dataset.r = rows;
  grid.querySelector(':scope > .lines')?.remove();
  const lines = document.createElement('div'); lines.className = 'lines';
  for (let r = 0; r <= rows; r++) { const h = document.createElement('div'); h.className = 'h'; h.style.top = `calc(${r / rows * 100}% - ${r === rows ? 1 : 0}px)`; lines.append(h); }
  for (let c = 0; c <= cols; c++) { const v = document.createElement('div'); v.className = 'v'; v.style.left = `calc(${c / cols * 100}% - ${c === cols ? 1 : 0}px)`; lines.append(v); }
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    const x = crossFlicker(); x.style.left = `calc(${c / cols * 100}% - ${c === cols ? 1 : 0}px)`; x.style.top = `calc(${r / rows * 100}% - ${r === rows ? 1 : 0}px)`; lines.append(x);
  }
  grid.prepend(lines);
}

/* ---------------- odometer (PaddedCounter) ---------------- */
function odometer(el) {
  const start = +el.dataset.start, end = +el.dataset.end, len = String(end).length;
  const pad = v => String(Math.floor(v)).padStart(len, '0').split('').map(Number);
  const sd = pad(start), ed = pad(end);
  const odo = document.createElement('div'); odo.className = 'odometer'; odo.setAttribute('aria-hidden', 'true');
  const stacks = [];
  ed.forEach((_, i) => {
    if (i > 0 && (len - i) % 3 === 0) { const s = document.createElement('span'); s.className = 'sep'; s.textContent = ','; odo.append(s); }
    const col = document.createElement('div'); col.className = 'digit-column';
    const st = document.createElement('div'); st.className = 'digit-stack';
    for (let n = 0; n <= 10; n++) { const d = document.createElement('div'); d.className = 'digit'; d.innerHTML = `<span>${n % 10}</span>`; st.append(d); }
    col.append(st); odo.append(col); stacks.push(st);
  });
  el.append(odo);
  const plus = document.createElement('span'); plus.className = 'plus'; plus.textContent = '+'; plus.setAttribute('aria-hidden', 'true'); el.append(plus);
  const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = end.toLocaleString('en-US') + '+'; el.append(sr);
  const state = { progress: 0 };
  const draw = () => stacks.forEach((st, a) => {
    const d = sd[a], n = ed[a], y = (n - d + 10) % 10;
    st.style.transform = `translate3d(0, ${-((d + y * state.progress) % 10)}em, 0)`;
  });
  draw();
  if (RM) { state.progress = 1; draw(); return; }
  gsap.to(state, { progress: 1, duration: 2.4, ease: 'expo.out', onUpdate: draw, scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' } });
}

/* ---------------- BorderHover services ---------------- */
const ICONS = {
  lms: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M7 13l3-4 3 2.5L17 7"/><path d="M9 21h6M12 17v4"/>',
  warehouse: '<path d="M3 10.5 12 4l9 6.5V20H3z"/><path d="M7 20v-7h10v7M7 16.5h10"/>',
  box: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  truck: '<path d="M2 6h12v11H2zM14 10h4l3 3.5V17h-7"/><circle cx="6" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9"/><path d="M4 9c2.7 2.4 5.3 2.4 8 0 2.7 2.4 5.3 2.4 8 0M10 20v-6h4v6"/>',
  bottle: '<path d="M10 2h4v4c2.3 1.4 3 3.2 3 6v9H7v-9c0-2.8.7-4.6 3-6z"/><path d="M7 14h10"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'
};
const arrow = '<svg viewBox="0 0 14 14" fill="none"><path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const icon = k => `<svg class="service-icon" viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg>`;
const top = (n, k) => `<div class="service-top">${icon(k)}<span class="service-arrow">${arrow}${arrow}</span></div>`;
const LMS_ROWS = [
  ['SN-30218', 'Toronto → Vancouver', 'In transit', .64, true],
  ['SN-30219', 'Mississauga → Montréal', 'Out for delivery', .9, true],
  ['SN-30220', 'Toronto → Calgary', 'Picking', .22, false]
];
const SERVICES = [
  { wide: true, key: 'lms', t: 'Logistics Management System', d: 'One layer of visibility and control across every order, warehouse and mile.', href: 'https://shipnoble.com/logistics-management-system/' },
  { key: 'warehouse', t: 'Warehousing', d: 'Secure, scalable storage with real-time inventory.', href: 'https://shipnoble.com/warehousing/' },
  { key: 'box', t: 'E-Commerce Fulfillment', d: 'Pick, pack and ship that plugs into your store.', href: 'https://shipnoble.com/e-commerce-fulfillment/' },
  { key: 'truck', t: 'B2B Transportation', d: 'Reliable freight, planned around your windows.', href: 'https://shipnoble.com/b2b-transportation/' },
  { key: 'store', t: 'Retail Distribution', d: 'Store-ready replenishment that keeps shelves full.', href: 'https://shipnoble.com/retail-distribution/' },
  { key: 'bottle', t: 'Wine & Spirits', d: 'Compliant handling from cellar to door.', href: 'https://shipnoble.com/wine-and-spirits-delivery/' },
  { wide: true, ink: true, key: 'chat', t: 'Not sure where to start?', d: 'Tell us how you ship today. We will map the gaps and the value.', href: 'https://shipnoble.com/contact/', cta: 'Talk to an expert' }
];
const card = (s, i) => {
  const n = String(i + 1).padStart(2, '0');
  let inner;
  if (s.key === 'lms') {
    inner = `<a class="service service--wide" href="${s.href}">
      <div class="service-copy">${top(n, s.key)}<div><h3 class="title-h2">${s.t}</h3><p class="body-4">${s.d}</p></div></div>
      <div class="lms" aria-hidden="true">
        <div class="lms-head"><span><i></i>Live shipments</span><span>LMS</span></div>
        ${LMS_ROWS.map(([id, route, st, p, live]) => `<div class="lms-row"><b>${id}</b><span class="lms-route">${route}</span><span class="lms-pill${live ? ' is-live' : ''}">${st}</span><div class="lms-bar"><span data-p="${p}"></span></div></div>`).join('')}
      </div></a>`;
  } else if (s.ink) {
    inner = `<a class="service" href="${s.href}">${top(n, s.key)}<div><h3 class="title-h2 service-cta-title">${s.t}</h3><p class="body-4">${s.d}</p></div></a>`;
  } else {
    inner = `<a class="service" href="${s.href}">${top(n, s.key)}<div><h3 class="title-h2">${s.t}</h3><p class="body-4">${s.d}</p></div></a>`;
  }
  return `<div class="border__wrapper${s.wide ? ' is-wide' : ''}${s.ink ? ' is-ink' : ''}"><div class="overflow__wrapper">
    <div class="border-bg-v"></div><div class="border-bg-h"></div>
    <div class="border-holder"></div><div class="background-holder"></div>
    <div class="slot__wrapper">${inner}</div>
    <div class="background-gradient"></div>
  </div></div>`;
};
const servicesEl = document.querySelector('.services');
if (servicesEl) {
servicesEl.innerHTML = SERVICES.map(card).join('');
// icons draw themselves in, and redraw on hover
servicesEl.querySelectorAll('.service').forEach(a => {
  const parts = a.querySelectorAll('.service-icon > *');
  if (RM) return;
  gsap.fromTo(parts, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.4, ease: 'power2.inOut', stagger: .12, scrollTrigger: { trigger: a, start: 'top 85%' } });
  a.addEventListener('mouseenter', () => gsap.fromTo(parts, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: .8, ease: 'expo.out', stagger: .06, overwrite: true }));
});
document.querySelectorAll('.is-ink .slot__wrapper').forEach(sw => {
  const el = document.createElement('div'); el.className = 'path-background'; el.setAttribute('aria-hidden', 'true'); sw.prepend(el);
  requestAnimationFrame(() => new PathBackground(el, { layout: (w, h) => [
    [{ x: w * .55, y: 0 }, { x: w * .55, y: h * .32, radius: 40 }, { x: w * .82, y: h * .32, radius: 40 }, { x: w * .82, y: h * .62, radius: 40 }, { x: w, y: h * .62 }],
    [{ x: w, y: h * .86 }, { x: w * .9, y: h * .86, radius: 30 }, { x: w * .9, y: h }]
  ], stroke: '#ffffff', strokeOpacity: .16, duration: 2.6 }));
});
// LMS progress bars fill in
const bars = servicesEl.querySelectorAll('.lms-bar span');
if (RM) bars.forEach(b => b.style.setProperty('--p', b.dataset.p));
else gsap.fromTo(bars, { '--p': 0 }, { '--p': i => +bars[i].dataset.p, duration: 2, ease: 'expo.out', stagger: .15, scrollTrigger: { trigger: '.lms', start: 'top 80%' } });
}
const borderCards = [...document.querySelectorAll('.border__wrapper')];
addEventListener('pointermove', e => {
  for (const c of borderCards) {
    const r = c.getBoundingClientRect();
    if (r.bottom < -400 || r.top > innerHeight + 400) continue;
    const x = Math.round(e.clientX - r.left), y = Math.round(e.clientY - r.top);
    const tr = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0)`;
    c.querySelector('.border-holder').style.transform = tr; c.querySelector('.background-gradient').style.transform = tr;
  }
}, { passive: true });

/* ---------------- navbar: expanding menu bar ---------------- */
const nav = document.querySelector('[data-nav]');
const navShell = nav.querySelector('.nav-shell'), navBg = nav.querySelector('.nav-bg'), navRow = nav.querySelector('.nav-row');
const navPanel = nav.querySelector('.nav-panel'), navBtn = nav.querySelector('.nav-menu-btn');
const ROW_H = () => navRow.offsetHeight, ROW_W = () => Math.min(736, navShell.offsetWidth);
const closedClip = () => { const x = (navShell.offsetWidth - ROW_W()) / 2; return `inset(0px ${x}px ${navShell.offsetHeight - ROW_H()}px ${x}px round 8px)`; };
const openClip = () => 'inset(0px 0px 0px 0px round 12px)';
let menuOpen = false, menuTl = null;
const setClosed = () => { gsap.set(navBg, { clipPath: closedClip() }); gsap.set(navRow, { width: ROW_W() }); };
setClosed();
new ResizeObserver(() => { if (menuTl?.isActive()) { menuTl.eventCallback('onComplete') || 0; return; } if (!menuOpen) setClosed(); else { gsap.set(navRow, { width: navShell.offsetWidth }); gsap.set(navBg, { clipPath: openClip() }); } }).observe(navShell);
const panelItems = () => navPanel.querySelectorAll('.np-card, .np-col');
function openMenu() {
  if (menuOpen) return; menuOpen = true;
  document.body.classList.add('menu-open'); navBtn.setAttribute('aria-expanded', 'true'); nav.classList.remove('is-hidden');
  lenis?.stop();
  menuTl?.kill();
  menuTl = gsap.timeline({ defaults: { ease: 'expo.inOut' } })
    .fromTo(navBg, { clipPath: closedClip() }, { clipPath: openClip(), duration: RM ? 0 : .85 }, 0)
    .to(navRow, { width: navShell.offsetWidth, duration: RM ? 0 : .85 }, 0)
    .fromTo(panelItems(), { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: RM ? 0 : .9, ease: 'expo.out', stagger: .07 }, RM ? 0 : .38);
}
function closeMenu() {
  if (!menuOpen) return; menuOpen = false;
  navBtn.setAttribute('aria-expanded', 'false');
  menuTl?.kill();
  menuTl = gsap.timeline({ defaults: { ease: 'expo.inOut' }, onComplete: () => { document.body.classList.remove('menu-open'); requestAnimationFrame(setClosed); } })
    .to(panelItems(), { y: -16, opacity: 0, duration: RM ? 0 : .3, ease: 'power2.in', stagger: .03 }, 0)
    .to(navBg, { clipPath: closedClip(), duration: RM ? 0 : .75 }, RM ? 0 : .2)
    .to(navRow, { width: ROW_W(), duration: RM ? 0 : .75 }, '<');
  // let the backdrop fade while the bar collapses
  setTimeout(() => document.body.classList.remove('menu-open'), RM ? 0 : 650);
  lenis?.start();
}
navBtn.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
document.querySelector('[data-nav-backdrop]').addEventListener('click', closeMenu);
addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
navPanel.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

/* ---------------- theme switch: light and night, with a circular reveal from the button ---------------- */
const THEME_KEY = 'sn-theme';
function setTheme(t, store = true) {
  document.documentElement.dataset.theme = t;
  if (store) { try { localStorage.setItem(THEME_KEY, t); } catch (e) {} }
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => { b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); b.setAttribute('aria-pressed', String(t === 'dark')); });
  document.dispatchEvent(new CustomEvent('sn:theme', { detail: t }));
}
setTheme(isDark() ? 'dark' : 'light', false);
document.querySelectorAll('[data-theme-toggle]').forEach((btn) => btn.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  if (!document.startViewTransition || RM) { setTheme(next); return; }
  const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => setTheme(next));
  vt.ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
    { duration: 800, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
  )).catch(() => {});
}));
// with no saved choice, follow the system as it changes
try {
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', (e) => { let saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (er) {} if (!saved) setTheme(e.matches ? 'dark' : 'light', false); });
} catch (e) {}

/* ---------------- page transitions: the menu folds away, the loader's two halves close over the page ---------------- */
// the next page opens straight from that closed state (runLoader reads the flag and skips the long logo intro)
const PT_KEY = 'sn-pt';
let leaving = false;
function wipeTo(url) {
  if (leaving) return; leaving = true;
  const logo = `<div class="animated-logo"><img class="mark" src="assets/logos/mark.png" alt=""><span class="text">SHIPNOBLE</span></div>`;
  const w = document.createElement('div');
  w.className = 'page-wipe'; w.setAttribute('aria-hidden', 'true');
  w.innerHTML = `<div class="pw-dim"></div><div class="pw-half pw-top"><div class="pw-full"><div class="pw-logo">${logo}</div></div></div><div class="pw-half pw-bot"><div class="pw-full"><div class="pw-logo">${logo}</div></div></div>`;
  document.body.append(w);
  const go = () => { try { sessionStorage.setItem(PT_KEY, '1'); } catch (e) {} location.href = url; };
  const [top, bot] = w.querySelectorAll('.pw-half'), [ft, fb] = w.querySelectorAll('.pw-full'), logos = w.querySelectorAll('.animated-logo');
  // compositor animations: the halves close smoothly even while the browser starts loading the next page
  const A = (el, kf, duration, delay = 0, easing = EIO) => el.animate(kf, { duration, delay, easing, fill: 'both' });
  A(w.querySelector('.pw-dim'), [{ opacity: 0 }, { opacity: 1 }], 600, 0, EO);
  A(top, [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], 900);
  A(bot, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], 900);
  A(ft, [{ transform: 'translateY(50%)' }, { transform: 'translateY(0)' }], 900);
  A(fb, [{ transform: 'translateY(-50%)' }, { transform: 'translateY(0)' }], 900);
  // the logo arrives with the halves and bows out before the next page takes over
  logos.forEach(l => A(l, [{ opacity: 0, transform: 'scale(.92)', offset: 0 }, { opacity: 0, transform: 'scale(.92)', offset: .32 }, { opacity: 1, transform: 'scale(1)', offset: .66 }, { opacity: 1, transform: 'scale(1)', offset: .8 }, { opacity: 0, transform: 'scale(1.02)', offset: 1 }], 1240, 0, 'linear'));
  setTimeout(go, 1260);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a || RM || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (a.target && a.target !== '_self' || a.hasAttribute('download')) return;
  const raw = a.getAttribute('href');
  if (!raw || raw.startsWith('#') || /^(mailto|tel|javascript):/i.test(raw)) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || !/(\.html|\/)$/.test(url.pathname)) return;
  if (url.pathname === location.pathname && url.hash) return;
  e.preventDefault();
  // a link in the open menu: let the bar fold shut first, then close the page over it
  const wasOpen = menuOpen;
  if (wasOpen) closeMenu();
  setTimeout(() => wipeTo(url.href), wasOpen ? 480 : 0);
}, true);
// coming back through the browser's history cache: drop the closed halves
addEventListener('pageshow', e => { if (e.persisted) { document.querySelector('.page-wipe')?.remove(); leaving = false; } });
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('is-scrolled', y > 30);
  const dy = y - lastY;
  if (Math.abs(dy) < 6) return;
  if (!menuOpen) nav.classList.toggle('is-hidden', dy > 0 && y > 320);
  lastY = y;
}, { passive: true });
document.querySelector('[data-top]').addEventListener('click', () => lenis ? lenis.scrollTo(0, { duration: 2 }) : scrollTo({ top: 0, behavior: 'smooth' }));

// rolling link text
document.querySelectorAll('[data-roll]').forEach(r => { const t = r.textContent; r.setAttribute('aria-label', t); r.innerHTML = `<span aria-hidden="true">${t}</span><span aria-hidden="true">${t}</span>`; });
// footer wordmark always fits its container
const wordmark = document.querySelector('.f-wordmark');
const fitWordmark = () => {
  const base = wordmark.querySelector('span'); wordmark.style.fontSize = '100px';
  const w = base.getBoundingClientRect().width, avail = wordmark.clientWidth;
  if (w) wordmark.style.fontSize = Math.min(100 * avail / w, 260) + 'px';
};
(document.fonts ? document.fonts.ready : Promise.resolve()).then(fitWordmark);
addEventListener('resize', fitWordmark);

// logos: optical sizing — equal visual area regardless of aspect ratio
const sizeLogos = () => document.querySelectorAll('.logo-grid .cell img').forEach(img => {
  if (!img.naturalWidth) return;
  const ar = img.naturalWidth / img.naturalHeight, area = (isLg() ? 9800 : 5200);
  const h = Math.min(Math.sqrt(area / ar), isLg() ? 86 : 60);
  img.style.height = h + 'px';
});
document.querySelectorAll('.logo-grid .cell img').forEach(img => { img.loading = 'eager'; img.complete ? sizeLogos() : img.addEventListener('load', sizeLogos); });
addEventListener('resize', sizeLogos);

/* ---------------- keep scroll positions true as late content loads ---------------- */
ScrollTrigger.config({ ignoreMobileResize: true });
let refreshTimer = 0;
// a refresh re-measures every pin on the page (hundreds of ms): only when the page really changed height,
// and only once the scroll has come to rest, so it never lands mid-gesture
let refreshedH = 0;
const softRefresh = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    const h = document.documentElement.scrollHeight;
    if (h === refreshedH) return;
    if (lenis && Math.abs(lenis.velocity || 0) > 0.05) { softRefresh(); return; }
    refreshedH = h; ScrollTrigger.sort(); ScrollTrigger.refresh();
  }, 220);
};
ScrollTrigger.addEventListener('refresh', () => { refreshedH = document.documentElement.scrollHeight; });
document.querySelectorAll('img').forEach(img => { img.decoding = 'async'; if (!img.complete) img.addEventListener('load', softRefresh, { once: true }); });
addEventListener('load', softRefresh);
document.fonts && document.fonts.ready.then(softRefresh);

/* ---------------- Lenis ---------------- */
let lenis = null;
if (!RM) {
  lenis = new Lenis({ autoRaf: false, lerp: .085, wheelMultiplier: 1, touchMultiplier: 1.2, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------- loader ----------------
   Every moving part (the mark, the letters, the background, the two halves) runs as a Web Animation on transform
   and opacity, so the compositor plays it at full frame rate even while the page below is still setting up. */
const EO = 'cubic-bezier(0.16, 1, 0.3, 1)', EIO = 'cubic-bezier(0.87, 0, 0.13, 1)';
function animatedLogo(host) {
  host.innerHTML = `<div class="animated-logo"><span class="mk"><img class="mark" src="assets/logos/mark.png" alt=""></span><span class="text">${[...'SHIPNOBLE'].map(c => `<span class="char-wrapper"><span class="char">${c}</span></span>`).join('')}</span></div>`;
  const logo = host.firstElementChild, mk = logo.querySelector('.mk'), mark = logo.querySelector('.mark'), text = logo.querySelector('.text');
  const wr = [...logo.querySelectorAll('.char-wrapper')], ch = [...logo.querySelectorAll('.char')];
  // plays the intro starting at `at` ms; returns when it ends (ms)
  return (at) => {
    const shift = (text.offsetWidth + parseFloat(getComputedStyle(logo).gap)) / 2;
    const A = (el, kf, duration, delay, easing) => el.animate(kf, { duration, delay, easing, fill: 'both' });
    A(mark, [{ transform: 'scale(0) rotate(-20deg)' }, { transform: 'scale(1) rotate(0deg)' }], 1000, at, EO);
    A(mk, [{ transform: `translateX(${shift}px)` }, { transform: 'translateX(0)' }], 1200, at + 550, EIO);
    A(text, [{ transform: `translateX(${shift * .35}px)` }, { transform: 'translateX(0)' }], 1200, at + 550, EIO);
    const n = wr.length;
    wr.forEach((w, i) => A(w, [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], 1000, at + 950 + (n - 1 - i) * 40, EO));
    ch.forEach((c, i) => A(c, [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], 1000, at + 950 + (n - 1 - i) * 40, EO));
    return at + 950 + (n - 1) * 40 + 1000;
  };
}
function runLoader(done) {
  const root = document.querySelector('.app-loader');
  if (RM || !root.animate) { root.remove(); document.body.classList.remove('is-loading'); done(); return; }
  scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true, force: true }); lenis?.stop();
  const lg = isLg(), off = lg ? 40 : 20;
  const nTop = [{ direction: DIR.bottom, notchWidth: .95, offset: 0, position: .5, radius: 40, size: .5 }];
  const nBot = [{ direction: DIR.top, notchWidth: .95, offset: 0, position: .5, radius: 40, size: .5 }];
  const masks = [new NotchMask(root.querySelector('[data-mask="loader-top"]'), nTop), new NotchMask(root.querySelector('[data-mask="loader-bottom"]'), nBot)];
  const plays = [...root.querySelectorAll('[data-logo]')].map(animatedLogo);
  root.querySelectorAll('[data-loader-lines]').forEach(w => {
    const pb = document.createElement('div'); pb.className = 'path-background'; pb.style.cssText = 'position:absolute;inset:0';
    w.append(pb); new PathBackground(pb, { layout: 'loader', static: true });
  });
  const top = root.querySelector('.top'), bottom = root.querySelector('.bottom');
  const [fwTop, fwBot] = root.querySelectorAll('.full-wrapper');
  const bgs = [...root.querySelectorAll('.background-wrapper')];
  let quick = false;
  try { quick = sessionStorage.getItem('sn-pt') === '1'; sessionStorage.removeItem('sn-pt'); } catch (e) {}
  const A = (el, kf, duration, delay, easing) => el.animate(kf, { duration, delay, easing, fill: 'both' });
  let splitAt;
  if (quick) {
    // arriving from another page: the halves are already closed, so they open straight away
    root.querySelectorAll('[data-logo]').forEach(l => { l.style.opacity = 0; });
    splitAt = 80;
  } else {
    const ends = plays.map(p => p(200));
    bgs.forEach(b => A(b, [{ transform: 'scale(2) rotate(20deg)', opacity: 0 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }], 2000, 200, EO));
    splitAt = Math.max(...ends, 2200);
  }
  // the notch: the seam opens into a soft notch as the halves part. Its frames are worked out once and handed to
  // the browser as one animation, instead of rebuilding the clip path every frame.
  // phase one (0.6 s): the seam dips into a notch and widens; phase two (0.6 s): it flips out into a tab
  const xo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));            // expo.out
  const notchFrames = (m, notch) => {
    m.w = m.el.offsetWidth || innerWidth; m.h = m.el.offsetHeight || innerHeight / 2;
    const out = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      if (t <= .5) { const e = xo(t / .5); notch.offset = off * e; notch.size = .5 + .4 * e; }
      else { const e = xo((t - .5) / .5); notch.offset = off - 2 * off * e; notch.size = .9; }
      m.sig = ''; m.update(); out.push({ clipPath: m.slot.style.clipPath });
    }
    notch.offset = 0; notch.size = .5; m.sig = ''; m.update();
    return out;
  };
  const DUR = 1200;
  // the halves only open once the first screen is ready to be seen: the home hero has drawn its first frame and
  // the images in view are decoded (never longer than a few seconds)
  const firstScreen = () => {
    const waits = [];
    const hero = document.querySelector('[data-journey]');
    if (hero && !hero.dataset.drawn) waits.push(new Promise((res) => { const mo = new MutationObserver(() => { if (hero.dataset.drawn) { mo.disconnect(); res(); } }); mo.observe(hero, { attributes: true, attributeFilter: ['data-drawn', 'class'] }); if (hero.classList.contains('is-static')) res(); }));
    document.querySelectorAll('img').forEach((img) => { const r = img.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && r.width > 40 && !root.contains(img) && img.decode) waits.push(img.decode().catch(() => {})); });
    return Promise.race([Promise.all(waits), new Promise((r) => setTimeout(r, quick ? 3500 : 2500))]).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  };
  const t0 = performance.now();
  firstScreen().then(() => setTimeout(open, Math.max(0, splitAt - (performance.now() - t0))));
  function open() {
    const kfs = [notchFrames(masks[0], nTop[0]), notchFrames(masks[1], nBot[0])];
    const T = 0;
    A(top, [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], DUR, T, EIO);
    A(bottom, [{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], DUR, T, EIO);
    A(fwTop, [{ transform: 'translateY(0)' }, { transform: 'translateY(50%)' }], DUR, T, EIO);
    A(fwBot, [{ transform: 'translateY(0)' }, { transform: 'translateY(-50%)' }], DUR, T, EIO);
    A(root.querySelector('.overlay'), [{ opacity: 1 }, { opacity: 0 }], 800, T, 'cubic-bezier(0.55, 0, 1, 0.45)');
    masks.forEach((m, i) => m.slot.animate(kfs[i], { duration: DUR, easing: 'linear', fill: 'forwards' }));
    // the page sets itself up once the opening is under way; the halves keep gliding on the compositor meanwhile
    setTimeout(() => { root.style.pointerEvents = 'none'; document.body.classList.remove('is-loading'); lenis?.start(); done(); }, quick ? 120 : 600);
    setTimeout(() => { root.remove(); document.dispatchEvent(new CustomEvent('sn:revealed')); window.SN && (window.SN.revealed = true); }, DUR + 80);
  }
}

/* ---------------- page init (runs as the loader opens, like Terminal's "animate" event) ---------------- */
function initPage() {
  // section intros: canvas grids, path backgrounds, strong sweep, content parallax
  document.querySelectorAll('.section__wrapper').forEach(sec => {
    const bg = sec.dataset.bg;
    if (bg) new GridCanvas(sec.querySelector('.bg-canvas__wrapper'), bg, bg === 'wave');
    if (sec.dataset.path !== undefined) new PathBackground(sec.querySelector('.path-background'), { layout: sec.dataset.path === '0' ? 0 : sec.dataset.path });
    const header = sec.querySelector('.header'); if (header) animatedStrong(header, sec.querySelector('.section-introduction'));
    const content = sec.querySelector('.si-content-wrapper');
    if ((bg || sec.dataset.path !== undefined) && !RM) {
      ScrollTrigger.matchMedia({ '(min-width: 1024px)': () => {
        gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } })
          .fromTo(content, { y: () => (sec.offsetHeight - content.offsetHeight) * .25 }, { y: () => -(sec.offsetHeight - content.offsetHeight) * .25, ease: 'none', duration: 1 }, 0);
      } });
    }
  });

  // paragraph highlight (text reveal) — hero plays on load, the rest scrub with scroll
  document.querySelectorAll('.section-introduction .paragraph, .value-meta p, .service p').forEach(par => {
    const first = par.getBoundingClientRect().top < innerHeight * .9;
    if (par.closest('.service')) par.classList.add('reveal-soft');
    if (par.closest('.is-ink')) par.classList.add('reveal-dark');
    revealChars(par, { auto: first, start: 'top 90%', end: 'top 55%' });
  });
  document.querySelectorAll('[data-reveal]').forEach(par => { const first = par.getBoundingClientRect().top < innerHeight * .9; revealChars(par, { auto: first, start: 'top 90%', end: 'top 55%' }); });
  document.querySelectorAll('.f-brand p').forEach(par => { par.classList.add('reveal-dark'); revealChars(par, { start: 'top 95%', end: 'top 70%' }); });

  // how we work: pinned story — list activates, photos wipe up, glowing rail fills
  const ap = document.querySelector('.approach');
if (ap) {
  const apItems = [...ap.querySelectorAll('.ap-item')], apImgs = [...ap.querySelectorAll('.ap-media-item')];
  const chipNum = ap.querySelector('.ap-chip-num'), chipTitle = ap.querySelector('.ap-chip-title');
  let apActive = 0;
  const apReveals = apItems.map(it => {
    const par = it.querySelector('.ap-body p');
    return revealChars(par, isLg() ? { manual: true } : { start: 'top 90%', end: 'top 60%' });
  });
  if (isLg()) apReveals[0].play(1.8, .2);
  const setActive = i => {
    if (i === apActive) return; apActive = i;
    apItems.forEach((it, k) => it.classList.toggle('is-active', k === i));
    if (isLg()) apReveals[i].play(1.6, .15);
    chipNum.textContent = `0${i + 1} / 03`; chipTitle.textContent = apItems[i].querySelector('h3').textContent;
    if (!RM) gsap.fromTo([chipNum, chipTitle], { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, ease: 'expo.out', stagger: .05 });
  };
  gsap.matchMedia().add('(min-width: 1024px)', () => {
    const fill = ap.querySelector('.ap-rail-fill'), dot = ap.querySelector('.ap-rail-dot');
    const rail = ap.querySelector('.ap-rail');
    gsap.set(apImgs.slice(1), { clipPath: 'inset(100% 0% 0% 0%)' });
    const tl = gsap.timeline({ scrollTrigger: {
      trigger: ap, start: 'top top', end: () => '+=' + innerHeight * 2.4, pin: ap.querySelector('.ap-pin'), anticipatePin: 1, refreshPriority: 10, scrub: RM ? false : .8, invalidateOnRefresh: true,
      onUpdate: s => setActive(Math.min(2, Math.floor(s.progress * 3 * .9999)))
    } });
    tl.to({}, { duration: 3 }, 0)
      .fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', duration: 3 }, 0)
      .fromTo(dot, { y: 0 }, { y: () => rail.offsetHeight, ease: 'none', duration: 3 }, 0);
    apImgs.slice(1).forEach((m, k) => {
      const at = .7 + k;
      tl.to(m, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.inOut', duration: .6 }, at)
        .fromTo(m.querySelector('img'), { scale: 1.25 }, { scale: 1, ease: 'power2.out', duration: .9 }, at)
        .to(apImgs[k].querySelector('img'), { scale: .92, ease: 'power2.inOut', duration: .6 }, at);
    });
    return () => { gsap.set(apImgs, { clearProps: 'clipPath' }); };
  });

}
  // values: line threading behind the cards + circuit inside the ink panel
  const vw = document.querySelector('.values-wrapper');
if (vw) {
  new PathBackground(vw.querySelector('[data-values-path]'), { trigger: vw, layout: (w, h) => {
    const media = vw.querySelector('.value-card .value-media'); if (!media) return [];
    const r = media.getBoundingClientRect(), base = vw.getBoundingClientRect(), y = r.top - base.top + r.height * .55;
    const mid = vw.querySelectorAll('.value-card')[1].getBoundingClientRect(), y2 = mid.top - base.top + mid.height * .4;
    return isLg() ? [
      [{ x: 0, y }, { x: w * .3, y, radius: 60 }, { x: w * .36, y: y2, radius: 60 }, { x: w * .64, y: y2, radius: 60 }, { x: w * .7, y, radius: 60 }, { x: w, y }],
      [{ x: w * .5, y: 0 }, { x: w * .5, y: mid.top - base.top - 30, radius: 0 }]
    ] : [[{ x: w * .5, y: 0 }, { x: w * .5, y: h }]];
  } });
  new PathBackground(document.querySelector('[data-panel-path]'), { layout: 'panel', stroke: '#ffffff', strokeOpacity: .18, duration: 2.4 });
  document.querySelectorAll('.value-card').forEach((c, i) => {
    const n = { direction: DIR.top, offset: 24, position: i % 2 ? .3 : .7, size: .45, notchWidth: .9, radius: 10 };
    const side = { direction: i % 2 ? DIR.left : DIR.right, offset: 18, position: .6, size: .25, radius: 8 };
    new NotchMask(c.querySelector('.svg-mask'), [n, side]);
    if (RM) return;
    gsap.timeline({ scrollTrigger: { trigger: c, start: 'top bottom', end: 'bottom top', scrub: true } })
      .fromTo(n, { position: i % 2 ? .25 : .75 }, { position: i % 2 ? .6 : .4, ease: 'none' }, 0)
      .fromTo(side, { position: .75 }, { position: .35, ease: 'none' }, 0)
      .fromTo(c.querySelector('.value-transform') || {}, { yPercent: -6 }, { yPercent: 6, ease: 'none' }, 0);
  });

}
  // cross grids + divider comets + logo fade + odometers
  const grids = [...document.querySelectorAll('[data-cross-grid]')];
  const dividerBg = new Map();
  const buildGrid = g => {
    buildCrossGrid(g);
    let pb = dividerBg.get(g);
    if (!pb) {
      const el = document.createElement('div'); el.className = 'path-background'; el.setAttribute('aria-hidden', 'true'); g.append(el);
      pb = new PathBackground(el, { dividers: true, strokeOpacity: 0, duration: 4, layout: (w, h) => {
        const cols = +g.dataset.c, rows = +g.dataset.r, out = [];
        for (let r = 0; r <= rows; r++) out.push([{ x: 0, y: r / rows * h }, { x: w, y: r / rows * h }]);
        for (let c = 1; c < cols; c++) out.push([{ x: c / cols * w, y: 0 }, { x: c / cols * w, y: h }]);
        return out;
      } });
      dividerBg.set(g, pb);
    } else pb.build(true);
  };
  grids.forEach(buildGrid);
  let lastLg = isLg();
  addEventListener('resize', () => { if (isLg() !== lastLg) { lastLg = isLg(); grids.forEach(buildGrid); ScrollTrigger.refresh(); } });
  const logos = document.querySelectorAll('.logo-grid img');
  gsap.set(logos, { opacity: 1 });
  document.querySelectorAll('[data-counter]').forEach(odometer);

  // footer: notch, slide-up reveal, path lines, strong sweep, tilt button
  const holder = document.querySelector('.footer__height-holder'), wrap = holder.querySelector('.footer__wrapper');
  const fNotch = { direction: DIR.top, size: .65, position: .5, offset: 30, radius: 20 };
  new NotchMask(wrap.querySelector('[data-mask="footer"]'), [fNotch]);
  new PathBackground(wrap.querySelector('[data-path="footer"]'), { layout: 'footer', stroke: '#A2A2A2', glow: ACCENT, shapeOpacity: .55, trigger: holder });
  animatedStrong(wrap.querySelector('[data-footer-title]'), holder, { end: '#ffffff' });
  wrap.querySelectorAll('[data-tilt]').forEach(b => buttonTilt(b, holder));
  ScrollTrigger.create({ trigger: holder, scrub: true, start: 'top bottom', end: 'top top', onUpdate: ({ progress }) => { fNotch.offset = (progress * -2 + 1) * 30; } });
  gsap.matchMedia().add('(min-width: 1024px)', () => {
    const size = () => { holder.style.height = wrap.offsetHeight + 'px'; };
    size(); const ro = new ResizeObserver(() => { size(); ScrollTrigger.refresh(); }); ro.observe(wrap);
    const st = ScrollTrigger.create({ trigger: holder, scrub: true, start: 'top bottom', end: 'bottom bottom', onUpdate: ({ progress }) => { wrap.style.transform = `translate3d(0, ${lerp(100, 1, progress)}%, 0)`; } });
    return () => { ro.disconnect(); st.kill(); holder.style.height = ''; wrap.style.transform = ''; };
  });

  // entrance: fade-up in staggered batches as blocks enter the viewport
  if (!RM) {
    const groups = [
      ['.section-introduction .si-label, .section-introduction .header, .btn-row', 60, .1],
      ['.ap-eyebrow, .ap-title, .ap-list-wrap', 50, .1],
      ['.value-card', 70, .12],
      ['.stats-grid .cell > *', 30, .06],
      ['.logo-grid .cell img', 24, .07],
      ['.services .border__wrapper', 50, .08],
      ['[data-enter]', 50, .09]
    ];
    groups.forEach(([sel, y, each]) => {
      const els = gsap.utils.toArray(sel);
      if (!els.length) return;
      gsap.set(els, { y, autoAlpha: 0 });
      ScrollTrigger.batch(els, {
        start: 'top 92%', once: true,
        onEnter: batch => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.3, ease: 'expo.out', stagger: each, overwrite: 'auto', clearProps: 'transform' })
      });
    });
    const media = document.querySelector('.ap-media');
    if (media) gsap.fromTo(media, { clipPath: 'inset(12% 8% 12% 8% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'expo.out', duration: 1.6, scrollTrigger: { trigger: '.approach', start: 'top 75%', once: true } });
  }

  document.dispatchEvent(new CustomEvent('sn:ready'));
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
}

window.SN = { PathBackground, NotchMask, GridCanvas, revealChars, animatedStrong, roundedPath, DIR, ACCENT, INK, RM, isLg, get lenis() { return lenis; } };
let started = false;
const start = () => { if (started) return; started = true; runLoader(initPage); };
document.fonts && document.fonts.ready ? document.fonts.ready.then(start) : addEventListener('load', start);
setTimeout(start, 2500);
})();
