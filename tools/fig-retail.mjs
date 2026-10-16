// Retail distribution · Fig 1, drawn like the home page: a side-on story of one pallet, rack to store shelf.
// EDI (the store's order runs along the data line into the office terminal) · PICK (the stacker crane rides the rack,
// lifts to the top level and brings the pallet down) · WRAP (on the turntable the film carriage climbs and wraps it)
// · DC (the conveyor runs it into the ShipNoble truck, which pulls out) · STORE (the truck backs into the store's dock,
// the pallet rolls in and the shelves fill). The page drives the moving parts (assets/fig-scenes.js, "retail").
// node tools/fig-retail.mjs → assets/fig-retail.svg + .json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./fig-lib.mjs";
import { helpers, lockup } from "./fig-story.mjs";
import { nightKit } from "./night.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
const W = 1200, H = 520;
const P = k.fitProjection([[-80, 0, -4], [420, 0, -4], [-80, 0, 50], [420, 0, 50]], W, H, { pad: 12, azimuth: 90, elevation: 7 });
const h = helpers(P);
const { at, box, L, D, seg, poly, sideM, discY, cylZ, prism } = h;
const HI = { tone: "hi", crease: "lo" }, MID = { tone: "mid" }, LO = { tone: "lo" };
const WHITE = { tone: "hi", crease: "lo", className: "st-white" };
const o = at([0, 0, 0]);
const N = nightKit(h, "rt");
const g = (attrs, inner) => `<g ${attrs}>${inner}</g>`;
const face = (x0, x1, y, z0, z1, cls) => `<path class="${cls}" d="${poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])}"/>`;

/* ---------- dimensions (dm) ---------- */
const RACK = { x0: -36, x1: 44, y0: -22, y1: -10, levels: [12, 24, 36] };
const PICK = { x: 34, z: 36 };                         // the pallet's bay and level
const CRANE = { rest: 62, y: -4 };
const CONV = { x0: 70, x1: 172, z: 8 };
const WRAP_X = 98, DOCK_X = 160;
const TRUCK = { x0: 168, cargo: 232, x1: 250, floor: 9, roof: 34 };
const STORE = { x0: 282, x1: 384, dock: 384 };
const PAL = { l: 12, w: 10, base: 1.4, load: 10 };
const OUT_DX = 220, BACK_DX = 222;                     // the truck pulls out past the store, then backs into its dock

/* ---------- the warehouse: wall, floor, the office terminal, the data line along the wall ---------- */
const wh = [];
wh.push(`<path class="st-paper-fill" d="${poly([[-150, -30, 0], [DOCK_X, -30, 0], [DOCK_X, -30, 50], [-150, -30, 50]])}"/>`);
wh.push(box(-150, DOCK_X + 2, -30, 12, -0.3, 0, { tone: "hi", crease: "none", className: "st-wall" }, 0.05));
wh.push(box(-150, DOCK_X, -29.9, -29.4, 0, 1.4, MID, 0.1));
const joints = []; for (let x = -140; x < DOCK_X; x += 24) joints.push(seg([x, -30, 0], [x, 12, 0]));
wh.push(L(joints.join(""), { tone: "faint" }));
for (let x = -140; x < DOCK_X - 20; x += 26) wh.push(box(x, x + 20, -29.95, -29.6, 40, 44, { tone: "mid", crease: "lo", className: "st-glass" }, 0.2));
for (const x of [-110, -40, 30, 100]) wh.push(N.pool([x, -10, 0.1], 24, 14, "pool", [x, -10, 45.2]) + L(seg([x, -12, 50], [x, -12, 46.6]), { tone: "lo" }) + box(x - 1.8, x + 1.8, -14, -10, 45.4, 46.6, HI, 0.6) + N.lamp([x, -10, 45.2], 3.8));
wh.push(N.glow([-56, -14, 15.6], 12, 8, "cool"));
// the office terminal: a desk with a monitor and a keyboard
wh.push(box(-66, -64.8, -18, -16.8, 0, 8.4, MID, 0.1) + box(-46.2, -45, -18, -16.8, 0, 8.4, MID, 0.1) + box(-66, -45, -19, -11, 8.4, 9.4, HI, 0.3));
wh.push(box(-57, -55, -16, -14.6, 9.4, 11.4, MID, 0.2) + box(-63, -49, -15.8, -15, 11.4, 19.4, { tone: "mid", crease: "lo" }, 0.3) + face(-62.2, -49.8, -14.98, 12.2, 18.6, "ec-screen"));
const ui = []; ui.push(face(-61.4, -50.6, -14.95, 17.2, 17.9, "ec-ui-bar")); for (const [z, w] of [[15.6, 8], [14.4, 6], [13.2, 7]]) ui.push(face(-61.2, -61.2 + w, -14.95, z, z + 0.5, "ec-ui-line"));
wh.push(ui.join("") + g('data-screen-glow style="opacity:0"', face(-62.2, -49.8, -14.94, 12.2, 18.6, "ec-glow-fill")) + box(-62, -52, -13.6, -11.6, 9.4, 9.9, MID, 0.2));
const DATA = [[DOCK_X - 6, -29.4, 36], [-56, -29.4, 36], [-56, -15, 19.4]];
const dataLine = `<path class="ls-data" d="${poly(DATA, false)}"/><path class="ls-pulse-trail" data-trail d="${poly(DATA.slice().reverse().reverse(), false)}"/><g data-pulse style="opacity:0"><circle class="ls-pulse-glow" r="7"/><circle class="ls-pulse" r="2.6"/></g>`;

/* ---------- a pallet of cartons (bottom centre at the origin); cartons are separate so they can be shelved ---------- */
const palletBase = (cls = "") => box(-PAL.l / 2, PAL.l / 2, -PAL.w / 2, PAL.w / 2, 0, 0.3, MID, 0.1)
  + [-PAL.l / 2 + 0.7, 0, PAL.l / 2 - 0.7].map((x) => box(x - 0.7, x + 0.7, -PAL.w / 2, PAL.w / 2, 0.3, 1.1, MID, 0.1)).join("")
  + box(-PAL.l / 2, PAL.l / 2, -PAL.w / 2, PAL.w / 2, 1.1, PAL.base, { tone: "mid", crease: "lo", className: cls }, 0.1);
const CART = []; for (const z of [0, 1]) for (const x of [-4, 0, 4]) CART.push({ x, z: PAL.base + z * 5 });
const carton = (lit) => box(-1.9, 1.9, -4.6, 4.6, 0, 4.9, { tone: "hi", crease: "lo", lit, className: lit ? "rt-carton" : "st-carton" }, 0.2, 2, 0.1)
  + L(seg([-1.9, 4.62, 3.6], [1.9, 4.62, 3.6]), { tone: "faint" });
const staticPallet = (x, z) => `<g transform="translate(${((at([x, -16, z])[0]) - o[0]).toFixed(2)} ${((at([x, -16, z])[1]) - o[1]).toFixed(2)})">${palletBase()}${CART.map((c) => `<g transform="translate(${(c.x * h.cam.k).toFixed(2)} ${(c.z * -h.cam.k * h.cam.cosE).toFixed(2)})">${carton(false)}</g>`).join("")}</g>`;

/* ---------- the rack and its stacker crane ---------- */
const rack = [];
for (const x of [RACK.x0, -16, 4, 24, RACK.x1]) {
  rack.push(box(x - 0.6, x + 0.6, RACK.y0, RACK.y1, 0, 46, MID, 0.1) + box(x - 1.2, x + 1.2, RACK.y0 - 0.6, RACK.y1 + 0.6, 0, 0.4, MID, 0.2));
  rack.push(D(Array.from({ length: 24 }, (_, i) => at([x, RACK.y1 + 0.02, 1.4 + i * 1.9])), { size: 0.3, tone: "lo" }));
}
for (const z of RACK.levels) rack.push(box(RACK.x0, RACK.x1, RACK.y0, RACK.y1, z - 1, z, HI, 0.1));
for (const [x, z] of [[-26, 0], [-6, 0], [14, 0], [34, 0], [-26, 12], [14, 12], [34, 12], [-6, 24], [14, 24], [-26, 36], [-6, 36]]) rack.push(staticPallet(x, z));
const craneFixed = box(-44, 72, CRANE.y - 0.8, CRANE.y + 0.8, 0, 0.6, MID, 0.2) + box(-44, 72, CRANE.y - 0.6, CRANE.y + 0.6, 48, 49, MID, 0.2);   // floor rail and top guide
const crane = box(-1.4, 1.4, CRANE.y - 1.4, CRANE.y + 1.4, 0.6, 48, { tone: "hi", crease: "lo", className: "st-white" }, 0.3)
  + box(-5, 5, CRANE.y - 2, CRANE.y + 2, 0.6, 3, HI, 0.6, 2, 0.3) + discY(-3, CRANE.y + 2, CRANE.y + 2.6, 1.6, 1.2, LO) + discY(3, CRANE.y + 2, CRANE.y + 2.6, 1.6, 1.2, LO)
  + box(-2.4, 2.4, CRANE.y - 1.6, CRANE.y + 1.6, 46, 48, HI, 0.4) + box(-1, 1, CRANE.y + 1.4, CRANE.y + 1.7, 20, 21.4, { tone: "lo", crease: "none", className: "ec-screen" }, 0.1);
const shuttle = box(1.4, 14, -10, 2, -1, 0, HI, 0.3) + box(1.4, 2.2, -10, 2, 0, 2.4, MID, 0.1);           // at z = 0, raised by the page

/* ---------- the conveyor, the stretch wrapper, the dock door ---------- */
const conv = [];
for (let x = CONV.x0 + 3; x < CONV.x1; x += 16) conv.push(box(x, x + 1.2, -4, -3, 0, CONV.z - 1.2, MID, 0.1) + box(x - 0.6, x + 1.8, -4.4, -2.6, 0, 0.4, MID, 0.2));
conv.push(box(CONV.x0, CONV.x1, -6, 6, CONV.z - 1.6, CONV.z - 0.3, HI, 0.3));
conv.push(box(CONV.x0 + 0.6, CONV.x1 - 0.6, -5.4, 5.4, CONV.z - 0.3, CONV.z, { tone: "hi", crease: "none", className: "fp-road" }, 0.1));
conv.push(D(Array.from({ length: 41 }, (_, i) => at([CONV.x0 + 1.4 + i * 2.45, 6.02, CONV.z - 0.9])), { size: 0.32, tone: "lo" }));
const roll = `<path class="ec-roll" data-belt-roll d="${poly([[CONV.x0 + 1, 6.05, CONV.z - 1.2], [CONV.x1 - 1, 6.05, CONV.z - 1.2]], false)}"/>`;
const wrapBack = box(WRAP_X + 9, WRAP_X + 11, -12, -10, 0, 34, MID, 0.2) + box(WRAP_X + 8, WRAP_X + 12, -13, -9, 0, 0.6, MID, 0.2) + box(WRAP_X + 8.6, WRAP_X + 11.4, -12.6, -9.4, 34, 35.2, HI, 0.3);
const turntable = cylZ(WRAP_X, 0, CONV.z, CONV.z + 0.5, 7.2, { tone: "hi", crease: "lo" }, 36) + g('data-turn', D(Array.from({ length: 6 }, (_, i) => at([WRAP_X + Math.cos(i / 6 * Math.PI * 2) * 6.4, Math.sin(i / 6 * Math.PI * 2) * 6.4, CONV.z + 0.5])), { size: 0.4, tone: "lo" }));
const carriage = box(WRAP_X + 6.4, WRAP_X + 10, -11, -4, 0, 3.4, WHITE, 0.4, 2, 0.3) + discY(WRAP_X + 7.4, -9, -5, 1.7, 1, { tone: "hi", crease: "lo", className: "rt-film-roll" });   // at z = 0
const dockCut = `<g class="st-cut"><path class="st-face" d="${poly([[DOCK_X, 12, 30], [DOCK_X + 2, 12, 30], [DOCK_X + 2, 12, 50], [DOCK_X, 12, 50]])}"/></g>`;

/* ---------- outside: road, trees, and the store with its shelves and dock ---------- */
const out = [];
out.push(box(DOCK_X + 2, 640, -10, 14, -0.6, 0, { tone: "hi", crease: "none", className: "st-yard" }, 0.1));
out.push(box(DOCK_X + 2, 640, -8, 12, 0, 0.2, { tone: "hi", crease: "none", className: "st-road" }, 0.05));
for (let x = DOCK_X + 8; x < 640; x += 14) out.push(box(x, x + 7, 1.6, 2.4, 0.2, 0.32, { tone: "hi", crease: "none", className: "st-mark" }, 0.05));
const lobed = (cx, cy, R, n, amp, ph) => Array.from({ length: n * 6 }, (_, i) => { const a = (i / (n * 6)) * Math.PI * 2, rr = R * (1 - amp + amp * Math.abs(Math.cos((a * n) / 2 + ph))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
const pth = (pts) => "M" + pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
const tree = (x) => { const [cx, cy] = at([x, -16, 22]), R = 7 * h.cam.k, ph = (x * 0.3) % 3; return cylZ(x, -16, 0, 17, 0.6, MID, 12) + `<g class="st-tree"><path class="st-crown" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/><path class="st-crown-lit" d="${pth(lobed(cx - R * 0.15, cy - R * 0.15, R * 0.72, 7, 0.15, ph + 1))}"/><path class="iso-line" data-tone="lo" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/></g>`; };
for (const x of [196, 240, 268, 430, 470, 520]) out.push(tree(x));
const post = (x) => N.pool([x, -4, 0.3], 18, 14, "pool", [x, -6.6, 26.4]) + cylZ(x, -12, 0, 28, 0.45, MID, 12) + box(x - 0.4, x + 0.4, -12.4, -6.4, 27.4, 28.2, MID, 0.2) + box(x - 1.3, x + 1.3, -8, -5.4, 26.6, 27.8, HI, 0.4) + N.lamp([x, -6.6, 26.4], 3);
for (const x of [212, 400, 460]) out.push(post(x));
// the store: back wall, floor, gondola shelving, a back room with the pallet spot, the dock wall
const st = [];
st.push(`<path class="st-paper-fill" d="${poly([[STORE.x0, -44, 0], [STORE.x1, -44, 0], [STORE.x1, -44, 34], [STORE.x0, -44, 34]])}"/>`);
st.push(box(STORE.x0, STORE.x1, -44, -12, -0.3, 0.4, { tone: "hi", crease: "none", className: "st-wall" }, 0.05));
st.push(N.glow([STORE.x0 + 24, -40, 16], 34, 20, "warm"), N.glow([STORE.x0 + 74, -40, 16], 24, 16, "warm"));
st.push(box(STORE.x0 + 46, STORE.x0 + 47, -44, -34, 0.4, 30, MID, 0.1));                                   // the back-room partition
const SHELF = { x0: STORE.x0 + 6, x1: STORE.x0 + 40, levels: [4, 11, 18, 25] };
st.push(box(SHELF.x0, SHELF.x0 + 1, -38, -30, 0.4, 28, MID, 0.1) + box(SHELF.x1 - 1, SHELF.x1, -38, -30, 0.4, 28, MID, 0.1) + box(SHELF.x0, SHELF.x1, -39, -38, 0.4, 28, { tone: "hi", crease: "none", className: "st-white" }, 0.1));
for (const z of SHELF.levels) st.push(box(SHELF.x0, SHELF.x1, -38, -30, z - 0.6, z, HI, 0.1));
// products already on the shelves: rows of small boxes; the page fills the empty slots
const product = (x, z, cls = "rt-product") => box(x - 0.9, x + 0.9, -36, -32, z, z + 2.8, { tone: "hi", crease: "lo", className: cls }, 0.15);
const FILL = [];
for (const [li, z] of SHELF.levels.entries()) for (let x = SHELF.x0 + 2.4; x < SHELF.x1 - 1.4; x += 2.6) {
  const empty = li < 3 && x > SHELF.x0 + 14 && x < SHELF.x1 - 6;
  if (empty) FILL.push({ x, z, li }); else st.push(product(x, z, (Math.round(x * 2) % 3) ? "rt-product" : "rt-product rt-product--b"));
}
const fills = FILL.map((p, i) => g(`data-fill="${i}" style="opacity:0"`, product(p.x, p.z, "rt-product rt-product--new"))).join("");
// the store's dock: a door opening in the right wall, a sign band with the shelf mark
const storeCut = `<g class="st-cut"><path class="st-face" d="${poly([[STORE.x1 - 2, -12, 22], [STORE.x1, -12, 22], [STORE.x1, -12, 34], [STORE.x1 - 2, -12, 34]])}"/><path class="st-face" d="${poly([[STORE.x0, -12, 34], [STORE.x1, -12, 34], [STORE.x1, -12, 35.4], [STORE.x0, -12, 35.4]])}"/><path class="st-face" d="${poly([[STORE.x0, -12, -2], [STORE.x1, -12, -2], [STORE.x1, -12, 0.4], [STORE.x0, -12, 0.4]])}"/><path class="st-face" d="${poly([[STORE.x0, -12, 0.4], [STORE.x0 + 1.6, -12, 0.4], [STORE.x0 + 1.6, -12, 34], [STORE.x0, -12, 34]])}"/></g>`;
const awning = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => box(STORE.x0 + 50 + n * 4, STORE.x0 + 54 + n * 4, -12, -9, 26, 27, { tone: "hi", crease: "none", className: n % 2 ? "st-white" : "ls-awning" }, 0.05)).join("");

/* ---------- the truck: box body with the lockup, cab, wheels; a tail lift at the rear ---------- */
const truck = [];
truck.push(discY(180, -8, -5.6, 3.4, 3.4, LO), discY(240, -8, -5.6, 3.4, 3.4, LO));
truck.push(box(TRUCK.x0, TRUCK.x1 - 1, -8, 8, 2.4, TRUCK.floor, MID, 0.4));
truck.push(box(TRUCK.x0, TRUCK.cargo, -8.4, 8.4, TRUCK.floor, TRUCK.roof, WHITE, 0.8, 2, 0.5));
truck.push(prism([[TRUCK.cargo, 2.4], [TRUCK.x1, 2.4], [TRUCK.x1, 11], [TRUCK.x1 - 1.6, 18], [TRUCK.x1 - 6, 23.4], [TRUCK.cargo, 24]], -8, 8, WHITE));
truck.push(`<path class="st-glass-fill" d="${poly([[TRUCK.cargo + 4, 8.05, 14], [TRUCK.x1 - 1.4, 8.05, 14], [TRUCK.x1 - 2.6, 8.05, 18], [TRUCK.x1 - 6.2, 8.05, 22], [TRUCK.cargo + 4, 8.05, 22]])}"/>`);
truck.push(L(poly([[TRUCK.cargo + 1.4, 8.05, 3], [TRUCK.x1 - 1.6, 8.05, 3], [TRUCK.x1 - 1.6, 8.05, 11], [TRUCK.x1 - 3.2, 8.05, 18.4], [TRUCK.x1 - 6.8, 8.05, 23], [TRUCK.cargo + 1.4, 8.05, 23]]), { tone: "lo" }));
truck.push(`<path class="st-stripe" d="${poly([[TRUCK.x0 + 1, 8.45, 12], [TRUCK.cargo - 1, 8.45, 12], [TRUCK.cargo - 1, 8.45, 13.4], [TRUCK.x0 + 1, 8.45, 13.4]])}"/>`);
truck.push(`<g transform="${sideM((TRUCK.x0 + TRUCK.cargo) / 2, 8.46, 23)}">${lockup(2.4)}</g>`);
truck.push(L(seg([TRUCK.x0 + 1.2, 8.45, TRUCK.floor + 0.6], [TRUCK.x0 + 1.2, 8.45, TRUCK.roof - 0.6]) + seg([TRUCK.x0 + 1, 8.45, TRUCK.roof - 1.2], [TRUCK.cargo - 0.6, 8.45, TRUCK.roof - 1.2]), { tone: "faint" }));
truck.push(box(TRUCK.x1 - 1.2, TRUCK.x1 + 0.6, -7.6, 7.6, 2.4, 5, MID, 0.6) + box(TRUCK.x1 - 1.8, TRUCK.x1 + 0.2, 5.4, 8, 6.4, 8.2, { tone: "hi", crease: "lo", className: "st-lamp" }, 0.3) + box(TRUCK.x1 - 2.4, TRUCK.x1 - 0.6, 8, 10, 15.6, 19.6, HI, 0.4));
const archT = (x) => { const pts = []; for (let a = 12; a <= 168; a += 12) { const r = (a * Math.PI) / 180; pts.push([x + Math.cos(r) * 4.3, 8.1, 3.4 + Math.sin(r) * 4.3]); } return `<path class="ec-arch" d="${poly(pts, false)}"/>`; };
const spinT = (x) => { const c = at([x, 8, 3.4]); return discY(x, 5.6, 8, 3.4, 3.4, LO) + `<g data-spin data-c="${c[0].toFixed(2)} ${c[1].toFixed(2)}"><circle class="ec-hub" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(h.cam.k * 1.7).toFixed(2)}"/>${[0, 1, 2, 3, 4].map((n) => { const a = n / 5 * Math.PI * 2; return `<circle class="ec-bolt" cx="${(c[0] + Math.cos(a) * h.cam.k * 0.85).toFixed(1)}" cy="${(c[1] + Math.sin(a) * h.cam.k * 0.85).toFixed(1)}" r="${(h.cam.k * 0.2).toFixed(2)}"/>`; }).join("")}</g>`; };
const truckNear = archT(180) + archT(240) + spinT(180) + spinT(240) + N.headlights(TRUCK.x1 + 0.4, 7.4, 7.3) + N.tail([TRUCK.x0 - 0.2, 8.6, 10.6], 1.8) + N.tail([TRUCK.x0 - 0.2, 8.6, 32], 1.2);

/* ---------- the moving pallet: base, cartons (each its own group), the stretch film ---------- */
const filmLines = []; for (let z = PAL.base + 0.6; z < PAL.base + PAL.load; z += 1.1) filmLines.push(seg([-PAL.l / 2 - 0.1, PAL.w / 2 + 0.2, z], [PAL.l / 2 + 0.1, PAL.w / 2 + 0.2, z + 0.5]));
const film = `<clipPath id="rt-film-clip"><rect data-film-rect x="-400" y="0" width="800" height="0"/></clipPath><g clip-path="url(#rt-film-clip)"><path class="rt-film" d="${poly([[-PAL.l / 2 - 0.1, PAL.w / 2 + 0.15, PAL.base], [PAL.l / 2 + 0.1, PAL.w / 2 + 0.15, PAL.base], [PAL.l / 2 + 0.1, PAL.w / 2 + 0.15, PAL.base + PAL.load + 0.1], [-PAL.l / 2 - 0.1, PAL.w / 2 + 0.15, PAL.base + PAL.load + 0.1]])}"/><path class="rt-film-lines" data-film-lines d="${filmLines.join("")}"/></g>`;
const cartons = CART.map((c, i) => g(`data-carton="${i}" transform="translate(${(c.x * h.cam.k).toFixed(2)} ${(c.z * -h.cam.k * h.cam.cosE).toFixed(2)})"`, carton(true))).join("");
const pallet = g('data-pallet', palletBase("rt-pallet") + g('data-cartons', cartons) + film);

/* ---------- assemble ---------- */
const P0 = (x, z) => { const q = at([x, 0, z]); return `translate(${(q[0] - o[0]).toFixed(2)} ${(q[1] - o[1]).toFixed(2)})`; };
const body = [
  N.defs,
  `<g data-fit>`,
  out.join(""), st.join(""), fills, wh.join(""), dataLine, rack.join(""), craneFixed,
  g(`data-crane transform="${P0(CRANE.rest, 0)}"`, crane + g('data-shuttle', shuttle)),
  wrapBack, conv.join("") + roll, turntable, g('data-carriage', carriage),
  pallet,
  storeCut, awning,
  g('data-truck', truck.join("") + truckNear),
  dockCut,
  `</g>`,
];
const svg = k.figureSvg({ width: W, height: H, className: "iso-svg fp-svg st-svg ec-svg ls-svg rt-svg", label: "One pallet from the warehouse rack to a store shelf: the order arrives by EDI, a stacker crane brings the pallet down, it is stretch-wrapped on a turntable, conveyed into a ShipNoble truck that backs into the store's dock, and its cartons fill the shelves.", body });
const data = {
  scene: "retail", xs: [0, 1, 2, 3, 4], locs: ["EDI", "PICK", "WRAP", "DC", "STORE"], ax: [0, 0], vb: [W, H], o: o.map((v) => +v.toFixed(2)),
  kx: +h.cam.k.toFixed(5), kz: +(-h.cam.k * h.cam.cosE).toFixed(5), ky: +(h.cam.k * h.cam.sinE).toFixed(5),
  PICK, CRANE, CONV, WRAP_X, DOCK_X, TRUCK, STORE, PAL, OUT_DX, BACK_DX, CART, FILL: FILL.map((p) => ({ x: +p.x.toFixed(2), z: p.z, li: p.li })), DATA,
};
writeFileSync(join(OUT, "fig-retail.svg"), svg);
writeFileSync(join(OUT, "fig-retail.json"), JSON.stringify(data));
writeFileSync(join(HERE, "out", "fig-retail.html"), k.pageHtml({ title: "retail", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><link rel="stylesheet" href="../../assets/fx.css"><div class="iso-stage">${svg.replaceAll('href="assets/', 'href="../../assets/')}</div>`, width: 1200 }));
console.log("wrote fig-retail", (svg.length / 1024).toFixed(0) + " KB", FILL.length, "slots to fill");
