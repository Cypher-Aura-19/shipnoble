// Logistics Management System · Fig 1, drawn like the home page's top view: a control map seen straight down.
// One order through the system: SYNC (an order pulse runs from the store to the warehouse) · STOCK (the roof
// peels back to a blueprint of the racks, the count ticks up) · SLOT (a bay lights and a pallet slides in)
// · FLEET (the van leaves the dock, its route drawing ahead) · BOL (a signed bill of lading at the door).
// The page drives the moving parts (assets/fig-scenes.js, "lms").
// node tools/fig-lms.mjs → assets/fig-lms.svg + .json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./fig-lib.mjs";
import { helpers, lockup } from "./fig-story.mjs";
import { nightKit } from "./night.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
const W = 1200, H = 540;
const P = k.fitProjection([[-150, -54, 0], [150, -54, 0], [-150, 62, 0], [150, 62, 0]], W, H, { pad: 10, azimuth: 90, elevation: 90 });
const h = helpers(P);
const { at, box, L, D, seg, poly, topM, cylZ } = h;
const K = h.cam.k;
const HI = { tone: "hi", crease: "lo" }, MID = { tone: "mid" };
const WHITE = { tone: "hi", crease: "lo", className: "st-white" };
const ROAD = { tone: "hi", crease: "none", className: "st-road" };
const MARK = { tone: "hi", crease: "none", className: "st-mark" };
const g = (attrs, inner) => `<g ${attrs}>${inner}</g>`;
const sp = (x, y) => at([x, y, 0]).map((v) => +v.toFixed(2));
const pathD = (pts) => "M" + pts.map((p) => sp(...p).join(" ")).join("L");

/* ---------- layout (dm, top view: x east, y south) ---------- */
const WH = { x0: -36, x1: 36, y0: -28, y1: 22 };
const STORE = { x0: -130, x1: -100, y0: -38, y1: -14 };
const HOUSE = { x0: 98, x1: 126, y0: -10, y1: 14 };
const ROAD_Y = 44, RW = 6;
const N = nightKit(h, "ls");                                   // main road centre and half width
const DOCK = [14, WH.y1 + 2];

/* ---------- ground, roads ---------- */
const ground = [`<path class="st-paper-fill" d="${poly([[-330, -110, 0], [330, -110, 0], [330, 120, 0], [-330, 120, 0]])}"/>`];
ground.push(box(-330, 330, ROAD_Y - RW - 3, ROAD_Y + RW + 3, 0, 0.6, { tone: "hi", crease: "lo", className: "st-walk" }, 0.2));
ground.push(box(-330, 330, ROAD_Y - RW, ROAD_Y + RW, 0.6, 0.8, ROAD, 0.1));
for (const [x, y0] of [[DOCK[0], WH.y1], [(STORE.x0 + STORE.x1) / 2, STORE.y1], [(HOUSE.x0 + HOUSE.x1) / 2, HOUSE.y1]]) ground.push(box(x - RW + 1, x + RW - 1, y0, ROAD_Y, 0.6, 0.8, ROAD, 0.1));
const dash = []; for (let x = -326; x < 326; x += 12) if (![DOCK[0], -115, 112].some((c) => Math.abs(x + 3 - c) < RW + 3)) dash.push(box(x, x + 6, ROAD_Y - 0.35, ROAD_Y + 0.35, 0.8, 0.9, MARK, 0.05));
const dashes = dash.join("");

/* ---------- the warehouse: blueprint of the racks under a roof that peels back ---------- */
const bp = [`<path class="st-bp-base" d="${poly([[WH.x0, WH.y0, 1], [WH.x1, WH.y0, 1], [WH.x1, WH.y1, 1], [WH.x0, WH.y1, 1]])}"/>`];
const B = { tone: "hi", crease: "lo", className: "st-bp" };
const BAYS = [];
for (const [r, y] of [[0, -22], [1, -8], [2, 6]]) for (let c = 0; c < 6; c++) {
  const x = WH.x0 + 7 + c * 10.4;
  bp.push(box(x, x + 9, y, y + 7, 1, 8, B, 0.2));
  for (const dx of [1.2, 5.2]) if (!(r === 1 && c === 3)) bp.push(box(x + dx, x + dx + 2.6, y + 1.4, y + 5.6, 8, 9, { tone: "hi", crease: "lo", className: "st-carton" }, 0.2));
  BAYS.push({ r, c, x, y });
}
bp.push(L(seg([WH.x0 + 3, -11.5, 9], [WH.x1 - 3, -11.5, 9]) + seg([WH.x0 + 3, 2.5, 9], [WH.x1 - 3, 2.5, 9]), { tone: "faint", className: "st-bp-aisle" }));
const slotBay = BAYS.find((b) => b.r === 1 && b.c === 3);
const slotRing = `<path class="ls-slot" data-slot d="${poly([[slotBay.x - 0.6, slotBay.y - 0.6, 9.5], [slotBay.x + 9.6, slotBay.y - 0.6, 9.5], [slotBay.x + 9.6, slotBay.y + 7.6, 9.5], [slotBay.x - 0.6, slotBay.y + 7.6, 9.5]])}" style="opacity:0"/>`;
const pallet = g('data-pallet style="opacity:0"', box(-1.3, 1.3, -2.1, 2.1, 9, 10.4, { tone: "hi", crease: "lo", className: "ls-pallet" }, 0.2) + box(1.3 + 1.4, 3.9 + 1.4, -2.1, 2.1, 9, 10.4, { tone: "hi", crease: "lo", className: "ls-pallet" }, 0.2));
const roofSeams = []; for (let x = WH.x0 + 8; x < WH.x1; x += 8) roofSeams.push(seg([x, WH.y0 + 1, 30], [x, WH.y1 - 1, 30]));
const roof = box(WH.x0, WH.x1, WH.y0, WH.y1, 0, 30, { tone: "hi", crease: "lo", className: "st-white", inner: L(roofSeams.join(""), { tone: "faint" }) }, 0.6)
  + box(WH.x0 + 6, WH.x0 + 14, WH.y0 + 6, WH.y0 + 12, 30, 33, HI, 0.6, 2, 0.4) + box(WH.x1 - 14, WH.x1 - 6, WH.y0 + 6, WH.y0 + 12, 30, 33, HI, 0.6, 2, 0.4)
  + `<g transform="${topM(0, 8, 30.2)}">${lockup(3.4, { mark: false })}</g>`;
const docks = [8, 20].map((x) => box(x - 4, x + 4, WH.y1, WH.y1 + 1.2, 0, 10, MID, 0.2)).join("");
const sx = (x) => at([x, 0, 0])[0];
const wipe = `<linearGradient id="ls-wipe-grad" data-wipe gradientUnits="userSpaceOnUse" x1="${(sx(WH.x0) - 400).toFixed(1)}" y1="0" x2="${(sx(WH.x0) - 340).toFixed(1)}" y2="0"><stop offset="0" stop-color="#000"/><stop offset=".5" stop-color="#555"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="ls-wipe" maskUnits="userSpaceOnUse" x="${(sx(WH.x0) - 80).toFixed(1)}" y="0" width="${(sx(WH.x1) - sx(WH.x0) + 160).toFixed(1)}" height="${H}"><rect x="${(sx(WH.x0) - 80).toFixed(1)}" y="0" width="${(sx(WH.x1) - sx(WH.x0) + 160).toFixed(1)}" height="${H}" fill="url(#ls-wipe-grad)"/></mask>`;
const [tgx, tgy] = at([WH.x1 - 2, WH.y0 - 6, 31]);
const counter = g(`data-count-tag transform="translate(${tgx.toFixed(1)} ${tgy.toFixed(1)})" style="opacity:0"`, `<rect class="ls-tag" x="-104" y="-15" width="104" height="30" rx="15"/><circle class="ls-tag-dot" cx="-88" cy="0" r="4"/><text class="ls-tag-text" x="-78" y="5" data-count>0</text><text class="ls-tag-unit" x="-34" y="5">units</text>`);

/* ---------- the store and the customer's home ---------- */
const store = box(STORE.x0, STORE.x1, STORE.y0, STORE.y1, 0, 18, WHITE, 0.6, 2, 0.4)
  + [0, 1, 2, 3, 4, 5].map((n) => box(STORE.x0 + n * 5, STORE.x0 + n * 5 + 5, STORE.y1, STORE.y1 + 3.4, 12, 12.6, { tone: "hi", crease: "none", className: n % 2 ? "st-white" : "ls-awning" }, 0.05)).join("")
  + box(STORE.x0 + 4, STORE.x0 + 12, STORE.y0 + 4, STORE.y0 + 10, 18, 20, HI, 0.4);
const hcx = (HOUSE.x0 + HOUSE.x1) / 2, hcy = (HOUSE.y0 + HOUSE.y1) / 2;
const house = box(HOUSE.x0, HOUSE.x1, HOUSE.y0, HOUSE.y1, 0, 16, WHITE, 0.6)
  + L(poly([[HOUSE.x0, HOUSE.y0, 16.1], [hcx - 4, hcy, 16.1], [HOUSE.x0, HOUSE.y1, 16.1]], false) + poly([[HOUSE.x1, HOUSE.y0, 16.1], [hcx + 4, hcy, 16.1], [HOUSE.x1, HOUSE.y1, 16.1]], false) + seg([hcx - 4, hcy, 16.1], [hcx + 4, hcy, 16.1]), { tone: "lo" })
  + box(hcx - 2, hcx + 2, HOUSE.y1, HOUSE.y1 + 1.4, 0, 8, MID, 0.2);
// a few trees, set back from everything
const lobed = (cx, cy, R, n, amp, ph) => Array.from({ length: n * 6 }, (_, i) => { const a = (i / (n * 6)) * Math.PI * 2, rr = R * (1 - amp + amp * Math.abs(Math.cos((a * n) / 2 + ph))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
const pth = (pts) => "M" + pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
const tree = (x, y, r = 6) => { const [cx, cy] = at([x, y, 20]), R = r * K, ph = (x * 0.3) % 3; return `<g class="st-tree"><path class="st-crown" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/><path class="st-crown-lit" d="${pth(lobed(cx - R * 0.15, cy - R * 0.15, R * 0.72, 7, 0.15, ph + 1))}"/><path class="iso-line" data-tone="lo" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/></g>`; };
const trees = [[-70, -40], [-62, 4], [64, -36], [74, 4], [-140, 0], [140, -20], [-30, 64], [60, 64], [140, 64], [-190, -40], [-230, 10], [-200, 70], [180, 20], [220, -40], [200, 70], [250, 10], [-260, -60], [270, -70]].map(([x, y]) => tree(x, y)).join("");

/* ---------- data lines: store → warehouse → home; the order pulse runs along the first ---------- */
const round = (pts, r = 8) => { const out = [pts[0]]; for (let i = 1; i < pts.length - 1; i++) { const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]]; const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]); const p1 = [b[0] + (a[0] - b[0]) / l1 * r, b[1] + (a[1] - b[1]) / l1 * r], p2 = [b[0] + (c[0] - b[0]) / l2 * r, b[1] + (c[1] - b[1]) / l2 * r]; for (let t = 0; t <= 1.0001; t += 0.125) { const u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]); } } out.push(pts[pts.length - 1]); return out; };
const SYNC = round([[STORE.x1, -30], [-70, -30], [-70, -16], [WH.x0, -16]], 6);
const LINK = round([[WH.x1, -16], [80, -16], [80, 2], [HOUSE.x0, 2]], 6);
const lines = `<path class="ls-data" d="${pathD(SYNC)}"/><path class="ls-data" d="${pathD(LINK)}"/>`
  + D([sp(...SYNC[0]), sp(...SYNC[SYNC.length - 1]), sp(...LINK[0]), sp(...LINK[LINK.length - 1])], { size: 0.6 });
const pulse = `<path class="ls-pulse-trail" data-sync-trail d="${pathD(SYNC)}"/><g data-pulse style="opacity:0"><circle class="ls-pulse-glow" r="11"/><circle class="ls-pulse" r="4"/></g>`;

/* ---------- order card over the store; the bill of lading over the home ---------- */
const card = (cx, cy, w, hh, inner, attr) => g(`${attr} transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})" style="opacity:0"`, `<g class="ls-card-in"><rect class="ls-card" x="${-w / 2}" y="${-hh}" width="${w}" height="${hh}" rx="10"/>${inner}</g>`);
const [scx, scy] = at([(STORE.x0 + STORE.x1) / 2, STORE.y0 - 4, 30]);
const orderCard = card(scx, scy, 118, 62, `<circle class="ls-tag-dot" cx="-43" cy="-44" r="4"/><rect class="ls-card-line strong" x="-33" y="-48" width="58" height="7" rx="3.5"/><rect class="ls-card-line" x="-45" y="-30" width="90" height="5" rx="2.5"/><rect class="ls-card-line" x="-45" y="-20" width="64" height="5" rx="2.5"/>`, 'data-order-card');
const [hcxs, hcys] = at([hcx, HOUSE.y0 - 4, 30]);
const sig = `<path class="ls-sign" data-sign d="M-40 -26 C-34 -40 -28 -14 -20 -28 S-6 -36 2 -24 S14 -22 22 -30"/>`;
const check = `<g data-check style="opacity:0"><circle class="ls-check-bg" cx="38" cy="-62" r="10"/><path class="ls-check" d="M33 -62 L37 -58 L44 -66"/></g>`;
const bolCard = card(hcxs, hcys, 120, 84, `<text class="ls-card-title" x="-46" y="-60">BOL</text><rect class="ls-card-line" x="-46" y="-50" width="80" height="5" rx="2.5"/><rect class="ls-card-line" x="-46" y="-40" width="56" height="5" rx="2.5"/><path class="ls-sign-line" d="M-46 -18 H40"/>${sig}${check}`, 'data-bol-card');

/* ---------- the van and its route ---------- */
const ROUTE = round([[DOCK[0], DOCK[1] + 4], [DOCK[0], ROAD_Y + 2], [hcx, ROAD_Y + 2], [hcx, HOUSE.y1 + 9]], 10);
// the van's way is asphalt all along, so it never cuts a corner off the road
const routeBand = `<path class="ls-road-route" style="stroke-width:${(RW * 2 * K).toFixed(1)}" d="${pathD(round([[DOCK[0], WH.y1], [DOCK[0], ROAD_Y + 2], [hcx, ROAD_Y + 2], [hcx, HOUSE.y1]], 14))}"/>`;
const route = `<path class="ls-route" data-route d="${pathD(ROUTE)}"/>`;
// the van drawn heading east at the origin; the page turns and moves it
const Pv = { ...P, origin: at([0, 0, 0]) };
const vh = helpers(Pv);
const vanBody = vh.box(-11, 4, -4.4, 4.4, 2, 18, { tone: "hi", crease: "lo", lit: true, className: "ls-van" }, 0.8, 2, 0.4)
  + vh.box(4, 10.6, -4.2, 4.2, 2, 15, { tone: "hi", crease: "lo", lit: true, className: "ls-van" }, 1.4, 3, 0.4)
  + vh.box(8.4, 10.2, -3.6, 3.6, 15, 15.2, { tone: "mid", crease: "none", className: "st-glass" }, 0.4)
  + vh.box(5, 6.4, -5.4, -4.2, 12, 13, { tone: "mid" }, 0.2) + vh.box(5, 6.4, 4.2, 5.4, 12, 13, { tone: "mid" }, 0.2);
const [vx0, vy0] = at([0, 0, 0]);
const NV = nightKit(vh, "lsv");
const vanLights = NV.defs + NV.headlights(10.8, 3.2, 6, { reach: 44, ground: 0.2 }) + NV.tail([-11.3, -3.2, 6], 1.3) + NV.tail([-11.3, 3.2, 6], 1.3);
const van = g(`data-van data-o="${vx0.toFixed(2)} ${vy0.toFixed(2)}" style="opacity:0"`, `<path class="st-shadow" d="${vh.poly([[-11.6, -5, 0], [11, -5, 0], [11, 5, 0], [-11.6, 5, 0]])}"/>` + vanLights + vanBody + vanDetailOf());


/* ---------- the detail pass ---------- */
// the warehouse roof: a parapet, two skylight strips, fans on the roof units, drains at the corners
const fan = (x, y) => L(k.ring(x, y, 2.2, 33.1, P, 24), { tone: "lo" }) + L([0, 1, 2, 3, 4, 5].map((n) => { const a = n / 6 * Math.PI * 2; return seg([x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5, 33.1], [x + Math.cos(a) * 2, y + Math.sin(a) * 2, 33.1]); }).join(""), { tone: "faint" }) + D([at([x, y, 33.1])], { size: 0.5 });
const roofDetail = L(k.planOutline(k.insetPlan({ x: WH.x0, y: WH.y0, w: WH.x1 - WH.x0, d: WH.y1 - WH.y0, r: 0.6 }, 1.4), 30, P, 2), { tone: "lo" })
  + [-16, -2].map((y) => box(WH.x0 + 22, WH.x1 - 22, y, y + 2.4, 30, 30.4, { tone: "mid", crease: "none", className: "st-glass nt-win" }, 0.4)).join("")
  + fan(WH.x0 + 10, WH.y0 + 9) + fan(WH.x1 - 10, WH.y0 + 9)
  + D([[WH.x0 + 3, WH.y0 + 3], [WH.x1 - 3, WH.y0 + 3], [WH.x0 + 3, WH.y1 - 3], [WH.x1 - 3, WH.y1 - 3]].map(([x, y]) => at([x, y, 30])), { size: 0.55 });
// dock canopies over the doors, a bollard either side
const dockDetail = [8, 20].map((x) => box(x - 5, x + 5, WH.y1, WH.y1 + 3.2, 12, 12.6, HI, 0.3) + cylZ(x - 5.6, WH.y1 + 2.6, 0, 6, 0.5, MID, 12) + cylZ(x + 5.6, WH.y1 + 2.6, 0, 6, 0.5, MID, 12)).join("");
// the store: a parapet, an entrance canopy, a roof unit with its fan
const storeDetail = L(k.planOutline(k.insetPlan({ x: STORE.x0, y: STORE.y0, w: STORE.x1 - STORE.x0, d: STORE.y1 - STORE.y0, r: 0.6 }, 1.2), 18, P, 2), { tone: "lo" })
  + box(STORE.x0 + 18, STORE.x0 + 26, STORE.y0 + 4, STORE.y0 + 11, 18, 20.6, HI, 0.5, 2, 0.3) + L(k.ring(STORE.x0 + 22, STORE.y0 + 7.5, 2, 20.7, P, 20), { tone: "lo" });
// the home: a hip roof in four lit facets, a chimney, a porch step
const R = { x0: HOUSE.x0, x1: HOUSE.x1, y0: HOUSE.y0, y1: HOUSE.y1 }, rz = 16.2, ra = [hcx - 4, hcy], rb = [hcx + 4, hcy];
const facet = (pts, cls) => `<path class="${cls}" d="${poly(pts.map(([x, y]) => [x, y, rz]))}"/>`;
const houseRoof = facet([[R.x0, R.y0], [R.x1, R.y0], rb, ra], "ls-roof-n") + facet([[R.x0, R.y1], [R.x1, R.y1], rb, ra], "ls-roof-s")
  + facet([[R.x0, R.y0], ra, [R.x0, R.y1]], "ls-roof-w") + facet([[R.x1, R.y0], rb, [R.x1, R.y1]], "ls-roof-e")
  + L(poly([[R.x0, R.y0, rz], ra, [R.x0, R.y1, rz]].map((p) => p.length === 2 ? [p[0], p[1], rz] : p), false) + poly([[R.x1, R.y0, rz], [rb[0], rb[1], rz], [R.x1, R.y1, rz]], false) + seg([ra[0], ra[1], rz], [rb[0], rb[1], rz]), { tone: "lo" })
  + L(poly([[R.x0, R.y0, rz], [R.x1, R.y0, rz], [R.x1, R.y1, rz], [R.x0, R.y1, rz]]), { tone: "mid" })
  + box(hcx + 6, hcx + 8.6, hcy - 7, hcy - 4.4, 16.2, 19, HI, 0.2) + box(hcx - 3, hcx + 3, R.y1 + 1.4, R.y1 + 3.2, 0, 1.2, MID, 0.3);
// the van's roof: panel seams and a vent
function vanDetailOf() { return vh.L([-7, -3, 1].map((x) => vh.seg([x, -4.2, 18.05], [x, 4.2, 18.05])).join(""), { tone: "faint" }) + vh.box(-5.6, -3.4, -1.4, 1.4, 18, 18.8, HI, 0.4); }

/* ---------- night: lamp pools along the road, the house and the store glow warm ---------- */
const nightMap = [];
for (let x = -300; x <= 300; x += 60) for (const y of [ROAD_Y - RW - 2, ROAD_Y + RW + 2]) if (![DOCK[0], -115, 112].some((c) => Math.abs(x - c) < 14)) nightMap.push(N.pool([x, y, 0.9], 13, 13) + N.lamp([x, y + (y < ROAD_Y ? -1.4 : 1.4), 1.2], 2.2));
nightMap.push(N.glow([(HOUSE.x0 + HOUSE.x1) / 2, (HOUSE.y0 + HOUSE.y1) / 2, 2], 30, 28, "warm"), N.glow([(STORE.x0 + STORE.x1) / 2, (STORE.y0 + STORE.y1) / 2, 2], 28, 26, "warm"));
/* ---------- assemble ---------- */
const body = [
  N.defs,
  `<defs>${wipe}</defs>`,
  `<g data-fit>`,
  ground.join(""), nightMap.join(""), routeBand, dashes, trees, lines, route, docks + dockDetail,
  g('class="ls-bp"', bp.join("") + slotRing + g(`data-pallet-wrap`, pallet)),
  g('data-roof', roof + roofDetail),
  store + storeDetail, house + houseRoof, pulse, van, counter, orderCard, bolCard,
  `</g>`,
];
const svg = k.figureSvg({ width: W, height: H, className: "iso-svg fp-svg st-svg ls-svg", label: "A control map seen from above: an order pulse runs from the store to the ShipNoble warehouse, the roof peels back to show the racks and the stock count, a pallet slots into its bay, a van follows its route to the customer, and a signed bill of lading appears at the door.", body });
const ro = at([0, 0, 0]);
const data = {
  scene: "lms", xs: [0, 1, 2, 3, 4], locs: ["SYNC", "STOCK", "SLOT", "FLEET", "BOL"], ax: [0, 0], vb: [W, H], k: +K.toFixed(5), o: ro.map((v) => +v.toFixed(2)),
  sync: SYNC.map((p) => sp(...p)), route: ROUTE.map((p) => sp(...p)), wipe: [sx(WH.x0) - 40, sx(WH.x1) + 40].map((v) => +v.toFixed(1)),
  slot: sp(slotBay.x + 2.5, slotBay.y + 3.5), aisle: sp(slotBay.x + 2.5, 2.5), count: 1248,
};
writeFileSync(join(OUT, "fig-lms.svg"), svg);
writeFileSync(join(OUT, "fig-lms.json"), JSON.stringify(data));
writeFileSync(join(HERE, "out", "fig-lms.html"), k.pageHtml({ title: "lms", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><link rel="stylesheet" href="../../assets/fx.css"><div class="iso-stage">${svg.replaceAll('href="assets/', 'href="../../assets/')}</div>`, width: 1200 }));
console.log("wrote fig-lms", (svg.length / 1024).toFixed(0) + " KB");
