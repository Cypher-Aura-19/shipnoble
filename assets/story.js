/* ================= HOME · the truck story =================
   Chapter 2 (the dock) and chapter 3 (services) here; chapter 4 (the camera swing and the skeleton) below.
   Every part's state is a pure function of scroll progress, so scrolling back plays everything backwards exactly.
   Geometry: tools/fig-story.mjs. */
(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (v, a, b) => clamp((v - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t;
const NS = 'http://www.w3.org/2000/svg';
const fx = (v) => v.toFixed(2);
// phones, and tablets held upright, zoom in and follow the action
const PHONE = matchMedia('(max-width: 767px), (min-width: 768px) and (max-width: 1100px) and (orientation: portrait)');

// a follower: renders the eased value toward the scroll target, stops when settled
function follower(render, tau = 0.18) {
  let target = 0, cur = 0, raf = 0, last = 0, held = false;
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    cur = RM ? target : cur + (target - cur) * (1 - Math.exp(-dt / tau));
    if (Math.abs(target - cur) < 1e-5) cur = target;
    render(cur);
    raf = cur !== target ? requestAnimationFrame(tick) : 0;
  };
  return {
    set(p) { if (held) return; target = p; if (!raf) { last = 0; raf = requestAnimationFrame(tick); } },
    hold(p) { held = true; target = cur = p; render(p); },
    release() { held = false; },
    get value() { return cur; },
  };
}

// a copy panel visible over [a, b] (in the chapter's own units), sliding in from below and out upward
function panelAt(el, s, a, b, w = 0.3, dist = 28) {
  const i = a <= 0 ? 1 : smooth(range(s, a - w, a)), o = smooth(range(s, b, b + w));
  const op = i * (1 - o);
  el.style.opacity = op.toFixed(3);
  el.style.transform = `translate3d(0, ${((1 - i) * dist - o * dist).toFixed(1)}px, 0)`;
  el.style.visibility = op < 0.005 ? 'hidden' : '';
}

/* ======================================================================
   CHAPTER 2 · THE DOCK
   s runs in viewport heights: 0 when the section's top meets the bottom of the screen, 1 when the pin starts.
   ====================================================================== */
const dock = document.querySelector('[data-story-dock]');
if (dock) Promise.all([
  fetch('assets/story-side.svg?v=9').then((r) => r.text()),
  fetch('assets/story-pallet.svg?v=3').then((r) => r.text()),
  fetch('assets/story.json').then((r) => r.json()),
]).then(([svgText, palletSvg, J]) => {
  const F = J.side;
  const stage = dock.querySelector('[data-sd-stage]');
  stage.insertAdjacentHTML('afterbegin', svgText);
  const svg = stage.querySelector('svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');
  const $ = (q) => svg.querySelector(q);
  const tr = (x, z) => `translate(${fx(x * F.ax[0])} ${fx(z * F.az[1])})`;

  const truck = $('[data-truck]'), truckFront = $('[data-truck-front]'), cargo = $('[data-cargo]');
  const fork = $('[data-forklift]'), forks = $('[data-forks]'), forkLoad = $('[data-fork-load]');
  const lift = $('[data-lift]'), liftLoad = $('[data-lift-load]'), queue = $('[data-queue]');
  const door = $('[data-door]'), lip = $('[data-lip]'), bunch = $('[data-bunch]'), curtainRect = $('[data-curtain-rect]');
  const lipC = lip.dataset.c.split(' ').map(Number);
  const spins = [...svg.querySelectorAll('[data-spin]')].map((g) => ({ g, c: g.dataset.c.split(' ').map(Number), r: F.wheels[+g.dataset.spin].r }));
  const panels = [...dock.querySelectorAll('[data-sd-panel]')];
  const counts = [...dock.querySelectorAll('[data-count]')].map((el) => ({ el, n: +el.dataset.count }));
  const countEl = dock.querySelector('[data-sd-count]'), bars = [...dock.querySelectorAll('.sd-count-bar i')];
  const band = dock.querySelector('[data-sd-band]');
  // layers: the yard and warehouse are painted once; the truck, its front and the forklift each slide on a GPU
  // layer of their own (the slide is a transform, never a repaint); the dock door and lip stay in this svg on top
  const worldG = svg.querySelector('[data-world]');
  const mkLayer = (els) => {
    const L = svg.cloneNode(false); L.removeAttribute('role'); L.removeAttribute('aria-label'); L.setAttribute('aria-hidden', 'true');
    const w = worldG.cloneNode(false); L.appendChild(w); els.forEach((e) => { if (e) w.appendChild(e); }); svg.before(L); return L;
  };
  [truck, truckFront, fork].forEach((el) => el.removeAttribute('transform'));
  const lay = { bg: mkLayer([svg.querySelector('.st-bg')]), lift: mkLayer([svg.querySelector('.st-lift'), svg.querySelector('.st-queue')]), truck: mkLayer([truck]), fork: mkLayer([fork]), front: mkLayer([truckFront]) };
  const allL = [lay.bg, lay.lift, lay.truck, lay.fork, lay.front, svg];
  const rig = new Map([[lay.truck, [0, 0]], [lay.fork, [0, 0]], [lay.front, [0, 0]]]);
  let camZ = 1, camTx = 0, camTy = 0, camWc = false, camTimer = 0;
  const applyCam = () => allL.forEach((L) => {
    const o = rig.get(L) || [0, 0];
    const t = `translate3d(${Math.round(camTx + o[0] * scale * camZ)}px, ${Math.round(camTy + o[1] * scale * camZ)}px, 0) scale(${camZ})`;
    if (L.__t !== t) { L.__t = t; L.style.transform = t; }
  });

  // the four pallets, each one SVG group moved between the lift, the queue, the forks and the trailer
  const pallets = [0, 1, 2, 3].map(() => { const g = document.createElementNS(NS, 'g'); g.innerHTML = palletSvg; return { g, where: '', key: '' }; });
  const place = (p, parent, x, z) => {
    if (p.where !== parent) { parent.append(p.g); p.where = parent; }
    const key = `${x.toFixed(2)},${z.toFixed(2)}`;
    if (key !== p.key) { p.g.setAttribute('transform', tr(x, z)); p.key = key; }
  };

  const C = F.cur, CUR0 = curtainRect.getAttribute('x') * 1, CURW = curtainRect.getAttribute('width') * 1;
  const DOOR_H = (44.6 - F.floor) * -F.az[1];
  const { slots, park: PARK, pick: PICK } = F, LT = F.lift.top, LB = F.lift.bottom, LX = F.lift.x;

  /* ---------- the timeline (viewport heights) ---------- */
  const TL = { arrive: [0.3, 1.6], door: [1.55, 1.95], curtain: [1.6, 2.25], lip: [1.95, 2.25], load: [2.3, 6.1], close: [6.1, 6.55], lipUp: [6.1, 6.3], doorDown: [6.2, 6.6], drive: [6.6, 7.5], band: [6.75, 7.5] };
  const TOTAL = 7.5;

  // one loading cycle per pallet: v runs 0 → 1 for pallet k
  function loading(u) {
    const n = 4, k = Math.min(n - 1, Math.floor(u * n)), v = u >= 1 ? 1 : u * n - k;
    const seg = (a, b) => smooth(range(v, a, b));
    // the lift brings pallet k down, goes back up empty once the forklift has it
    const liftZ = v < 0.5 ? lerp(LT, LB, seg(0, 0.18)) : lerp(LB, LT, seg(0.5, 0.68));
    // the forklift: approach, lift, drive in, set down, reverse back to its spot
    const dest = slots[k] - 6;
    let x = PARK, fz = 0;
    if (v < 0.3) { x = lerp(PARK, PICK, seg(0.18, 0.3)); fz = lerp(0, 0.4, seg(0.16, 0.26)); }
    else if (v < 0.36) { x = PICK; fz = lerp(0.4, 1.6, seg(0.3, 0.36)); }
    else if (v < 0.62) { x = lerp(PICK, dest, seg(0.36, 0.62)); fz = 1.6; }
    else if (v < 0.68) { x = dest; fz = lerp(1.6, 0.4, seg(0.62, 0.68)); }
    else { x = lerp(dest, PARK, seg(0.68, 0.94)); fz = lerp(0.4, 0, seg(0.9, 1)); }
    const onForks = v >= 0.33 && v < 0.66;
    const placed = k + (v >= 0.66 ? 1 : 0);
    const roll = k < n - 1 ? seg(0.7, 0.84) : 0;      // the queue advances onto the raised lift
    return { k, v, liftZ, x, fz, onForks, placed, roll };
  }

  // phone: zoom in and follow the action
  let zoom = 1, viewW = 0, viewH = 0, scale = 1, offX = 0, bandH = 0;
  const measure = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    viewW = r.width; viewH = r.height;
    scale = Math.min(viewW / F.vb[0], viewH / F.vb[1]);
    // as close as 2.1×, but never taller than the stage
    zoom = PHONE.matches ? Math.max(1.01, Math.min(2.1, (viewH * 0.95) / (F.vb[1] * scale))) : 1;
    offX = (viewW - F.vb[0] * scale) / 2;
    // the navy road rises to the front edge of the yard
    bandH = parseFloat(getComputedStyle(stage).bottom) + (F.vb[1] - F.ground) * scale * zoom;
    band.style.height = bandH.toFixed(1) + 'px'; band.style.transformOrigin = '50% 100%'; band.__k = '';
  };
  let lastCam = '';
  // the camera: z is the zoom, worldX the point kept at the stage's anchor (its middle on a phone, the dock on a desktop)
  const camera = (worldX, z) => {
    if (z <= 1.0005) { camZ = 1; camTx = 0; camTy = 0; return; }
    const sx = offX + (F.o[0] + worldX * F.ax[0]) * scale;                     // the point's screen x at zoom 1
    const anchor = PHONE.matches ? viewW / 2 : sx;
    let tx = anchor - sx * z;
    const minX = viewW - (offX + (F.o[0] + 560 * F.ax[0]) * scale) * z, maxX = -(offX + (F.o[0] - 80 * F.ax[0]) * scale) * z;
    if (PHONE.matches) tx = clamp(tx, Math.min(minX, maxX), maxX);
    const ty = viewH * (1 - z);                                                 // keep the ground at the bottom
    const zz = Math.round(z * 2000) / 2000;
    if (zz !== camZ) {
      if (!camWc) { allL.forEach((L) => { L.style.willChange = 'transform'; }); camWc = true; }
      clearTimeout(camTimer); camTimer = setTimeout(() => { allL.forEach((L) => { L.style.willChange = ''; }); camWc = false; }, 180);
    }
    camZ = zz; camTx = tx; camTy = ty;
  };

  // only touch an attribute when its value really changes: every write makes the browser repaint that part
  const setA = (el, name, v) => { const k = '__' + name; if (el[k] !== v) { el[k] = v; el.setAttribute(name, v); } };
  let lastCount = -1;
  function render(s) {
    // the truck: reverses in, waits, drives off
    const X = s < TL.drive[0] ? 330 * (1 - easeOut(range(s, ...TL.arrive))) : 560 * easeIn(range(s, ...TL.drive));
    const tX = tr(X, 0);
    const tdx = X * F.ax[0]; rig.set(lay.truck, [tdx, 0]); rig.set(lay.front, [tdx, 0]);
    spins.forEach(({ g, c, r }) => setA(g, 'transform', `rotate(${fx((X / r) * 57.2958)} ${c[0]} ${c[1]})`));

    // the dock: door rolls up, curtain draws back, lip drops; all reversed after loading
    const doorOpen = smooth(range(s, ...TL.door)) * (1 - smooth(range(s, ...TL.doorDown)));
    setA(door, 'transform', `translate(0 ${fx(-doorOpen * DOOR_H)})`);
    const lipDown = smooth(range(s, ...TL.lip)) * (1 - smooth(range(s, ...TL.lipUp)));
    setA(lip, 'transform', `rotate(${fx(90 * (1 - lipDown))} ${lipC[0]} ${lipC[1]})`);
    const open = smooth(range(s, ...TL.curtain)) * (1 - smooth(range(s, ...TL.close)));
    // the curtain slides toward the rear post and gathers there
    const edge = C.x1 - open * (C.x1 - C.x0 - 5.4);
    setA(curtainRect, 'width', fx(CURW - (C.x1 - edge) * F.ax[0]));
    setA(bunch, 'transform', tr(edge - 5.4, 0));
    bunch.style.opacity = open > 0.004 ? 1 : 0;

    // loading
    const L = loading(range(s, ...TL.load));
    setA(lift, 'transform', tr(0, L.liftZ));
    rig.set(lay.fork, [L.x * F.ax[0], F.floor * F.az[1]]);
    setA(forks, 'transform', tr(0, L.fz));
    pallets.forEach((p, i) => {
      if (i < L.placed) place(p, cargo, slots[i], F.floor);
      else if (i === L.k && L.onForks) place(p, forkLoad, 6, -0.4);
      else if (i === L.k && L.v < 0.33) place(p, liftLoad, LX, 0);
      else if (i === L.k + 1) {
        // the next one waits at the head of the conveyor, then rolls onto the raised lift
        if (L.roll >= 1) place(p, liftLoad, LX, 0); else place(p, queue, lerp(F.queue[0], LX, L.roll), LT);
      } else {
        const q = i - L.k - 1;
        place(p, queue, lerp(F.queue[q], F.queue[q - 1], L.roll), LT);
      }
    });

    // the camera: a phone follows the truck, then the forklift; a desktop pushes in on the dock while loading
    if (PHONE.matches) {
      const inLoad = smooth(range(s, TL.load[0] - 0.4, TL.load[0])) * (1 - smooth(range(s, TL.load[1], TL.load[1] + 0.4)));
      camera(lerp(X + 70, L.x + 2, inLoad), zoom);
    } else {
      const push = smooth(range(s, 1.9, 2.5)) * (1 - smooth(range(s, 6.0, 6.6)));
      camera(28, 1 + 0.16 * push);
    }
    applyCam();

    // copy
    panels.forEach((el) => {
      const n = +el.dataset.sdPanel;
      if (n === 0) panelAt(el, s, 0, 1.7, 0.25);
      else if (n === 1) panelAt(el, s, 2.25, 6.3, 0.25);
      else panelAt(el, s, 6.85, 99, 0.25);
    });
    const cu = smooth(range(s, 0.15, 1.05));
    counts.forEach((c) => { const v = Math.round(c.n * cu); if (v !== c.v) { c.v = v; c.el.textContent = v.toLocaleString('en-US'); } });
    if (L.placed !== lastCount) { countEl.textContent = L.placed; bars.forEach((b, i) => b.classList.toggle('is-on', i < L.placed)); lastCount = L.placed; }

    // the navy road rises under the truck as it drives off
    // the band grows on the GPU (a scale), never by changing its height
    const bk = smooth(range(s, ...TL.band)).toFixed(3);
    if (bk !== band.__k) { band.__k = bk; band.style.transform = `scaleY(${bk})`; }
  }

  const f = follower((p) => render(p * TOTAL));
  measure();
  render(RM ? 4.4 : 0);
  if (RM) panels.forEach((el) => panelAt(el, 0, +el.dataset.sdPanel ? 99 : 0, +el.dataset.sdPanel ? 100 : 99));
  window.__sd = (s) => f.hold(s / TOTAL);
  addEventListener('resize', () => { measure(); render(RM ? 4.4 : f.value * TOTAL); });

  const { gsap, ScrollTrigger } = window;
  if (!RM && gsap && ScrollTrigger) {
    const pinLen = () => innerHeight * (TOTAL - 1);
    ScrollTrigger.create({ trigger: dock, start: 'top top', end: () => '+=' + pinLen(), pin: dock.querySelector('[data-sd-pin]'), anticipatePin: 1, refreshPriority: 5 });
    ScrollTrigger.create({ trigger: dock, start: 'top bottom', end: () => '+=' + (innerHeight + pinLen()), refreshPriority: 4, onUpdate: (st) => f.set(st.progress) });
    ScrollTrigger.sort(); ScrollTrigger.refresh();
  }
});

/* ======================================================================
   CHAPTER 4 · THE SWING, THE TURN AND THE BLUEPRINT
   s in viewport heights: 0 when the section's top meets the bottom of the screen, 1 when the pin starts.
   ====================================================================== */
const air = document.querySelector('[data-story-air]');
if (air) fetch('assets/story.json').then((r) => r.json()).then(async (JJ) => {
  const F = JJ.top, N = 48;
  const stage = air.querySelector('[data-sa-stage]'), canvas = air.querySelector('[data-sa-canvas]'), ctx2d = canvas.getContext('2d');
  const panels = [...air.querySelectorAll('[data-sa-panel]')];
  const fxs = [...air.querySelectorAll('[data-sa-fx]')];
  const svgText = await fetch('assets/story-top.svg?v=11').then((r) => r.text());
  stage.insertAdjacentHTML('beforeend', svgText);
  const svg = stage.querySelector('svg');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  const $ = (q) => svg.querySelector(q);
  const cam = $('[data-cam]'), ctxG = $('[data-ctx]'), scan = $('[data-scan]');
  const tractor = $('[data-unit="tractor"]'), trailer = $('[data-unit="trailer"]');
  const grads = [...svg.querySelectorAll('[data-wipe-grad]')];
  // the blueprint masks only exist while the sweep runs, and only as big as the truck: a mask is costly to draw
  const masked = [...svg.querySelectorAll('[mask]')].map((el) => {
    const id = el.getAttribute('mask').match(/#([^)]+)/)[1], m = svg.getElementById ? svg.querySelector('#' + id) : null;
    try { const b = el.getBBox(), pad = 40, box = { x: b.x - pad, y: b.y - pad, width: b.width + 2 * pad, height: b.height + 2 * pad };
      if (m) { Object.entries(box).forEach(([k2, v]) => m.setAttribute(k2, v.toFixed(1))); const r = m.querySelector('rect'); if (r) Object.entries(box).forEach(([k2, v]) => r.setAttribute(k2, v.toFixed(1))); } } catch (e) {}
    el.removeAttribute('mask');
    return { el, url: 'url(#' + id + ')' };
  });
  let wipeMode = 'on', lastE = '', lastRoad = '', lastFx = '';
  // the camera is one GPU transform on the svg: a pan reuses the painted tiles, a zoom repaints once it settles
  cam.removeAttribute('transform');
  // layers: the road world stays in this svg; the tractor, the trailer and the scan line each get an svg of their own
  // on top, so the truck turning and the camera moving are GPU transforms rather than repaints
  const layerOf = (el) => {
    const L = svg.cloneNode(false); L.removeAttribute('role'); L.removeAttribute('aria-label'); L.setAttribute('aria-hidden', 'true');
    const c2 = cam.cloneNode(false), w2 = el.parentNode.cloneNode(false);
    L.appendChild(c2); c2.appendChild(w2); w2.appendChild(el); return L;
  };
  const LT = layerOf(tractor), LR = layerOf(trailer), LS = layerOf(scan);
  const svgs = [svg, LT, LR, LS];
  svg.after(LT, LR, LS);
  // the camera only ever zooms out from 1: a raster kept from full scale stays sharp as the GPU shrinks it
  svgs.forEach((el) => { el.style.transformOrigin = '0 0'; el.style.willChange = 'transform'; });
  const unit = { t: { dx: 0, dy: 0, a: 0, cx: 0, cy: 0 }, r: { dx: 0, dy: 0, a: 0, cx: 0, cy: 0 } };
  let camT = '', camZ = 0, camTimer = 0, camX = 0, camY = 0, unitT = ['', ''];
  // a unit's svg transform (translate, then rotate about a point), carried into css px of the stage
  const unitCss = (u, sc0, ox, oy, vb) => {
    const px = (u.cx - vb.x) * sc0 + ox, py = (u.cy - vb.y) * sc0 + oy;
    return ` translate(${(u.dx * sc0).toFixed(1)}px, ${(u.dy * sc0).toFixed(1)}px) translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${u.a.toFixed(2)}deg) translate(${(-px).toFixed(1)}px, ${(-py).toFixed(1)}px)`;
  };
  const setCam = (x, y, z, sc0, ox, oy, vb) => {
    const t = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
    const ut = [unitCss(unit.t, sc0, ox, oy, vb), unitCss(unit.r, sc0, ox, oy, vb)];
    if (t !== camT) {
      camT = t; camZ = z; svg.style.transform = t; LS.style.transform = t; unitT = ['', ''];
    }
    if (ut[0] !== unitT[0]) { unitT[0] = ut[0]; LT.style.transform = t + ut[0]; }
    if (ut[1] !== unitT[1]) { unitT[1] = ut[1]; LR.style.transform = t + ut[1]; }
  };
  const k = F.ax, o = F.o, LANE = F.LANE;
  const S = (x, y) => [o[0] + x * k, o[1] + y * F.ay];

  /* ---------- the route: the drive axle runs east, turns left on an arc, runs north; the trailer follows its kingpin ---------- */
  const xs = F.XS, A0 = [F.drive, LANE];
  const L1 = xs - A0[0], L2 = Math.PI * F.R / 2, L3 = F.D, LEN = L1 + L2 + L3;
  const axleAt = (d) => {
    if (d <= L1) return { p: [A0[0] + d, LANE], th: 0 };
    if (d <= L1 + L2) { const a = (d - L1) / F.R; return { p: [xs + F.R * Math.sin(a), LANE - F.R + F.R * Math.cos(a)], th: -a }; }
    return { p: [xs + F.R, LANE - F.R - (d - L1 - L2)], th: -Math.PI / 2 };
  };
  const TRL = F.king - F.axle, KO = F.king - F.drive;
  const table = [];
  { // the drive axle's route, eased so the steering winds on and off smoothly (no sudden change of curvature)
    const raw = []; for (let d = 0; d <= LEN + 0.001; d += 0.5) raw.push(axleAt(d).p);
    let pts = raw;
    for (let pass = 0; pass < 3; pass++) pts = pts.map((_, i) => { let x = 0, y = 0, n = 0; for (let j = i - 18; j <= i + 18; j++) { const q = pts[Math.max(0, Math.min(pts.length - 1, j))]; x += q[0]; y += q[1]; n++; } return [x / n, y / n]; });
    // the trailer's axle group is dragged behind the kingpin
    let q = [F.axle, LANE];
    pts.forEach((p, i) => {
      const n0 = pts[Math.max(0, i - 2)], n1 = pts[Math.min(pts.length - 1, i + 2)], th = Math.atan2(n1[1] - n0[1], n1[0] - n0[0]);
      const K = [p[0] + KO * Math.cos(th), p[1] + KO * Math.sin(th)];
      const v = [K[0] - q[0], K[1] - q[1]], l = Math.hypot(v[0], v[1]);
      q = [K[0] - (v[0] / l) * TRL, K[1] - (v[1] / l) * TRL];
      table.push({ a: { p, th }, K, phi: Math.atan2(v[1], v[0]) });
    });
  }
  const pose = (u) => {
    const f = clamp(u) * (table.length - 1), i = Math.min(table.length - 2, Math.floor(f)), t = f - i, A = table[i], B = table[i + 1];
    const th = lerp(A.a.th, B.a.th, t);
    let phi = lerp(A.phi, B.phi, t);
    phi = lerp(phi, th, smooth(range(u, 0.82, 1)));              // the trailer settles straight behind the cab
    const a = [lerp(A.a.p[0], B.a.p[0], t), lerp(A.a.p[1], B.a.p[1], t)], K = [lerp(A.K[0], B.K[0], t), lerp(A.K[1], B.K[1], t)];
    return { a, th, K, phi };
  };
  // the camera keeps the whole truck centred: halfway between the cab front and the trailer tail
  const centreOf = (P) => { const fr = [P.a[0] + (F.len - F.drive) * Math.cos(P.th), P.a[1] + (F.len - F.drive) * Math.sin(P.th)], rr = [P.K[0] - F.king * Math.cos(P.phi), P.K[1] - F.king * Math.sin(P.phi)]; return [(fr[0] + rr[0]) / 2, (fr[1] + rr[1]) / 2]; };

  /* ---------- the swing frames ---------- */
  let orient = '', frames = [], dpr = 1, loadedNight = null;
  const pickOrient = () => (stage.clientWidth >= stage.clientHeight ? 'land' : 'port');
  const load = () => {
    const night = document.documentElement.dataset.theme === 'dark';
    if (orient === pickOrient() && frames.length && night === loadedNight) return;
    orient = pickOrient(); loadedNight = night;
    if (typeof bmps !== 'undefined') { bmps.forEach((b) => b.close()); bmps.clear(); }
    const want = orient;
    frames = Array.from({ length: N }, (_, i) => {
      const img = new Image(); img.decoding = 'async';
      img.onload = () => { if (want === orient && i < 9) warm(Math.max(0, Math.floor(lastF))); };
      img.src = `assets/${night ? 'story-swing-dark' : 'story-swing'}/${want}-${String(i).padStart(2, '0')}.avif?v=8`;
      return img;
    });
    // the live drawing uses the frames' mapping: landscape 1600 × 900 at 4.2 px per dm, portrait 900 × 1600 at 4.6
    if (orient === 'port') { const r = F.K / F.KP; svg.setAttribute('viewBox', `${fx(800 - 450 * r)} ${fx(450 - 800 * r)} ${fx(900 * r)} ${fx(1600 * r)}`); }
    else svg.setAttribute('viewBox', '0 0 1600 900');
    if (typeof svgs !== 'undefined') svgs.forEach((el) => { if (el !== svg) el.setAttribute('viewBox', svg.getAttribute('viewBox')); });
  };
  const sizeCanvas = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(stage.clientWidth * dpr); canvas.height = Math.round(stage.clientHeight * dpr);
  };
  let lastF = -1, wantF = 0;
  const ready = (img) => img && img.complete && img.naturalWidth;
  const drawable = (j) => bmps.has(j);
  function draw(f, force) {
    wantF = f;
    if (!force && Math.abs(f - lastF) < 0.002) return;
    lastF = f;
    const i = Math.max(0, Math.floor(f)), t = f - i, a = frames[i], b = frames[Math.min(N - 1, i + 1)];
    const W = canvas.width, H = canvas.height;
    const fit = (img) => { const s = Math.max(W / img.naturalWidth, H / img.naturalHeight), w = img.naturalWidth * s, h = img.naturalHeight * s; return [(W - w) / 2, (H - h) / 2, w, h]; };
    // only frames already decoded off the main thread are drawn; the nearest one stands in until the next is ready
    warm(i);
    let bi = -1;
    for (let d = 0; d < N && bi < 0; d++) { if (drawable(i - d)) bi = i - d; else if (drawable(i + d)) bi = i + d; }
    if (bi < 0) { lastF = -1; return; }
    const base = frames[bi];
    ctx2d.globalAlpha = 1; ctx2d.drawImage(bmps.get(bi), ...fit(base));
    if (t > 0.01 && bi === i && drawable(i + 1)) { ctx2d.globalAlpha = t; ctx2d.drawImage(bmps.get(i + 1), ...fit(b)); ctx2d.globalAlpha = 1; }
    else if (bi !== i) lastF = -1;   // redraw properly once the right frame is decoded
  }
  // decode the frames just ahead and behind off the main thread, so drawing them never stops to decode
  // a small window of frames around the current one is kept as decoded bitmaps (made off the main thread)
  const bmps = new Map(), pending = new Set();
  function warm(i) {
    for (let j = i - 2; j <= i + 6; j++) {
      const img = frames[j];
      if (!img || bmps.has(j) || pending.has(j) || !ready(img) || !window.createImageBitmap) continue;
      pending.add(j);
      fetch(img.src).then((r) => r.blob()).then((bl) => createImageBitmap(bl)).then((b) => { pending.delete(j); if (frames[j] === img) { bmps.set(j, b); if (Math.abs(Math.floor(wantF) - j) <= 1 || lastF < 0) draw(wantF, true); } else b.close(); }).catch(() => pending.delete(j));
    }
    bmps.forEach((b, j) => { if (j < i - 4 || j > i + 9) { b.close(); bmps.delete(j); } });
  }

  /* ---------- the timeline (viewport heights) ---------- */
  const TL = { swing: [1, 2.6], hand: [2.55, 2.65], drive: [2.7, 4.9], wipe: [5.15, 6.75], dim: [4.9, 5.4] };
  const TOTAL = 7.4;
  function render(s) {
    const f = range(s, ...TL.swing) * (N - 1), live = smooth(range(s, ...TL.hand));
    if (live < 1) draw(f);
    // the road and its context dim on the GPU (the world layer's own opacity), not by repainting it
    const liveO = live.toFixed(3), dimO = (live * (1 - 0.6 * smooth(range(s, ...TL.dim)))).toFixed(3);
    if (LT.style.opacity !== liveO) [LT, LR, LS].forEach((el) => { el.style.opacity = liveO; });
    if (svg.style.opacity !== dimO) svg.style.opacity = dimO;
    canvas.style.visibility = live >= 1 ? 'hidden' : '';

    // the drive: ease off, cruise, ease into the stop; the camera rides a little behind the truck
    const u = smooth(range(s, ...TL.drive));
    const P = pose(u), c0 = centreOf(P);
    // while it drives, the camera looks a little ahead of the truck so its headlights stay in frame, then settles back
    const look = F.len * 0.32 * smooth(range(s, 2.8, 3.5)) * (1 - smooth(range(s, 4.25, 4.85)));
    const c = [c0[0] + Math.cos(P.th) * look, c0[1] + Math.sin(P.th) * look];
    // once the truck turns upright the camera pulls back just enough to keep the whole of it, with margin, on any screen
    const vb = svg.viewBox.baseVal, sc = Math.max(stage.clientWidth / vb.width, stage.clientHeight / vb.height);
    // on a phone the copy is stacked above and below the road, so the truck settles in the clear band between the two panels
    const band = stackedBand();
    const zEnd = band ? Math.min(1, band.h / (F.len * k * sc)) : Math.min(1, (stage.clientHeight / sc) / (F.len * k * 1.32)), z = lerp(1, zEnd, smooth(range(s, 3.7, 4.8)));
    const bandDy = band ? (band.mid - stage.clientHeight / 2) * smooth(range(s, 3.7, 4.8)) : 0;
    {
      const W = stage.clientWidth, Hh = stage.clientHeight, zz = Math.round(z * 2000) / 2000;
      const ox = (W - vb.width * sc) / 2, oy = (Hh - vb.height * sc) / 2;
      const Tx = -800 - (c[0] - 82.75) * k, Ty = -450 - (c[1] - LANE) * F.ay;
      const bx = sc * (800 + zz * Tx) - sc * vb.x + ox + zz * sc * vb.x - zz * ox, by = sc * (450 + zz * Ty) - sc * vb.y + oy + zz * sc * vb.y - zz * oy + bandDy;
      var camArgs = [Math.round(bx), Math.round(by), zz, sc, ox, oy, vb];
    }
    const a0 = S(...A0), k0 = S(F.king, LANE), a1 = S(...P.a), k1 = S(...P.K);
    Object.assign(unit.t, { dx: a1[0] - a0[0], dy: a1[1] - a0[1], a: P.th * 57.2958, cx: a0[0], cy: a0[1] });
    Object.assign(unit.r, { dx: k1[0] - k0[0], dy: k1[1] - k0[1], a: P.phi * 57.2958, cx: k0[0], cy: k0[1] });
    setCam(...camArgs);

    // the blueprint: a soft edge runs from the cab to the tail, an orange scan line rides it
    const w = smooth(range(s, ...TL.wipe)), e = lerp(196, -30, w);
    const wm = w <= 0 ? 'on' : w >= 1 ? 'off' : 'mid';
    if (wm !== wipeMode) { wipeMode = wm; masked.forEach(({ el, url }) => { if (wm === 'mid') el.setAttribute('mask', url); else el.removeAttribute('mask'); el.style.display = wm === 'off' ? 'none' : ''; }); }
    const eKey = fx(e);
    if (wm === 'mid' && eKey !== lastE) { lastE = eKey; grads.forEach((g) => { g.setAttribute('x1', fx(o[0] + (e - 22) * k)); g.setAttribute('x2', fx(o[0] + (e + 22) * k)); }); }
    if (w > 0 && w < 1) {
      const front = e > F.king, base = front ? P.a : P.K, ref = front ? F.drive : F.king, ang = front ? P.th : P.phi;
      const pc = [base[0] + (e - ref) * Math.cos(ang), base[1] + (e - ref) * Math.sin(ang)], nx = -Math.sin(ang) * 15, ny = Math.cos(ang) * 15;
      const p1 = S(pc[0] + nx, pc[1] + ny), p2 = S(pc[0] - nx, pc[1] - ny);
      scan.setAttribute('d', `M${fx(p1[0])} ${fx(p1[1])}L${fx(p2[0])} ${fx(p2[1])}`);
      scan.style.opacity = Math.min(1, Math.min(w, 1 - w) * 10).toFixed(3);
    } else scan.style.opacity = 0;
    // the grid and the travelling light fill the paper either side of the road once the truck is straight
    const fxOn = smooth(range(s, 4.7, 5.25));
    // the panels only show once the camera has settled, so their width follows the final zoom (it changes only on resize,
    // not every frame of the zoom, which would resize their grid canvases each frame)
    const road = ((F.RH + 28) * k * sc * zEnd).toFixed(0) + 'px';
    if (road !== lastRoad) { lastRoad = road; air.style.setProperty('--road-half', road); }
    const fxKey = fxOn.toFixed(3);
    if (fxKey !== lastFx) { lastFx = fxKey; fxs.forEach((el) => { el.style.opacity = fxKey; el.style.visibility = fxOn < 0.005 ? 'hidden' : 'visible'; }); }

    panels.forEach((el) => {
      if (+el.dataset.saPanel === 0) panelAt(el, s, 0, 1.95, 0.25);
      else panelAt(el, s, 5.35, 99, 0.35);
    });
  }

  // the clear band between the stacked copy panels on a phone: the truck is fitted inside it, never under the text
  const STACK = matchMedia('(max-width: 767px)'), panelTop = air.querySelector('.sa-panel--l'), panelBot = air.querySelector('.sa-panel--r');
  let bandKey = '', bandVal = null;
  const stackedBand = () => {
    if (!STACK.matches) return null;
    const H = stage.clientHeight, key = H + ':' + panelTop.offsetHeight + ':' + panelBot.offsetHeight + ':' + stage.clientWidth;
    if (key !== bandKey) {
      bandKey = key;
      const gap = 14, t = panelTop.offsetTop + panelTop.offsetHeight + gap, b = panelBot.offsetTop - gap;
      bandVal = { h: Math.max(120, (b - t) * 0.96), mid: (t + b) / 2 };
    }
    return bandVal;
  };
  const f = follower((p) => render(p * TOTAL));
  sizeCanvas(); load();
  render(RM ? TOTAL : 0);
  window.__sa = (s) => f.hold(s / TOTAL);
  addEventListener('resize', () => { sizeCanvas(); load(); render(RM ? TOTAL : f.value * TOTAL); draw(lastF, true); });
  // the swing frames are drawn per theme: switching loads the other set
  document.addEventListener('sn:theme', () => { load(); warm(Math.max(0, Math.floor(wantF))); });

  const { gsap, ScrollTrigger } = window;
  if (!RM && gsap && ScrollTrigger) {
    const pinLen = () => innerHeight * (TOTAL - 1);
    ScrollTrigger.create({ trigger: air, start: 'top top', end: () => '+=' + pinLen(), pin: air.querySelector('[data-sa-pin]'), anticipatePin: 1, refreshPriority: 3 });
    ScrollTrigger.create({ trigger: air, start: 'top bottom', end: () => '+=' + (innerHeight + pinLen()), refreshPriority: 2, onUpdate: (st) => f.set(st.progress) });
    ScrollTrigger.sort(); ScrollTrigger.refresh();
  }
});

})();
