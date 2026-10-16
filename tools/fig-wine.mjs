// Wine & spirits delivery · Fig 1, drawn like the home page: a side-on story of one case of wine.
// LCBO (the case rolls out of the store's pickup counter into the van) · PACK (the van's side cut away: the case
// sinks into a foam-lined crate, dividers drop between the bottles, the lid closes) · ROUTE (the van drives the street,
// its route drawing ahead along the kerb) · PHOTO (the case is set on the porch and photographed) · SIGN (a signature).
// Moving parts are groups the page drives (assets/fig-scenes.js, "wine"); every state is a function of scroll.
// node tools/fig-wine.mjs → assets/fig-wine.svg + .json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./fig-lib.mjs";
import { helpers, lockup } from "./fig-story.mjs";
import { nightKit } from "./night.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
const W = 1200, H = 520;
const P = k.fitProjection([[-60, 0, -4], [320, 0, -4], [-60, 0, 40], [320, 0, 40]], W, H, { pad: 12, azimuth: 90, elevation: 7 });
const h = helpers(P);
const { at, box, L, D, seg, poly, sideM, discY, cylZ, prism } = h;
const HI = { tone: "hi", crease: "lo" }, MID = { tone: "mid" }, LO = { tone: "lo" };
const WHITE = { tone: "hi", crease: "lo", className: "st-white" };
const o = at([0, 0, 0]);
const N = nightKit(h, "wn");
const g = (attrs, inner) => `<g ${attrs}>${inner}</g>`;
const face = (x0, x1, y, z0, z1, cls) => `<path class="${cls}" d="${poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])}"/>`;

/* ---------- dimensions (dm) ---------- */
const COUNTER = { x0: 4, x1: 30, z: 9.4 };
const CASE = { l: 5.4, w: 3.8, h: 5 };
const VAN = { x0: 34, cargo: 66, x1: 80, floor: 5.4, roof: 25 };
const CRATE = { x: 48, l: 8.6, w: 5.6, h: 5.4 };
const PARK_DX = 202;                                   // how far the van drives to the house
const PORCH = { x: 228, y: -15, z: 2.4 };

/* ---------- a wine bottle seen from the side (x along, z up), standing at (x, y) on z ---------- */
const bottle = (x, y, z, cls = "wn-bottle", s = 1) => prism([[x - 0.42 * s, z], [x + 0.42 * s, z], [x + 0.42 * s, z + 2 * s], [x + 0.2 * s, z + 2.45 * s], [x + 0.13 * s, z + 3.2 * s], [x - 0.13 * s, z + 3.2 * s], [x - 0.2 * s, z + 2.45 * s], [x - 0.42 * s, z + 2 * s]], y - 0.4 * s, y + 0.4 * s, { tone: "hi", crease: "lo", className: cls });
const labelBand = (x, y, z, s = 1) => face(x - 0.38 * s, x + 0.38 * s, y + 0.42 * s, z + 0.7 * s, z + 1.5 * s, "wn-label");

/* ---------- the store: back wall with bottle shelving, the pickup counter with rollers, the dock opening ---------- */
const store = [];
store.push(`<path class="st-paper-fill" d="${poly([[-120, -24, 0], [32, -24, 0], [32, -24, 34], [-120, -24, 34]])}"/>`);
store.push(box(-120, 32, -24, 10, -0.3, 0, { tone: "hi", crease: "none", className: "st-wall" }, 0.05));
// shelving: three bays of bottles on four shelves
for (const [x0, x1] of [[-58, -36], [-34, -12], [-10, 2]]) {
  store.push(box(x0, x0 + 0.8, -23, -19, 0, 26, MID, 0.1) + box(x1 - 0.8, x1, -23, -19, 0, 26, MID, 0.1));
  for (const z of [1, 7.4, 13.8, 20.2]) {
    store.push(box(x0, x1, -23, -19, z - 0.6, z, HI, 0.1));
    for (let x = x0 + 1.4; x < x1 - 0.8; x += 1.15) store.push(bottle(x, -21, z, (Math.round(x * 3) % 5) ? "wn-bottle" : "wn-bottle wn-bottle--d", 0.95));
  }
}
store.push(N.glow([-28, -20, 16], 46, 22, "warm"));
// a sign over the shelving: a bottle mark, no wordmark
store.push(box(-44, -24, -23.6, -23, 28.4, 32.4, WHITE, 0.4) + bottle(-34, -22.8, 28.8, "wn-bottle wn-bottle--d", 1.05));
// the pickup counter: a roller bed on legs, a scale plate, a short ramp to the van
const counter = [];
for (const x of [COUNTER.x0 + 1, COUNTER.x1 - 2]) counter.push(box(x, x + 1, -2.6, -1.6, 0, COUNTER.z - 1, MID, 0.1) + box(x - 0.4, x + 1.4, -3, -1.2, 0, 0.4, MID, 0.2));
counter.push(box(COUNTER.x0, COUNTER.x1, -3, 3, COUNTER.z - 1.4, COUNTER.z - 0.2, HI, 0.3));
counter.push(box(COUNTER.x0 + 0.6, COUNTER.x1 - 0.6, -2.6, 2.6, COUNTER.z - 0.2, COUNTER.z, { tone: "hi", crease: "none", className: "fp-road" }, 0.1));
counter.push(D(Array.from({ length: 21 }, (_, i) => at([COUNTER.x0 + 1.2 + i * 1.2, 3.02, COUNTER.z - 0.8])), { size: 0.32, tone: "lo" }));
counter.push(box(COUNTER.x0 + 2, COUNTER.x0 + 8, -2.4, 2.4, COUNTER.z, COUNTER.z + 0.3, MID, 0.3));
const ramp = prism([[COUNTER.x1, COUNTER.z - 1.2], [VAN.x0 + 4, VAN.floor - 0.6], [VAN.x0 + 4, VAN.floor], [COUNTER.x1, COUNTER.z - 0.2]], -2.4, 2.4, HI);
// the store's dock wall, cut: wall over the opening and the slab
const CUTY = 10;
const cut = (x0, x1, z0, z1) => `<g class="st-cut"><path class="st-face" d="${poly([[x0, CUTY, z0], [x1, CUTY, z0], [x1, CUTY, z1], [x0, CUTY, z1]])}"/></g>`;
const storeCut = cut(-120, 32, -2, 0) + cut(30, 32, 24, 34) + cut(-120, 32, 34, 35.6);

/* ---------- the street: road, kerb, sidewalk, a row of houses and trees, the customer's house with its porch ---------- */
const street = [];
street.push(box(32, 420, -10, 14, -0.6, 0, { tone: "hi", crease: "none", className: "st-yard" }, 0.1));
street.push(box(32, 420, -8, 12, 0, 0.2, { tone: "hi", crease: "none", className: "st-road" }, 0.05));
for (let x = 40; x < 420; x += 14) street.push(box(x, x + 7, 1.6, 2.4, 0.2, 0.32, { tone: "hi", crease: "none", className: "st-mark" }, 0.05));
street.push(box(32, 420, -14, -8, 0, 0.8, { tone: "hi", crease: "lo", className: "st-walk" }, 0.2));
const rowHouse = (x0, x1, hgt, roof) => {
  const y0 = -44, y1 = -30;
  let s = box(x0, x1, y0, y1, 0, hgt, WHITE, 0.4, 2, 0.3);
  if (roof) s += prism([[x0 - 0.6, hgt], [x1 + 0.6, hgt], [(x0 + x1) / 2, hgt + roof]], y0, y1, { tone: "mid", crease: "lo", className: "wn-roof" });
  const wins = []; for (let x = x0 + 3; x < x1 - 4; x += 6) for (const z of [hgt * 0.25, hgt * 0.6]) { const dim = Math.round(x * 0.7 + z) % 3 === 0; wins.push((dim ? "" : N.win(x, x + 3, y1, z, z + 3.2)) + box(x, x + 3, y1 - 0.05, y1 + 0.05, z, z + 3.2, { tone: "mid", crease: "none", className: "st-glass nt-win" + (dim ? " nt-dim" : "") }, 0.1)); }
  return s + wins.join("");
};
for (const [x0, x1, hh, rf] of [[70, 96, 20, 6], [98, 128, 24, 0], [130, 152, 18, 7], [154, 186, 22, 0], [262, 290, 20, 6], [292, 326, 24, 0], [328, 360, 19, 7]]) street.push(rowHouse(x0, x1, hh, rf));
// the customer's house, nearer the street: walls, gable roof, door, windows, porch and steps
const HX = [200, 248];
const house = [box(HX[0], HX[1], -30, -16, 0, 22, WHITE, 0.4, 2, 0.3), prism([[HX[0] - 1.4, 22], [HX[1] + 1.4, 22], [(HX[0] + HX[1]) / 2, 31]], -31, -15, { tone: "mid", crease: "lo", className: "wn-roof" })];
house.push(box(222, 228, -16.06, -15.94, 0.8, 11, { tone: "mid", crease: "none", className: "wn-door" }, 0.2) + box(226.6, 227.2, -15.92, -15.86, 5.6, 6.2, LO, 0.1));
for (const x of [205, 236]) house.push(N.win(x, x + 7, -16, 6, 12) + box(x, x + 7, -16.05, -15.95, 6, 12, { tone: "mid", crease: "none", className: "st-glass nt-win" }, 0.2) + L(seg([x + 3.5, -15.93, 6], [x + 3.5, -15.93, 12]) + seg([x, -15.93, 9], [x + 7, -15.93, 9]), { tone: "lo" }));
house.push(box(218, 232, -16, -12, 0, 1.2, MID, 0.2) + box(218, 232, -16, -14, 1.2, 2.4, HI, 0.2) + box(219, 220, -16, -15, 2.4, 13, MID, 0.1) + box(230, 231, -16, -15, 2.4, 13, MID, 0.1) + box(217.4, 232.6, -16.4, -14.6, 13, 13.8, HI, 0.2));
house.push(N.pool([PORCH.x, -12, 1.4], 16, 10, "pool", [PORCH.x, -14.4, 12.6]) + N.lamp([PORCH.x, -14.4, 12.6], 2.6));
// trees on the sidewalk
const lobed = (cx, cy, R, n, amp, ph) => Array.from({ length: n * 6 }, (_, i) => { const a = (i / (n * 6)) * Math.PI * 2, rr = R * (1 - amp + amp * Math.abs(Math.cos((a * n) / 2 + ph))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
const pth = (pts) => "M" + pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
const tree = (x) => { const [cx, cy] = at([x, -11, 20]), R = 6 * h.cam.k, ph = (x * 0.3) % 3; return cylZ(x, -11, 0.8, 16, 0.5, MID, 12) + `<g class="st-tree"><path class="st-crown" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/><path class="st-crown-lit" d="${pth(lobed(cx - R * 0.15, cy - R * 0.15, R * 0.72, 7, 0.15, ph + 1))}"/><path class="iso-line" data-tone="lo" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/></g>`; };
for (const x of [60, 112, 168, 256, 310]) street.push(tree(x));
const post = (x) => N.pool([x, -6, 0.3], 18, 14, "pool", [x, -7.8, 24.4]) + cylZ(x, -12.4, 0.8, 26, 0.4, MID, 12) + box(x - 0.4, x + 0.4, -12.8, -7.6, 25.4, 26.2, MID, 0.2) + box(x - 1.2, x + 1.2, -9, -6.6, 24.6, 25.8, HI, 0.4) + N.lamp([x, -7.8, 24.4], 2.8);
for (const x of [86, 142, 280, 338]) street.push(post(x));
// the route along the kerb, drawn ahead of the van by the page
const route = `<path class="ls-route" data-route d="${poly([[VAN.x1 + 2, 10.5, 0.4], [PARK_DX + VAN.x1 + 2, 10.5, 0.4]], false)}"/>`;

/* ---------- the van, its near side cut away: the cargo bay with its crate ---------- */
const van = [];
van.push(discY(42, -7.4, -5, 3, 3, LO), discY(74, -7.4, -5, 3, 3, LO));
van.push(box(VAN.x0, VAN.x1, -7.4, -6.6, VAN.floor, VAN.roof, { tone: "lo", crease: "none", className: "st-inside" }, 0.1));                          // far wall, seen from inside
van.push(box(VAN.x0, VAN.cargo, -7.4, 7.4, VAN.floor - 1, VAN.floor, { tone: "mid", crease: "none", className: "st-floor" }, 0.2));
van.push(box(VAN.x0, VAN.x1 - 1, -7.4, 7.4, 1.6, VAN.floor - 1, MID, 0.4));
// the crate, foam inside
van.push(box(CRATE.x - CRATE.l / 2, CRATE.x + CRATE.l / 2, -CRATE.w / 2, CRATE.w / 2, VAN.floor, VAN.floor + 0.5, MID, 0.3));
van.push(box(CRATE.x - CRATE.l / 2 + 0.3, CRATE.x + CRATE.l / 2 - 0.3, -CRATE.w / 2 + 0.3, CRATE.w / 2 - 0.3, VAN.floor + 0.5, VAN.floor + 1.1, { tone: "hi", crease: "none", className: "wn-foam" }, 0.2));
van.push(box(VAN.x0 + 20, VAN.x0 + 30, -6.6, -4.4, VAN.floor, VAN.floor + 6, WHITE, 0.3) + box(VAN.x0 + 22, VAN.x0 + 28, -6.6, -4.4, VAN.floor + 6, VAN.floor + 9, WHITE, 0.3));   // other parcels on the shelf
const crateFront = box(CRATE.x - CRATE.l / 2, CRATE.x + CRATE.l / 2, CRATE.w / 2 - 0.4, CRATE.w / 2, VAN.floor + 0.5, VAN.floor + CRATE.h, { tone: "hi", crease: "lo", className: "wn-crate" }, 0.2)
  + box(CRATE.x - CRATE.l / 2, CRATE.x - CRATE.l / 2 + 0.4, -CRATE.w / 2, CRATE.w / 2, VAN.floor + 0.5, VAN.floor + CRATE.h, { tone: "hi", crease: "lo", className: "wn-crate" }, 0.1)
  + box(CRATE.x + CRATE.l / 2 - 0.4, CRATE.x + CRATE.l / 2, -CRATE.w / 2, CRATE.w / 2, VAN.floor + 0.5, VAN.floor + CRATE.h, { tone: "hi", crease: "lo", className: "wn-crate" }, 0.1)
  + L(seg([CRATE.x - CRATE.l / 2 + 0.4, CRATE.w / 2 + 0.02, VAN.floor + 1.6], [CRATE.x + CRATE.l / 2 - 0.4, CRATE.w / 2 + 0.02, VAN.floor + 1.6]), { tone: "faint" });
// the cut edge of the side panel, the roof, the cab with its glass, door, lockup, mirror, lights
const vanCut = `<g class="st-cut"><path class="st-face" d="${poly([[VAN.x0, 7.6, VAN.roof], [VAN.cargo, 7.6, VAN.roof], [VAN.cargo, 7.6, VAN.roof + 1.2], [VAN.x0, 7.6, VAN.roof + 1.2]])}"/><path class="st-face" d="${poly([[VAN.x0, 7.6, VAN.floor - 1], [VAN.x0 + 1, 7.6, VAN.floor - 1], [VAN.x0 + 1, 7.6, VAN.roof], [VAN.x0, 7.6, VAN.roof]])}"/></g>`;
const cab = [prism([[VAN.cargo, 1.6], [VAN.x1, 1.6], [VAN.x1, 9], [VAN.x1 - 1.4, 15], [VAN.x1 - 5.6, 20.6], [VAN.cargo, 21.4]], -7.2, 7.2, WHITE)];
cab.push(`<path class="st-glass-fill" d="${poly([[69, 7.25, 12], [VAN.x1 - 1.2, 7.25, 12], [VAN.x1 - 2.4, 7.25, 15.4], [VAN.x1 - 5.8, 7.25, 19.4], [69, 7.25, 19.4]])}"/>`);
cab.push(L(poly([[VAN.cargo + 1.2, 7.25, 2.4], [VAN.x1 - 1.4, 7.25, 2.4], [VAN.x1 - 1.4, 7.25, 9], [VAN.x1 - 3, 7.25, 15.6], [VAN.x1 - 6.4, 7.25, 20.2], [VAN.cargo + 1.2, 7.25, 20.2]]), { tone: "lo" }));
cab.push(box(VAN.x1 - 1, VAN.x1 + 0.6, -6.4, 6.4, 1.6, 3.8, MID, 0.5) + box(VAN.x1 - 1.6, VAN.x1 + 0.2, 4.6, 7.1, 5.2, 6.6, { tone: "hi", crease: "lo", className: "st-lamp" }, 0.3) + box(VAN.x1 - 2.4, VAN.x1 - 0.8, 7.2, 8.8, 14, 17.4, HI, 0.4));
cab.push(`<path class="st-stripe" d="${poly([[VAN.cargo + 0.6, 7.3, 4.6], [VAN.x1 - 1.4, 7.3, 4.6], [VAN.x1 - 1.4, 7.3, 5.4], [VAN.cargo + 0.6, 7.3, 5.4]])}"/>`);
// the lockup, centred on the cab door: between the stripe and the window, clear of the wheel arch
cab.push(`<g transform="${sideM((VAN.cargo + 1.2 + VAN.x1 - 1.4) / 2, 7.28, 9.5)}">${lockup(1.1)}</g>`);
const arch = (x) => { const pts = []; for (let a = 12; a <= 168; a += 12) { const r = (a * Math.PI) / 180; pts.push([x + Math.cos(r) * 3.9, 7.42, 3 + Math.sin(r) * 3.9]); } return `<path class="ec-arch" d="${poly(pts, false)}"/>`; };
const spin = (x) => { const c = at([x, 7.4, 3]); return discY(x, 5, 7.4, 3, 3, LO) + `<g data-spin data-c="${c[0].toFixed(2)} ${c[1].toFixed(2)}"><circle class="ec-hub" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(h.cam.k * 1.5).toFixed(2)}"/>${[0, 1, 2, 3, 4].map((n) => { const a = n / 5 * Math.PI * 2; return `<circle class="ec-bolt" cx="${(c[0] + Math.cos(a) * h.cam.k * 0.75).toFixed(1)}" cy="${(c[1] + Math.sin(a) * h.cam.k * 0.75).toFixed(1)}" r="${(h.cam.k * 0.18).toFixed(2)}"/>`; }).join("")}</g>`; };
const vanNear = arch(42) + arch(74) + spin(42) + spin(74) + N.headlights(VAN.x1 + 0.6, 6, 5.9) + N.tail([VAN.x0 - 0.2, 7.2, 8], 1.5);

/* ---------- the case: a carton of six bottles, open at the top; dividers and the crate lid come later ---------- */
const cx2 = CASE.l / 2, cy2 = CASE.w / 2;
let caseSvg = "";
for (const [bx, by] of [[-1.75, -0.95], [0, -0.95], [1.75, -0.95], [-1.75, 0.95], [0, 0.95], [1.75, 0.95]]) caseSvg += bottle(bx, by, 0.2, "wn-bottle wn-bottle--case", 1.5);
caseSvg += box(-cx2, cx2, -cy2, cy2, 0, CASE.h * 0.62, { tone: "hi", crease: "lo", lit: true, className: "wn-case" }, 0.15, 2, 0.1)
  + L(seg([-cx2 + 0.3, cy2 + 0.02, 1.2], [cx2 - 0.3, cy2 + 0.02, 1.2]), { tone: "faint" });
const dividers = g('data-dividers style="opacity:0"', [-0.88, 0.88].map((x) => box(x - 0.06, x + 0.06, -cy2 + 0.1, cy2 - 0.1, 0.3, CASE.h * 0.95, { tone: "hi", crease: "lo", className: "wn-divider" }, 0.02)).join(""));
const lid = g('data-lid style="opacity:0"', box(CRATE.x - CRATE.l / 2 - 0.2, CRATE.x + CRATE.l / 2 + 0.2, -CRATE.w / 2 - 0.2, CRATE.w / 2 + 0.2, 0, 0.6, { tone: "hi", crease: "lo", lit: true, className: "wn-case" }, 0.3)
  + box(CRATE.x - 1, CRATE.x + 1, -0.3, 0.3, 0.6, 0.9, MID, 0.2));

/* ---------- photo frame, flash and the photo card; the signature card ---------- */
const [pcx, pcy] = at([PORCH.x, PORCH.y, PORCH.z + 1.6]);
const bracket = (sx, sy) => `M${(pcx + sx * 13).toFixed(1)} ${(pcy + sy * 11 - sy * 4.5).toFixed(1)}V${(pcy + sy * 11).toFixed(1)}H${(pcx + sx * 13 - sx * 4.5).toFixed(1)}`;
const frame = g(`data-frame transform-origin="${pcx.toFixed(1)} ${pcy.toFixed(1)}" style="opacity:0"`, `<path class="wn-bracket" d="${[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => bracket(sx, sy)).join("")}"/>`);
const flash = `<circle data-flash class="wn-flash" cx="${pcx.toFixed(1)}" cy="${pcy.toFixed(1)}" r="26" style="opacity:0"/>`;
const [ccx, ccy] = at([PORCH.x, PORCH.y, 13.5]);
const card = (attr, w, hh, inner) => g(`${attr} transform="translate(${ccx.toFixed(1)} ${ccy.toFixed(1)}) scale(0.34)" style="opacity:0"`, `<g class="ls-card-in"><rect class="ls-card" x="${-w / 2}" y="${-hh}" width="${w}" height="${hh}" rx="10"/>${inner}</g>`);
const photoCard = card("data-photo", 132, 104, `<rect class="wn-photo" x="-56" y="-94" width="112" height="62" rx="5"/><rect class="wn-photo-step" x="-56" y="-48" width="112" height="16"/><rect class="wn-photo-case" x="-12" y="-66" width="24" height="18" rx="2"/><rect class="wn-photo-door" x="-44" y="-86" width="20" height="38"/><circle class="ls-tag-dot" cx="-48" cy="-17" r="4"/><rect class="ls-card-line strong" x="-38" y="-21" width="58" height="7" rx="3.5"/>`);
const signCard = card("data-sign-card", 132, 92, `<text class="ls-card-title" x="-52" y="-68">RECEIVED</text><rect class="ls-card-line" x="-52" y="-58" width="84" height="5" rx="2.5"/><path class="ls-sign-line" d="M-52 -24 H44"/><path class="ls-sign" data-sign d="M-46 -30 C-40 -46 -32 -18 -24 -32 S-8 -40 2 -28 S16 -26 26 -36"/><g data-check style="opacity:0"><circle class="ls-check-bg" cx="44" cy="-70" r="10"/><path class="ls-check" d="M39 -70 L43 -66 L50 -74"/></g>`);

/* ---------- assemble ---------- */
const body = [
  N.defs,
  `<g data-fit>`,
  street.join(""), house.join(""), route,
  store.join(""), counter.join(""), ramp,
  g('data-van', van.join("") + g('data-case', caseSvg + dividers) + crateFront + lid + vanCut + cab.join("") + vanNear),
  storeCut, flash, frame, photoCard, signCard,
  `</g>`,
];
const svg = k.figureSvg({ width: W, height: H, className: "iso-svg fp-svg st-svg ec-svg ls-svg wn-svg", label: "A case of wine rolls out of the liquor store into the ShipNoble van, is packed into a foam-lined crate, driven down the street, photographed on the customer's porch and signed for.", body });
const data = {
  scene: "wine", xs: [0, 1, 2, 3, 4], locs: ["LCBO", "PACK", "ROUTE", "PHOTO", "SIGN"], ax: [0, 0], vb: [W, H], o: o.map((v) => +v.toFixed(2)),
  kx: +h.cam.k.toFixed(5), kz: +(-h.cam.k * h.cam.cosE).toFixed(5), ky: +(h.cam.k * h.cam.sinE).toFixed(5),
  COUNTER, CASE, VAN, CRATE, PARK_DX, PORCH,
};
writeFileSync(join(OUT, "fig-wine.svg"), svg);
writeFileSync(join(OUT, "fig-wine.json"), JSON.stringify(data));
writeFileSync(join(HERE, "out", "fig-wine.html"), k.pageHtml({ title: "wine", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><link rel="stylesheet" href="../../assets/fx.css"><div class="iso-stage">${svg.replaceAll('href="assets/', 'href="../../assets/')}</div>`, width: 1200 }));
console.log("wrote fig-wine", (svg.length / 1024).toFixed(0) + " KB");
