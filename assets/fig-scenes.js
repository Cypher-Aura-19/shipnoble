/* ================= SERVICE FIGURES · scripted scenes =================
   A scene figure has no single mover: the page (assets/service.js) hands each scene the scroll pose
   { i, here, h, s } and the scene places every moving part. s runs 0 → stops-1 (eased between stops),
   h is the hold progress at stop i. Everything is a pure function of the pose, so scrolling back plays it backwards. */
(() => {
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (v, a, b) => clamp((v - a) / (b - a));
const sm = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const easeIn = (t) => t * t * t;
const f = (v) => v.toFixed(2);
// hold progress of stop i, and the drive progress into stop i
const holdOf = (pose, i) => i < pose.i ? 1 : i === pose.i && pose.here ? pose.h : 0;
const driveOf = (pose, i) => clamp(pose.s - (i - 1));

window.FIG_SCENES = window.FIG_SCENES || {};
// the camera: frame a point (svg px) with a view width w, matching the panel's shape.
// The svg keeps its own viewBox and is moved by one GPU transform, so a pan reuses the painted tiles
// instead of repainting the whole drawing every frame (only a change of zoom repaints it).
const hostOf = (svg) => svg.parentElement;
const aspect = (svg) => { const h = hostOf(svg); return h.clientWidth / Math.max(1, h.clientHeight) || 1.6; };
const CAM_STYLE = [['position', 'absolute'], ['inset', 'auto'], ['left', '0'], ['top', '0'], ['margin', '0'], ['max-width', 'none'], ['transform-origin', '0 0'], ['overflow', 'visible']];
const view = (svg, cx, cy, w) => {
  const host = hostOf(svg), CW = host.clientWidth || 1, CH = host.clientHeight || 1;
  const layers = svg.__layers || [{ el: svg, tx: 0, ty: 0 }];
  if (!svg.__cam) {
    const vb = svg.viewBox.baseVal;
    svg.__cam = { x: vb.x, y: vb.y, t: '', s: 0, X: 0, Y: 0, timer: 0, wc: false };
    layers.forEach(({ el, box }) => CAM_STYLE.concat([['width', (box ? box.w : vb.width) + 'px'], ['height', (box ? box.h : vb.height) + 'px'], ['will-change', 'auto']]).forEach(([k, v]) => el.style.setProperty(k, v, 'important')));
  }
  const c = svg.__cam;
  // round the zoom so a camera at rest gives exactly the same transform (no repaint)
  const s = Math.round((CW / w) * 2000) / 2000, X = Math.round(CW / 2 - (cx - c.x) * s), Y = Math.round(CH / 2 - (cy - c.y) * s);
  const t = X + ',' + Y + ',' + s;
  if (t === c.t) return;
  // while the zoom changes, the GPU scales the painted tiles; once it settles the drawing repaints sharp
  if (c.s && s !== c.s) {
    if (!c.wc) { layers.forEach(({ el }) => el.style.setProperty('will-change', 'transform', 'important')); c.wc = true; }
    clearTimeout(c.timer);
    c.timer = setTimeout(() => { layers.forEach(({ el }) => el.style.setProperty('will-change', 'auto', 'important')); c.wc = false; }, 180);
  }
  Object.assign(c, { s, X, Y, t });
  layers.forEach((L) => place(svg, L));
};
// a value per stop, eased between stops by the continuous pose s
const along = (vals, s) => { const i = Math.min(vals.length - 2, Math.max(0, Math.floor(s))), t = s - i; return lerp(vals[i], vals[i + 1], sm(clamp(t))); };

/* ---------- E-commerce: one order across the fulfillment floor, into the van ---------- */
window.FIG_SCENES.ecom = (svg, F) => {
  const $ = (q) => svg.querySelector(q);
  const T = (x, y, z) => `translate(${f(x * F.kx)} ${f(y * F.ky + z * F.kz)})`;
  const glow = $('[data-screen-glow]'), dot = $('[data-screen-dot]'), slip = $('[data-slip]');
  const robot = $('[data-robot]'), lift = $('[data-lift]'), tote = $('[data-tote]'), item = $('[data-item]');
  const parcel = $('[data-parcel]'), flapL = $('[data-flap="l"]'), flapR = $('[data-flap="r"]'), tape = $('[data-tape]'), label = $('[data-label]');
  const head = $('[data-head]'), roll = $('[data-belt-roll]'), van = $('[data-van]');
  const spins = [...svg.querySelectorAll('[data-spin]')].map((g) => ({ g, c: g.dataset.c.split(' ').map(Number) }));
  const fl0 = flapL.getAttribute('transform'), fr0 = flapR.getAttribute('transform'), fc = flapL.dataset.c;
  const tapeLen = tape.getTotalLength(); tape.style.strokeDasharray = tapeLen;
  const BELT_END = F.CHUTE.x0, IN_VAN = F.CHUTE.x1 + 6;

  const drive = (pose) => {
    const H = (i) => holdOf(pose, i), D = (i) => driveOf(pose, i);
    // the camera rides along with the order, close enough to read every part
    const r = aspect(svg);
    const fx0 = along([14, 40, 90, 150, 206], pose.s) + 14 * sm(range(H(4), 0.2, 1));
    // the view keeps the floor clear of the step rail below and the roof under the title above
    const vw = Math.max(84 * F.kx, 58 * Math.abs(F.kz) * r), half = vw / 2 / F.kx;
    view(svg, F.o[0] + clamp(fx0, -160 + half, 330 - half) * F.kx, F.o[1] + 19 * F.kz, vw);

    // ORDER: the screen lights, the order dot appears, a slip prints
    const h0 = H(0);
    glow.style.opacity = f(sm(range(h0, 0, 0.3)) * 0.9);
    dot.style.opacity = f(sm(range(h0, 0.15, 0.35)));
    slip.setAttribute('transform', T(5.4 * sm(range(h0, 0.35, 0.85)), 0, 0));

    // the robot: out to the rack, lift the tote off its shelf, down, over to the belt, home after packing
    const h1 = H(1), h2 = H(2);
    let rx = lerp(F.HOME_X, F.PICK_X, sm(D(1)));
    rx = lerp(rx, F.HANDOFF_X, sm(D(2)));
    rx = lerp(rx, F.HOME_X + 4, sm(D(3)));
    let lz = lerp(0, F.PICK_Z - 0.8, sm(range(h1, 0, 0.3)));
    lz = lerp(lz, F.BELT_Z - 0.8, sm(range(h1, 0.6, 0.95)));
    lz = lerp(lz, 0, sm(D(3)));
    robot.setAttribute('transform', T(rx, 0, 0));
    lift.setAttribute('transform', T(0, 0, lz));

    // the tote: on its shelf, pulled forward onto the lift, then carried
    const pull = sm(range(h1, 0.33, 0.55));
    const onLift = h1 >= 0.33;
    const ty = lerp(0, 12, pull), tx = onLift ? rx : F.PICK_X, tz = onLift ? lz + 0.8 : F.PICK_Z;
    tote.setAttribute('transform', T(tx, ty, tz));

    // the item: in the tote, then lifted over into the box on the belt, then it rides inside the parcel
    const hop = sm(range(h2, 0.15, 0.5));
    const pDrive3 = sm(D(3)), d4 = D(4), pBelt = sm(range(d4, 0, 0.72)), pChute = sm(range(d4, 0.72, 1));
    const vanX = 150 * easeIn(range(H(4), 0.12, 1));
    let px = lerp(F.PACK_X, F.LABEL_X, pDrive3);
    px = lerp(px, BELT_END, pBelt);
    let pz = F.BELT_Z;
    if (pChute > 0) { px = lerp(BELT_END, IN_VAN, pChute); pz = lerp(F.BELT_Z, F.CHUTE.z1, pChute); }
    px += vanX;
    const pyw = 0;
    if (hop <= 0) item.setAttribute('transform', T(tx, ty - 20 + 0, tz + 0.5));
    else if (hop < 1) {
      const sx = rx, sy = -8, sz = lz + 1.3, ex = F.PACK_X, ez = F.BELT_Z + 0.4;
      item.setAttribute('transform', T(lerp(sx, ex, hop), lerp(sy, pyw, hop), lerp(sz, ez, hop) + 9 * 4 * hop * (1 - hop)));
    } else item.setAttribute('transform', T(px, pyw, pz + 0.4));
    item.style.opacity = d4 >= 1 && H(4) > 0.2 ? 0 : 1;

    // the parcel: the box opens on the belt, flaps fold, tape runs over, a label is stamped, then out to the van
    parcel.style.opacity = f(sm(range(h2, 0, 0.14)));
    parcel.setAttribute('transform', T(px, 0, pz));
    flapL.setAttribute('transform', `${fl0} rotate(${f(90 * sm(range(h2, 0.55, 0.72)))} ${fc})`);
    flapR.setAttribute('transform', `${fr0} rotate(${f(-90 * sm(range(h2, 0.62, 0.8)))} ${fc})`);
    tape.style.strokeDashoffset = f(tapeLen * (1 - sm(range(h2, 0.8, 0.97))));
    const h3 = H(3);
    label.style.opacity = f(sm(range(h3, 0.34, 0.42)));

    // the label printer head comes down onto the box and back up
    const hz = 19 - 4.4 * sm(range(h3, 0, 0.34)) * (1 - sm(range(h3, 0.5, 0.85)));
    head.setAttribute('transform', T(0, 0, hz));

    // the belt runs while the parcel rides it
    roll.style.strokeDashoffset = f(-(px - vanX) * F.kx);

    // SHIP: the van pulls away, its wheels turning
    van.setAttribute('transform', T(vanX, 0, 0));
    spins.forEach(({ g, c }) => g.setAttribute('transform', `rotate(${f(vanX / 3.6 * 57.2958)} ${c[0]} ${c[1]})`));
  };
  drive.ownsView = true;
  return drive;
};

/* ---------- Logistics Management System: one order through the system, seen from above ---------- */
window.FIG_SCENES.lms = (svg, F) => {
  const $ = (q) => svg.querySelector(q);
  const card = $('[data-order-card]'), bol = $('[data-bol-card]'), pulse = $('[data-pulse]'), trail = $('[data-sync-trail]');
  const roof = $('[data-roof]'), grad = $('[data-wipe]'), tag = $('[data-count-tag]'), count = $('[data-count]');
  const slot = $('[data-slot]'), pallet = $('[data-pallet]'), route = $('[data-route]'), van = $('[data-van]');
  const sign = $('[data-sign]'), check = $('[data-check]');
  const tl = trail.getTotalLength(), rl = route.getTotalLength(), sl = sign.getTotalLength();
  trail.style.strokeDasharray = tl; route.style.strokeDasharray = rl; sign.style.strokeDasharray = sl;
  const vo = van.dataset.o.split(' ').map(Number);
  const pop = (el, t) => { el.style.opacity = f(t); el.firstElementChild.setAttribute('transform', `scale(${f(0.86 + 0.14 * t)})`); };
  let lastN = -1;
  const W2 = (x, y) => [F.o[0] + x * F.k, F.o[1] + y * F.k];
  const drive = (pose) => {
    const H = (i) => holdOf(pose, i), D = (i) => driveOf(pose, i);
    // the camera: store and warehouse, the warehouse close up, the bay, the van's run, the door
    const vp = route.getPointAtLength(route.getTotalLength() * (0.6 * sm(range(H(3), 0.3, 1)) + 0.4 * sm(D(4))));
    // each stop framed by height, so it sits in the clear band between the title and the step rail
    const foc = [[-62, -22], [0, -10], [4, -5], [62, 22], [108, -6]], hv = [96, 84, 64, 88, 96];
    const cxs = foc.map(([x]) => F.o[0] + x * F.k), cys = foc.map(([, y]) => F.o[1] + y * F.k);
    const r = aspect(svg), ws = hv.map((v) => v * r);
    const fs = pose.s >= 3 ? 3 + clamp(pose.s - 3) : pose.s;
    const vwk = along(ws, fs) * F.k, halfx = vwk / 2;
    view(svg, clamp(along(cxs, fs), F.o[0] - 320 * F.k + halfx, F.o[0] + 320 * F.k - halfx), along(cys, fs), vwk);
    // SYNC: the order appears over the store and its pulse runs to the warehouse
    const h0 = H(0), run = sm(range(h0, 0.22, 0.88));
    pop(card, sm(range(h0, 0, 0.22)) * (1 - sm(range(H(1), 0, 0.2))));
    const pt = trail.getPointAtLength(tl * run);
    pulse.setAttribute('transform', `translate(${f(pt.x)} ${f(pt.y)})`);
    pulse.style.opacity = f(run > 0 && run < 1 ? 1 : run >= 1 ? 1 - sm(range(h0, 0.88, 1)) : 0);
    trail.style.strokeDashoffset = f(tl * (1 - run));
    trail.style.opacity = f(1 - sm(range(H(1), 0.1, 0.4)));
    // STOCK: the roof peels back left to right, the count ticks up
    const h1 = H(1), w = sm(range(h1, 0, 0.55));
    const x = lerp(F.wipe[0] - 60, F.wipe[1] + 60, w);
    grad.setAttribute('x1', f(x)); grad.setAttribute('x2', f(x + 60));
    // the mask only exists while the roof is peeling: a whole roof or no roof costs nothing to draw
    const wipeMode = w <= 0 ? 'on' : w >= 1 ? 'off' : 'mid';
    if (wipeMode !== roof.dataset.mode) {
      roof.dataset.mode = wipeMode;
      if (wipeMode === 'mid') roof.setAttribute('mask', 'url(#ls-wipe)'); else roof.removeAttribute('mask');
      roof.style.display = wipeMode === 'off' ? 'none' : '';
    }
    tag.style.opacity = f(sm(range(h1, 0.35, 0.5)));
    const n = Math.round(F.count * sm(range(h1, 0.45, 0.95)));
    if (n !== lastN) { count.textContent = n.toLocaleString('en-US'); lastN = n; }
    // SLOT: the bay lights up, a pallet slides in from the aisle
    const h2 = H(2);
    slot.style.opacity = f(sm(range(h2, 0, 0.2)));
    const s2 = sm(range(h2, 0.28, 0.78));
    pallet.style.opacity = f(sm(range(h2, 0.15, 0.28)));
    pallet.setAttribute('transform', `translate(${f(lerp(F.aisle[0], F.slot[0], s2) - F.o[0])} ${f(lerp(F.aisle[1], F.slot[1], s2) - F.o[1])})`);
    // FLEET: the route draws ahead, the van follows it to the customer
    const h3 = H(3);
    route.style.strokeDashoffset = f(rl * (1 - sm(range(h3, 0, 0.32))));
    const u = 0.6 * sm(range(h3, 0.3, 1)) + 0.4 * sm(D(4));
    // like a real vehicle: the front wheels lead on the route, the rear axle follows behind; the body sits between
    const L = 7 * F.k, at = (d) => route.getPointAtLength(clamp(d, 0, rl));
    const fr = at(rl * u + L), rr = at(rl * u - L);
    const p = { x: (fr.x + rr.x) / 2, y: (fr.y + rr.y) / 2 }, ang = Math.atan2(fr.y - rr.y, fr.x - rr.x) * 57.2958;
    van.style.opacity = f(sm(range(h3, 0, 0.12)));
    van.setAttribute('transform', `translate(${f(p.x - vo[0])} ${f(p.y - vo[1])}) rotate(${f(ang)} ${vo[0]} ${vo[1]})`);
    // BOL: the bill of lading at the door, signed and checked
    const h4 = H(4);
    pop(bol, sm(range(h4, 0, 0.22)));
    sign.style.strokeDashoffset = f(sl * (1 - sm(range(h4, 0.28, 0.75))));
    check.style.opacity = f(sm(range(h4, 0.75, 0.88)));
  };
  drive.ownsView = true;
  return drive;
};

/* ---------- Wine & spirits: one case from the store's counter to a signed delivery ---------- */
window.FIG_SCENES.wine = (svg, F) => {
  const $ = (q) => svg.querySelector(q);
  const T = (x, y, z) => `translate(${f(x * F.kx)} ${f(y * F.ky + z * F.kz)})`;
  const van = $('[data-van]'), cas = $('[data-case]'), div = $('[data-dividers]'), lid = $('[data-lid]'), route = $('[data-route]');
  const frame = $('[data-frame]'), flash = $('[data-flash]'), photo = $('[data-photo]'), signC = $('[data-sign-card]'), sign = $('[data-sign]'), check = $('[data-check]');
  const spins = [...svg.querySelectorAll('[data-spin]')].map((g) => ({ g, c: g.dataset.c.split(' ').map(Number) }));
  const rl = route.getTotalLength(), sl = sign.getTotalLength();
  route.style.strokeDasharray = rl; sign.style.strokeDasharray = sl;
  const pop = (el, t) => { el.style.opacity = f(t); el.firstElementChild.setAttribute('transform', `scale(${f(0.86 + 0.14 * t)})`); };
  const V = F.VAN, C = F.CRATE, crateX = C.x, inCrate = V.floor + 1.1;
  const drive = (pose) => {
    const H = (i) => holdOf(pose, i), D = (i) => driveOf(pose, i);
    const h0 = H(0), h1 = H(1), h3 = H(3), h4 = H(4);
    // the van: parked at the store, then down the street to the house
    const run = 0.3 * sm(D(2)) + 0.55 * sm(H(2)) + 0.15 * sm(D(3));
    const dx = F.PARK_DX * sm(clamp(run));
    van.setAttribute('transform', T(dx, 0, 0));
    spins.forEach(({ g, c }) => g.setAttribute('transform', `rotate(${f(dx / 3 * 57.2958)} ${c[0]} ${c[1]})`));
    route.style.strokeDashoffset = f(rl * (1 - clamp(run * 1.25 + (run > 0 ? 0.05 : 0))));
    route.style.opacity = f(1 - sm(range(h3, 0, 0.3)));
    // the case, in world units: along the rollers, down the ramp, into the van, over the crate wall and down into the foam
    let x = lerp(10, F.COUNTER.x1 - 1, sm(range(h0, 0.1, 0.6))), z = F.COUNTER.z, y = 0;
    if (h0 > 0.6) { const t = sm(range(h0, 0.6, 0.9)); x = lerp(F.COUNTER.x1 - 1, V.x0 + 6, t); z = lerp(F.COUNTER.z - 0.2, V.floor, t); }
    const d1 = sm(D(1));
    if (d1 > 0) { x = lerp(V.x0 + 6, crateX, d1); z = lerp(V.floor, 12, d1) + 2.4 * 4 * d1 * (1 - d1) * 0.4; }
    if (d1 >= 1) { z = lerp(12, inCrate, sm(range(h1, 0, 0.35))); }
    // at the house: out of the crate and over to the porch
    const hop = sm(range(h3, 0.08, 0.4));
    let wx = x + dx, wy = y, wz = z;
    if (h3 > 0.04) {
      const sx = crateX + dx, sz = inCrate + 4 * sm(range(h3, 0.02, 0.1));
      wx = lerp(sx, F.PORCH.x, hop); wy = lerp(0, F.PORCH.y, hop); wz = lerp(sz, F.PORCH.z, hop) + 3 * hop * (1 - hop);
    }
    cas.setAttribute('transform', T(wx - dx, wy, wz));
    div.style.opacity = f(sm(range(h1, 0.4, 0.55)));
    div.setAttribute("transform", T(0, 0, 6 * (1 - sm(range(h1, 0.4, 0.66)))));
    const lidIn = sm(range(h1, 0.7, 0.95)) * (1 - sm(range(h3, 0, 0.06)));
    lid.style.opacity = f(lidIn);
    lid.setAttribute('transform', T(0, 0, C.h + V.floor + 0.5 + 6 * (1 - sm(range(h1, 0.7, 0.95)))));
    // PHOTO: the frame closes on the case, a flash, a photo card pinned above; SIGN: the card is signed
    const fr = sm(range(h3, 0.42, 0.56));
    frame.style.opacity = f(fr * (1 - sm(range(h3, 0.8, 0.95))));
    frame.setAttribute('transform', `translate(${frame.getAttribute('transform-origin').split(' ').map((v, i) => f(+v * (1 - (1.25 - 0.25 * fr)))).join(' ')}) scale(${f(1.25 - 0.25 * fr)})`);
    flash.style.opacity = f(Math.max(0, 1 - Math.abs(h3 - 0.6) / 0.06) * 0.85);
    pop(photo, sm(range(h3, 0.64, 0.82)) * (1 - sm(range(h4, 0, 0.18))));
    pop(signC, sm(range(h4, 0.12, 0.3)));
    sign.style.strokeDashoffset = f(sl * (1 - sm(range(h4, 0.32, 0.72))));
    check.style.opacity = f(sm(range(h4, 0.74, 0.86)));
    // the camera: the counter, the crate, the van on its run, the porch
    const r = aspect(svg);
    const vanC = V.x0 + 22 + dx;
    const fxs = [18, 50, vanC, 234, 234], fzs = [13, 13, 13, 10, 10], hvs = [42, 38, 50, 36, 36];
    const s = pose.s, cx = along(fxs, s), cz = along(fzs, s), hv = along(hvs, s);
    view(svg, F.o[0] + cx * F.kx, F.o[1] + cz * F.kz, hv * Math.abs(F.kz) * r);
  };
  drive.ownsView = true;
  return drive;
};

/* ---------- Retail distribution: one pallet from the rack to the store shelf ---------- */
window.FIG_SCENES.retail = (svg, F) => {
  const $ = (q) => svg.querySelector(q);
  const T = (x, y, z) => `translate(${f(x * F.kx)} ${f(y * F.ky + z * F.kz)})`;
  const glow = $('[data-screen-glow]'), trail = $('[data-trail]'), pulse = $('[data-pulse]');
  const crane = $('[data-crane]'), shuttle = $('[data-shuttle]'), carriage = $('[data-carriage]'), pal = $('[data-pallet]'), truck = $('[data-truck]');
  const filmRect = $('[data-film-rect]'), filmLines = $('[data-film-lines]'), roll = $('[data-belt-roll]');
  const cartons = [...svg.querySelectorAll('[data-carton]')].map((el) => ({ el, base: el.getAttribute('transform') }));
  const fills = [...svg.querySelectorAll('[data-fill]')];
  const spins = [...svg.querySelectorAll('[data-spin]')].map((g) => ({ g, c: g.dataset.c.split(' ').map(Number) }));
  const tl = trail.getTotalLength(); trail.style.strokeDasharray = tl;
  const P = F.PAL, C = F.CONV, T0 = F.TRUCK;
  const fBot = F.o[1] + P.base * F.kz, fTop = F.o[1] + (P.base + P.load + 0.2) * F.kz;
  const pickX = F.PICK.x - 7.7;
  const drive = (pose) => {
    const H = (i) => holdOf(pose, i), D = (i) => driveOf(pose, i);
    const h0 = H(0), h1 = H(1), h2 = H(2), h3 = H(3), h4 = H(4);
    // EDI: the order pulse runs along the wall into the terminal, the screen lights
    const run = sm(range(h0, 0.05, 0.8)), pt = trail.getPointAtLength(tl * run);
    trail.style.strokeDashoffset = f(tl * (1 - run));
    trail.style.opacity = f(1 - sm(range(h1, 0, 0.25)));
    pulse.setAttribute('transform', `translate(${f(pt.x)} ${f(pt.y)})`);
    pulse.style.opacity = f(run > 0 && run < 1 ? 1 : 0);
    glow.style.opacity = f(sm(range(h0, 0.75, 0.95)) * 0.9 * (1 - sm(range(h1, 0.2, 0.5))));
    // PICK: the crane rides to the bay, the shuttle climbs, the pallet slides on, down, and over to the conveyor
    let cx = lerp(F.CRANE.rest, pickX, sm(range(h1, 0, 0.3)));
    cx = lerp(cx, 62.3, sm(range(h1, 0.7, 0.95)));
    let sz = lerp(0, F.PICK.z, sm(range(h1, 0.1, 0.42)));
    sz = lerp(sz, C.z, sm(range(h1, 0.6, 0.86)));
    crane.setAttribute('transform', T(cx, 0, 0));
    shuttle.setAttribute('transform', T(0, 0, sz));
    // the pallet, in world units
    let px = F.PICK.x, py = -16, pz = F.PICK.z;
    if (h1 >= 0.45) { py = lerp(-16, -4, sm(range(h1, 0.45, 0.6))); px = cx + 7.7; pz = sz; }
    const d2 = sm(D(2)), d3 = sm(D(3));
    if (d2 > 0) { px = lerp(70, F.WRAP_X, d2); py = lerp(-4, 0, d2); pz = C.z; }
    if (d3 > 0) { px = lerp(F.WRAP_X, T0.x0 + 8, d3); pz = lerp(C.z, T0.floor, sm(range(d3, 0.8, 1))); }
    // DC: the truck pulls out past the store; STORE: it backs into the store's dock
    const dx = F.BACK_DX * sm(range(h3, 0.15, 1));
    truck.setAttribute('transform', T(dx, 0, 0));
    spins.forEach(({ g, c }) => g.setAttribute('transform', `rotate(${f(dx / 3.4 * 57.2958)} ${c[0]} ${c[1]})`));
    if (d3 >= 1) px = T0.x0 + 8 + dx;
    // in the store: out of the truck, down to the back-room floor
    if (h4 > 0) {
      // the tail lift lowers it to the kerb, then it rolls in through the back-room door
      const down = sm(range(h4, 0, 0.16)), inn = sm(range(h4, 0.18, 0.34));
      px = lerp(T0.x0 - 7.5 + dx, F.STORE.x1 - 22, inn); pz = lerp(T0.floor, 0.4, down); py = lerp(0, -26, inn);
    }
    pal.setAttribute('transform', T(px, py, pz));
    roll.style.strokeDashoffset = f(-(d2 * 30 + d3 * 70) * F.kx);
    // WRAP: the carriage climbs with the film, the pallet turns under it
    const w = sm(range(h2, 0.08, 0.85));
    carriage.setAttribute('transform', T(0, 0, C.z + 0.8 + w * (P.load - 1)));
    const top = lerp(fBot, fTop, w);
    filmRect.setAttribute('y', f(top)); filmRect.setAttribute('height', f(Math.max(0, fBot - top)));
    filmLines.style.strokeDashoffset = f(-h2 * 120);
    // STORE: each carton hops to the shelves and is unpacked, the empty slots fill row by row
    cartons.forEach(({ el, base }, i) => {
      const t = sm(range(h4, 0.34 + i * 0.07, 0.48 + i * 0.07));
      const tx = (F.STORE.x0 + 26 - px) * t, tz = (6 + (i % 3) * 7 - pz) * t;
      el.setAttribute('transform', `${base} translate(${f(tx * F.kx)} ${f(tz * F.kz - 8 * F.ky * t)})`);
      el.style.opacity = f(1 - sm(range(h4, 0.44 + i * 0.07, 0.5 + i * 0.07)));
    });
    const n = fills.length;
    fills.forEach((el, i) => { el.style.opacity = f(sm(range(h4, 0.4 + (i / n) * 0.5, 0.44 + (i / n) * 0.5))); });
    // the camera: the terminal, the rack, the wrapper, the truck on its run, the store
    const r = aspect(svg);
    const tc = T0.x0 + 40 + dx;
    const fxs = [-40, 22, F.WRAP_X, tc, F.STORE.x0 + 60], fzs = [20, 24, 14, 16, 15], hvs = [50, 58, 40, 56, 50];
    const s = pose.s;
    view(svg, F.o[0] + along(fxs, s) * F.kx, F.o[1] + along(fzs, s) * F.kz, along(hvs, s) * Math.abs(F.kz) * r);
  };
  drive.ownsView = true;
  return drive;
};
/* ---------- Warehousing: one pallet in, one branded box out, through one warehouse ---------- */
window.FIG_SCENES.warehouse = (svg, F) => {
  const $ = (q) => svg.querySelector(q);
  const T = (x, y, z) => `translate(${f(x * F.kx)} ${f(y * F.ky + z * F.kz)})`;
  const doorRect = $('[data-door-rect]'), dockRect = $('[data-dock-rect]');
  const doorH = +doorRect.dataset.h, dockH = +dockRect.dataset.h, doorY = +doorRect.getAttribute('y'), dockY = +dockRect.getAttribute('y');
  const a03 = $('[data-a03]'), inbound = $('[data-inbound]'), scan = $('[data-scan]'), count = $('[data-count]'), glow = $('[data-screen-glow]');
  const slot = (n) => $(`[data-slot="${n}"]`);
  const sA = slot('a03'), sC = slot('c06'), sZ = slot('cz02');
  const tt = $('[data-tt]'), lift = $('[data-tt-lift]'), base = $('[data-pickbase]');
  const picks = [...svg.querySelectorAll('[data-pick]')];
  const parcel = $('[data-box]'), flapL = $('[data-flap="l"]'), flapR = $('[data-flap="r"]'), tape = $('[data-tape]'), label = $('[data-label]');
  const roll = $('[data-belt-roll]'), truck = $('[data-truck]'), strips = [...svg.querySelectorAll('[data-strips]')], tdot = $('[data-temp-dot]');
  const spins = [...svg.querySelectorAll('[data-spin]')].map((g) => ({ g, c: g.dataset.c.split(' ').map(Number) }));
  const fc = (el) => el.dataset.c;
  const tapeLen = tape.getTotalLength(); tape.style.strokeDasharray = tapeLen;
  const S = F.STOPS, FK = F.FORK, PB = F.PAL.base, CH = 4;
  const ON_BASE = [[-2.9, 0, 0], [2.9, 0, 0], [0, 0, CH]];
  const SRC = [F.PICKS[0], F.PICKS[1], F.CHILL];
  const rise = (a, b, t) => lerp(a, b, sm(clamp(t)));
  let lastN = -1;
  const drive = (pose) => {
    const H = (i) => holdOf(pose, i), D = (i) => driveOf(pose, i);
    const h0 = H(0), h1 = H(1), h2 = H(2), h3 = H(3), h4 = H(4), d1 = D(1), d2 = D(2), d3 = D(3), d4 = D(4);

    // the turret truck, in world units: x along the aisle, zL the lift of its cab and forks
    let tx = rise(S.rest, F.INBOUND.x - FK, range(h0, 0.42, 0.56));
    tx = rise(tx, S.a03, range(h0, 0.62, 0.8));
    tx = rise(tx, S.c06, range(d1, 0.25, 1));
    tx = rise(tx, S.cz02, d2);
    tx = rise(tx, S.bench, d3);
    let zL = 1.4;
    zL = rise(zL, 3, range(h0, 0.56, 0.62));
    zL = rise(zL, F.A03.z, range(h0, 0.8, 0.9));
    zL = rise(zL, 0, range(d1, 0, 0.25));
    zL = rise(zL, F.C06.z, range(h1, 0, 0.22));
    zL = rise(zL, 2, range(h1, 0.8, 1));
    zL = rise(zL, 13, range(h2, 0, 0.22));
    zL = rise(zL, 2, range(h2, 0.76, 1));
    zL = rise(zL, 8, range(d3, 0.7, 1));
    zL = rise(zL, 2, range(d4, 0, 0.5));
    tt.setAttribute('transform', T(tx, 0, 0));
    lift.setAttribute('transform', T(0, 0, zL));
    const fx = tx + FK;

    // A-03: the receiving door rolls up, the pallet rolls in under the scan arch, the count ticks up, it is put away
    const up = sm(range(h0, 0, 0.12));
    doorRect.setAttribute('height', f(doorH * (1 - up)));
    doorRect.setAttribute('y', f(doorY + doorH * up));
    let px = F.INBOUND.x, py = rise(F.INBOUND.y0, 0, range(h0, 0.08, 0.4)), pz = 1.4;
    if (h0 >= 0.56) { px = fx; pz = zL; }
    if (h0 >= 0.9) { py = rise(0, -16, range(h0, 0.9, 1)); }
    if (h0 >= 1 && pose.s > 0.0001) { px = F.A03.x; py = -16; pz = F.A03.z; }
    inbound.style.opacity = f(sm(range(h0, 0.02, 0.12)) * (h0 >= 1 ? 0 : 1));
    a03.style.opacity = h0 >= 1 ? 1 : 0;
    inbound.setAttribute('transform', T(px, py, pz));
    const sc = range(h0, 0.16, 0.32);
    scan.style.opacity = f(sc > 0 && sc < 1 ? 1 : 0);
    scan.setAttribute('transform', T(0, 0, lerp(17.6, 1.6, sm(sc))));
    const n = Math.round(lerp(F.count[0], F.count[1], sm(range(h0, 0.3, 0.5))));
    if (n !== lastN) { count.textContent = n.toLocaleString('en-US'); lastN = n; }
    glow.style.opacity = f(Math.max(0, 1 - Math.abs(h0 - 0.42) / 0.14) * 0.9);
    sA.style.opacity = f(sm(range(h0, 0.86, 0.96)) * (1 - sm(range(d1, 0.3, 0.7))));

    // C-06: the forks take the empty pick pallet off the aisle floor and lift it level with the pick face
    const onForks = d1 >= 1;
    const bx = onForks ? fx : F.C06.x, bz = onForks ? zL : 0;
    base.setAttribute('transform', T(bx, 0, bz));
    sC.style.opacity = f(sm(range(h1, 0.12, 0.25)) * (1 - sm(range(h1, 0.72, 0.85))));
    sZ.style.opacity = f(sm(range(h2, 0.12, 0.25)) * (1 - sm(range(h2, 0.68, 0.8))));
    tdot.style.opacity = f(0.55 + 0.45 * Math.cos(pose.s * 14));

    // the cartons: hop onto the pick pallet (two at C-06, one at CZ-02), ride it, then hop into the box at PK-01
    const hops = [range(h1, 0.26, 0.52), range(h1, 0.42, 0.68), range(h2, 0.3, 0.6)];
    const packs = [range(h3, 0.12, 0.32), range(h3, 0.22, 0.42), range(h3, 0.32, 0.52)];
    picks.forEach((el, i) => {
      const s0 = SRC[i], [ox, , oz] = ON_BASE[i];
      const ex = bx + ox, ez = bz + PB + oz;
      let x = s0.x, y = s0.y, z = s0.z;
      const t = sm(hops[i]);
      if (t > 0) { x = lerp(s0.x, ex, t); y = lerp(s0.y, 0, t); z = lerp(s0.z, ez, t) + 5 * t * (1 - t); }
      const u = sm(packs[i]);
      if (u > 0) { x = lerp(ex, F.BOX_X + ox * 0.4, u); y = 0; z = lerp(ez, F.BENCH.z + 1 + oz * 0.2, u) + 9 * u * (1 - u); }
      el.setAttribute('transform', T(x, y, z));
      el.style.opacity = f(1 - sm(range(packs[i], 0.8, 1)));
    });

    // the strip curtains part a little as the truck goes through
    strips.forEach((el, i) => { const dx = Math.abs(fx - 4 - (i ? F.COLD.x1 : F.COLD.x0)); el.style.opacity = f(lerp(0.35, 1, sm(range(dx, 10, 22)))); });

    // PK-01: the box opens on the bench, the cartons drop in, flaps fold, tape runs over, the label goes on
    const boxIn = sm(range(h3, 0, 0.12));
    const bxp = lerp(F.BOX_X, F.TRUCK.x0 + 12, sm(d4));
    parcel.style.opacity = f(boxIn * (h4 > 0.02 ? 0 : 1));
    parcel.setAttribute('transform', T(bxp, 0, F.BENCH.z));
    const cL = fc(flapL), cR = fc(flapR);
    flapL.setAttribute('transform', `rotate(${f(-92 * (1 - sm(range(h3, 0.56, 0.68))))} ${cL})`);
    flapR.setAttribute('transform', `rotate(${f(92 * (1 - sm(range(h3, 0.62, 0.74))))} ${cR})`);
    tape.style.strokeDashoffset = f(tapeLen * (1 - sm(range(h3, 0.76, 0.88))));
    label.style.opacity = f(sm(range(h3, 0.9, 0.97)));
    roll.style.strokeDashoffset = f(-(bxp - F.BOX_X) * F.kx);

    // DOCK 1: the box rolls into the truck, the dock door rolls down, the truck pulls away
    const down = sm(range(h4, 0, 0.24));
    dockRect.setAttribute('height', f(dockH * down));
    const dx = 300 * easeIn(range(h4, 0.28, 1));
    truck.setAttribute('transform', T(dx, 0, 0));
    spins.forEach(({ g, c }) => g.setAttribute('transform', `rotate(${f(dx / 3.4 * 57.2958)} ${c[0]} ${c[1]})`));

    // the camera: receiving and the rack, the pick face, the cold room, the bench, the dock and the truck
    const r = aspect(svg);
    const fxs = [lerp(12, 34, sm(range(h0, 0.45, 0.85))), 84, 148, 212, 292 + 0.75 * dx];
    const fzs = [26, 23, 23, 14, 19], hvs = [56, 50, 52, 34, 46];
    const s = pose.s;
    view(svg, F.o[0] + along(fxs, s) * F.kx, F.o[1] + along(fzs, s) * F.kz, along(hvs, s) * Math.abs(F.kz) * r);
  };
  drive.ownsView = true;
  return drive;
};

/* ---------- B2B transportation: one shipment from one business to another, by road ---------- */
window.FIG_SCENES.b2b = (svg, F) => {
  const $ = (q) => svg.querySelector(q);
  const T = (x, y, z) => `translate(${f(x * F.kx)} ${f(y * F.ky + z * F.kz)})`;
  const truck = $('[data-truck]'), front = $('[data-truck-front]'), lift = $('[data-lift]'), lc = lift.dataset.c;
  const cRect = $('[data-curtain-rect]'), bunch = $('[data-bunch]');
  const CUR0 = +cRect.getAttribute('x'), CURW = +cRect.getAttribute('width');
  const ours = $('[data-ours]'), scan = $('[data-scan]'), jack = $('[data-jack]'), seal = $('[data-seal]');
  const rings = $('[data-rings]'), ringEls = [...svg.querySelectorAll('[data-ring]')], route = $('[data-route]');
  const card = $('[data-card]'), cardIn = $('[data-card-in]'), done = $('[data-done]'), dot = $('[data-dot]'), status = $('[data-status]'), chip = $('[data-chip]'), check = $('[data-check]');
  const spins = [...svg.querySelectorAll('[data-spin]')].map((g) => ({ g, c: g.dataset.c.split(' ').map(Number) }));
  const rl = route.getTotalLength(); route.style.strokeDasharray = rl;
  done.style.strokeDasharray = 192;
  const C = F.cur, FL = F.FL, HEEL = 6;                       // pallet centre sits 6 ahead of the jack's fork heel
  const ON_LIFT = -12.5, AT_DOOR = F.DOOR - HEEL, IN_SLOT = F.OUR - HEEL;
  const rise = (a, b, t) => lerp(a, b, sm(clamp(t)));
  let lastStatus = '';
  const drive = (pose) => {
    const H = (i) => holdOf(pose, i), D = (i) => driveOf(pose, i);
    const h0 = H(0), h1 = H(1), h2 = H(2), h3 = H(3), h4 = H(4);

    // the truck: parked at the shipper, then down the road to the customer, slowing to a stop at the door
    const u = 0.12 * D(2) + 0.33 * h2 + 0.12 * D(3) + 0.31 * h3 + 0.12 * D(4);
    const dx = F.DROP_DX * sm(clamp(u));
    truck.setAttribute('transform', T(dx, 0, 0));
    front.setAttribute('transform', T(dx, 0, 0));
    spins.forEach(({ g, c }) => g.setAttribute('transform', `rotate(${f(dx / 5 * 57.2958)} ${c[0]} ${c[1]})`));
    const rev = clamp((dx + 150) / F.DROP_DX);
    route.style.strokeDashoffset = f(rl * (1 - rev));
    route.style.opacity = f(sm(range(h1, 0.85, 1)) * (1 - sm(range(h4, 0, 0.2))));

    // the curtain: open for loading, closed for the road, open again at the customer
    const op = sm(range(h0, 0, 0.16)) * (1 - sm(range(h1, 0.28, 0.48))) + sm(range(h4, 0, 0.12));
    const edge = lerp(C.x0, C.x1 - 8, op);
    cRect.setAttribute('x', f(CUR0 + (edge - C.x0) * F.kx));
    cRect.setAttribute('width', f(Math.max(0, CURW - (edge - C.x0) * F.kx)));
    bunch.setAttribute('transform', T(edge, 0, 0));
    bunch.style.opacity = op > 0.004 ? 1 : 0;

    // the tail lift: unfold at deck height, down to the street, up with the load; folded shut for the road
    let lz = FL, fold = 90;
    fold = rise(fold, 0, range(h0, 0.06, 0.2)); lz = rise(lz, 0, range(h0, 0.2, 0.3)); lz = rise(lz, FL, range(h0, 0.44, 0.56));
    lz = rise(lz, 0, range(h1, 0, 0.14)); lz = rise(lz, FL, range(h1, 0.3, 0.4)); fold = rise(fold, 90, range(h1, 0.4, 0.52));
    fold = rise(fold, 0, range(h4, 0.05, 0.16)); lz = rise(lz, 0, range(h4, 0.16, 0.24)); lz = rise(lz, FL, range(h4, 0.38, 0.48)); lz = rise(lz, 0, range(h4, 0.74, 0.82));
    lift.setAttribute('transform', `${T(0, 0, lz - FL)} rotate(${f(fold)} ${lc})`);

    // the jack and the shipment, in world units relative to the trailer's rear (R)
    let R = 0, jx = AT_DOOR, jy = -26, jz = 0, ja = 0, px = F.DOOR, py = -26, pz = 0, pa = 0, raise = 0.6;
    if (h4 > 0) {
      // DROP: out of the customer's door, up the lift, under the pallet, back down and in through the door
      R = F.DROP_DX;
      ja = sm(range(h4, 0.18, 0.24)) * (1 - sm(range(h4, 0.92, 0.98)));
      jy = rise(-26, 0, range(h4, 0.18, 0.3)); jy = rise(jy, -26, range(h4, 0.88, 0.98));
      jx = rise(AT_DOOR, ON_LIFT, range(h4, 0.3, 0.38)); jx = rise(jx, IN_SLOT, range(h4, 0.48, 0.6));
      jx = rise(jx, ON_LIFT, range(h4, 0.63, 0.74)); jx = rise(jx, AT_DOOR, range(h4, 0.82, 0.88));
      jz = h4 >= 0.38 && h4 < 0.82 ? lz : 0;
      if (h4 < 0.6) { px = F.OUR; py = 0; pz = FL; }
      else { raise = 0.6 * sm(range(h4, 0.6, 0.63)); px = jx + HEEL; py = jy; pz = jz + raise; }
      pa = 1 - sm(range(h4, 0.9, 0.98));
    } else if (pose.s >= 1 || h1 > 0) {
      // in the trailer from SCAN on; the jack heads back in through the shipper's door
      px = F.OUR + dx; py = 0; pz = FL; pa = 1;
      jx = rise(ON_LIFT, AT_DOOR, range(h1, 0.1, 0.18)); jy = rise(0, -26, range(h1, 0.18, 0.3)); jz = h1 < 0.1 ? lz : 0;
      ja = 1 - sm(range(h1, 0.24, 0.3));
    } else {
      // PICKUP: out of the shipper's door, onto the lift, up, into the last free slot; the jack backs out to the lift
      ja = pa = sm(range(h0, 0.18, 0.26));
      jy = py = rise(-26, 0, range(h0, 0.18, 0.34));
      jx = rise(AT_DOOR, ON_LIFT, range(h0, 0.34, 0.44));
      jz = h0 >= 0.44 ? lz : 0;
      jx = rise(jx, IN_SLOT, range(h0, 0.56, 0.74));
      if (h0 >= 0.56) jz = FL;
      raise = 0.6 * (1 - sm(range(h0, 0.74, 0.78)));
      px = jx + HEEL; pz = jz + raise;
      jx = rise(jx, ON_LIFT, range(h0, 0.78, 0.92));
    }
    jack.style.opacity = f(ja);
    jack.setAttribute('transform', T(R + jx, jy, jz));
    ours.style.opacity = f(pa);
    ours.setAttribute('transform', T((h4 > 0 ? R : 0) + px, py, pz));

    // SCAN: the label is read through the open curtain, the seal clips on, the GPS unit starts pulsing
    const sc = range(h1, 0.04, 0.2);
    scan.style.opacity = f(sc > 0 && sc < 1 ? 1 : 0);
    scan.setAttribute('transform', T(F.OUR - 3 + dx, 0, FL + lerp(10, 4.6, sm(sc))));
    const sp = sm(range(h1, 0.56, 0.66)) * (1 - sm(range(h4, 0, 0.05)));
    seal.style.opacity = f(sp);
    seal.style.transform = `scale(${f(0.6 + 0.4 * sp)})`;
    const live = sm(range(h1, 0.66, 0.76)) * (1 - sm(range(h4, 0.9, 1)));
    rings.style.opacity = f(live);
    ringEls.forEach((el, i) => { const t = ((pose.s * 1.8 + i / 3) % 1 + 1) % 1; el.setAttribute('r', f(4 + 30 * t)); el.style.opacity = f(1 - t); });

    // the camera: the shipper's door, the whole truck, riding along the road, the customer's door
    const r = aspect(svg);
    const fxs = [8, 72, dx + 84, dx + 84, F.DROP_DX + 10], fzs = [19, 25, 27, 27, 19], hvs = [52, 64, 74, 74, 52];
    const s = pose.s, hv = along(hvs, s), cx = F.o[0] + along(fxs, s) * F.kx, cy = F.o[1] + along(fzs, s) * F.kz, vw = hv * Math.abs(F.kz) * r;
    view(svg, cx, cy, vw);

    // TRACK: the customer's card, pinned to the top right of the view; DROP: delivered
    const vh = vw / r, px2 = vw / Math.max(1, hostOf(svg).clientWidth);
    const pop = sm(range(h3, 0, 0.16));
    card.style.opacity = f(pop);
    card.setAttribute('transform', `translate(${f(cx + vw / 2 - (236 + 20) * px2)} ${f(cy - vh / 2 + 20 * px2)}) scale(${f(px2)})`);
    cardIn.setAttribute('transform', `translate(118 59) scale(${f(0.9 + 0.1 * pop)}) translate(-118 -59)`);
    const pr = clamp(dx / F.DROP_DX);
    done.style.strokeDashoffset = f(192 * (1 - pr));
    dot.setAttribute('transform', `translate(${f(192 * pr)} 0)`);
    const delivered = h4 > 0.9;
    const st = delivered ? 'Delivered' : 'In transit';
    if (st !== lastStatus) { status.textContent = st; chip.classList.toggle('is-done', delivered); lastStatus = st; }
    check.style.opacity = f(sm(range(h4, 0.9, 0.98)));
  };
  drive.ownsView = true;
  return drive;
};

/* ---------- layers: each scene is split into stacked svgs that the GPU moves ----------
   The scene is run through its poses once. Parts the driver never touches are painted once into static layers;
   a part the driver only slides (its own transform is always a plain translate) gets a layer of its own, and the
   slide becomes a GPU offset instead of a repaint; everything else stays live. Layers keep the painting order. */
const TRANSLATE = /^\s*translate\(\s*(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)\s*\)\s*$/;
const layerize = (svg, drive, F) => {
  let root = svg;
  const kids = () => [...root.children].filter((n) => !/^(defs|style|title|desc|clippath)$/i.test(n.tagName));
  while (kids().length === 1 && kids()[0].tagName.toLowerCase() === 'g') root = kids()[0];
  const list = kids();
  if (list.length < 2) return;
  const touched = new Set(), slid = new Map(list.map((el) => [el, 0]));
  const mo = new MutationObserver(() => {});
  mo.observe(svg, { attributes: true, subtree: true, childList: true, characterData: true });
  const look = () => list.forEach((el) => { const t = el.getAttribute('transform'); if (t && slid.get(el) !== -1) slid.set(el, TRANSLATE.test(t) ? 1 : -1); });
  const n = (F.xs || [0, 1, 2, 3, 4]).length;
  for (let i = 0; i < n; i++) {
    if (i > 0) [0.3, 0.7].forEach((t) => { drive({ i, here: false, h: 0, s: i - 1 + t }); look(); });
    [0, 0.3, 0.6, 1].forEach((h) => { drive({ i, here: true, h, s: i }); look(); });
  }
  const own = new Map();
  mo.takeRecords().forEach((r) => {
    let el = r.target;
    if (el.parentNode === root && r.type === 'attributes' && r.attributeName === 'transform') own.set(el, true);
    while (el && el.parentNode !== root) el = el.parentNode;
    if (el) touched.add(el);
  });
  mo.disconnect();
  // runs of parts that share a layer, in painting order
  const kind = (el) => !touched.has(el) ? 'static' : own.get(el) && slid.get(el) === 1 ? 'rigid' : 'live';
  const runs = [];
  list.forEach((el) => { const k = kind(el), last = runs[runs.length - 1]; if (k !== 'rigid' && last && last.kind === k) last.els.push(el); else runs.push({ kind: k, els: [el] }); });
  const chain = []; for (let el = root; el !== svg; el = el.parentNode) chain.unshift(el);
  const layers = runs.map((run, idx) => {
    const isTop = idx === runs.length - 1;
    const host = isTop ? svg : svg.cloneNode(false);
    if (!isTop) { host.removeAttribute('role'); host.removeAttribute('aria-label'); host.setAttribute('aria-hidden', 'true'); }
    let into = host;
    if (!isTop) for (const w of chain) { const c = w.cloneNode(false); c.removeAttribute('data-fit'); into.appendChild(c); into = c; }
    if (!isTop) run.els.forEach((el) => into.appendChild(el));
    const L = { el: host, tx: 0, ty: 0 };
    if (run.kind === 'rigid') {
      // the slide moves the whole layer on the GPU; the group itself stays put
      const g = run.els[0], set = g.setAttribute.bind(g);
      const m = TRANSLATE.exec(g.getAttribute('transform') || '');
      if (m) { L.tx = +m[1]; L.ty = +m[2]; }
      g.removeAttribute('transform');
      g.setAttribute = (name, val) => {
        if (name === 'transform') { const q = TRANSLATE.exec(val); if (q) { if (+q[1] !== L.tx || +q[2] !== L.ty) { L.tx = +q[1]; L.ty = +q[2]; (svg.__layers || []).forEach((M) => { if (M === L || M.parent === L) place(svg, M); }); } return; } }
        set(name, val);
      };
    }
    return L;
  });
  // spinning wheels: each rim turns on its own small layer, riding on its truck's layer
  const ROT = /^\s*rotate\(\s*(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)[\s,]+(-?[\d.e+-]+)\s*\)\s*$/;
  for (let i = layers.length - 1; i >= 0; i--) {
    const P = layers[i];
    const spins = [...P.el.querySelectorAll('[data-spin], [data-layer]')];
    spins.reverse().forEach((g) => {
      const host = svg.cloneNode(false);
      host.removeAttribute('role'); host.removeAttribute('aria-label'); host.setAttribute('aria-hidden', 'true');
      host.appendChild(g);
      const spin = g.hasAttribute('data-spin'), W = { el: host, parent: P, rot: spin ? { a: 0, cx: 0, cy: 0 } : null, g, pad: +(g.dataset.layer || 1) };
      if (!spin) { layers.splice(i + 1, 0, W); return; }
      const set = g.setAttribute.bind(g);
      g.removeAttribute('transform');
      g.setAttribute = (name, val) => {
        if (name === 'transform') { const q = ROT.exec(val); if (q) { W.rot.a = +q[1]; W.rot.cx = +q[2]; W.rot.cy = +q[3]; place(svg, W); return; } }
        set(name, val);
      };
      layers.splice(i + 1, 0, W);
    });
  }
  // the live svg (holding defs) stays last in the stack; the others go in before it, in order
  layers.forEach((L) => { if (L.el !== svg) svg.parentNode.insertBefore(L.el, svg); });
  if (layers[layers.length - 1].el !== svg) { layers.splice(layers.findIndex((L) => L.el === svg), 1); layers.push({ el: svg, tx: 0, ty: 0 }); svg.parentNode.appendChild(svg); }
  // a wheel layer is only as big as its wheel, so turning it is cheap
  layers.forEach((L) => { if (!L.g) return; const b = L.g.getBBox(), m = L.pad || 1; L.box = { x: b.x - m, y: b.y - m, w: b.width + 2 * m, h: b.height + 2 * m }; L.el.setAttribute('viewBox', `${L.box.x} ${L.box.y} ${L.box.w} ${L.box.h}`); });
  svg.__layers = layers;
  svg.__cam = null;            // the camera re-applies itself to every layer on the next frame
};
const place = (svg, L) => {
  const c = svg.__cam; if (!c || !c.t) return;
  const o = L.parent || L, r = L.rot;
  L.el.style.transform = `translate3d(${Math.round(c.X + o.tx * c.s)}px, ${Math.round(c.Y + o.ty * c.s)}px, 0) scale(${c.s})` + (!r && L.box ? ` translate(${L.box.x}px, ${L.box.y}px)` : '') + (r ? ` translate(${r.cx}px, ${r.cy}px) rotate(${r.a.toFixed(1)}deg) translate(${(L.box ? L.box.x : 0) - r.cx}px, ${(L.box ? L.box.y : 0) - r.cy}px)` : '');
};
Object.keys(window.FIG_SCENES).forEach((k) => {
  const make = window.FIG_SCENES[k];
  window.FIG_SCENES[k] = (svg, F) => { const d = make(svg, F); try { layerize(svg, d, F); } catch (e) { console.warn('layerize', e); } return d; };
});
})();
