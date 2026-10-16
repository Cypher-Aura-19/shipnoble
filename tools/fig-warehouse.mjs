// Warehousing · Fig 1, drawn like the home page: a side cutaway of one ShipNoble warehouse, front wall removed.
// A-03 (a pallet comes in through the receiving door, is scanned, the stock count ticks up, the turret truck puts it
// away in A-03) · C-06 (the truck lifts an empty pick pallet to C-06 and takes two cartons) · CZ-02 (it drives into the
// cold room and takes a chilled carton; the readout holds at 4 °C) · PK-01 (the cartons are kitted into one branded
// box, taped and labelled) · DOCK 1 (the box rolls into the ShipNoble truck, the dock door closes, the truck pulls away).
// Moving parts are groups the page drives (assets/fig-scenes.js, "warehouse"); every state is a function of scroll.
// node tools/fig-warehouse.mjs → assets/fig-warehouse.svg + .json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./fig-lib.mjs";
import { helpers, lockup } from "./fig-story.mjs";
import { nightKit } from "./night.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
const W = 1200, H = 520;
const P = k.fitProjection([[-70, 0, -4], [400, 0, -4], [-70, 0, 64], [400, 0, 64]], W, H, { pad: 12, azimuth: 90, elevation: 7 });
const h = helpers(P);
const { at, box, L, D, seg, poly, sideM, discY, cylZ } = h;
const HI = { tone: "hi", crease: "lo" }, MID = { tone: "mid" }, LO = { tone: "lo" };
const WHITE = { tone: "hi", crease: "lo", className: "st-white" };
const o = at([0, 0, 0]);
const N = nightKit(h, "wh");
const g = (attrs, inner) => `<g ${attrs}>${inner}</g>`;
const face = (x0, x1, y, z0, z1, cls) => `<path class="${cls}" d="${poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])}"/>`;
const text = (x, y, z, size, str, cls = "st-word", anchor = "middle", attrs = "") => `<g transform="${sideM(x, y, z)}"><text class="${cls}" x="0" y="0" font-size="${size}" text-anchor="${anchor}" ${attrs}>${str}</text></g>`;
const plate = (x, z, str, y = -9.8, w = 7.6) => box(x - w / 2, x + w / 2, y - 0.3, y, z - 2.2, z, WHITE, 0.2) + text(x, y + 0.02, z - 1.66, 1.5, str, "st-word wh-code");

/* ---------- dimensions (dm) ---------- */
const B = { x0: -42, x1: 264, back: -30, cut: 14, roof: 58 };     // the building; the front wall is cut away at y = cut
const RACK = { x0: 10, x1: 100, y0: -22, y1: -10, bays: [10, 28, 46, 64, 82, 100], levels: [14, 28] };
const A03 = { x: 55, z: 28 }, C06 = { x: 91, z: 14 };
const COLD = { x0: 118, x1: 178, top: 44, shelf: { x0: 128, x1: 172, y0: -26, y1: -18, levels: [6, 16, 26] } };
const CZ02 = { x: 160, z: 16 };
const BENCH = { x0: 198, x1: 232, z: 9 }, BOX_X = 214;
const DOCK = { x: 262, door: 34 };
const TRUCK = { x0: 268, cargo: 332, x1: 350, floor: 9, roof: 34 };
const INBOUND = { x: 1, y0: -33 };                             // the pallet waits behind the receiving door
const PAL = { l: 12, w: 10, base: 1.4, load: 11 };
const FORK = 8.3;                                               // load centre ahead of the truck's mast
const STOPS = { rest: -25, a03: A03.x - FORK, c06: C06.x - FORK, cz02: CZ02.x - FORK, bench: 185 };

/* ---------- the building: back wall, floor, high windows, columns, pendant lamps ---------- */
const wh = [];
wh.push(`<path class="st-paper-fill" d="${poly([[B.x0, B.back, 0], [B.x1, B.back, 0], [B.x1, B.back, B.roof], [B.x0, B.back, B.roof]])}"/>`);
wh.push(box(B.x0, B.x1, B.back, B.cut, -0.3, 0, { tone: "hi", crease: "none", className: "st-wall" }, 0.05));
wh.push(box(B.x0, B.x1, B.back + 0.1, B.back + 0.6, 0, 1.4, MID, 0.1));
const joints = []; for (let x = -30; x < B.x1; x += 24) joints.push(seg([x, B.back, 0], [x, B.cut, 0]));
wh.push(L(joints.join(""), { tone: "faint" }));
for (let x = -34; x < B.x1 - 24; x += 26) wh.push(box(x, x + 20, B.back + 0.05, B.back + 0.4, 48, 53, { tone: "mid", crease: "lo", className: "st-glass" }, 0.2) + L(seg([x + 10, B.back + 0.42, 48], [x + 10, B.back + 0.42, 53]), { tone: "lo" }));
for (const x of [108, 188]) wh.push(box(x - 1.2, x + 1.2, B.back + 0.6, B.back + 3, 0, B.roof, MID, 0.2) + box(x - 2, x + 2, B.back + 0.4, B.back + 3.6, 0, 0.6, MID, 0.2));
// roof beams seen from below, and lamps hanging from them
const beams = []; for (let x = -24; x < B.x1; x += 40) beams.push(box(x - 0.6, x + 0.6, B.back, B.cut, B.roof - 2.4, B.roof, MID, 0.05));
wh.push(beams.join(""));
for (const x of [-24, 56, 136, 216]) wh.push(N.pool([x, -6, 0.1], 26, 14, "pool", [x, -4, 50.2]) + N.lamp([x, -4, 50.2], 4.2));
for (const x of [-24, 56, 136, 216]) wh.push(L(seg([x, -6, B.roof - 2.4], [x, -6, 51.6]), { tone: "lo" }) + box(x - 2, x + 2, -8, -4, 50.4, 51.6, HI, 0.8) + D([at([x, -4, 50.4])], { size: 0.5 }));

/* ---------- receiving: the back-wall door, the roller bed, the scan arch, the stock screen ---------- */
const recv = [];
recv.push(face(INBOUND.x - 9, INBOUND.x + 9, B.back + 0.08, 0, 24, "wh-opening"));
recv.push(box(INBOUND.x - 10, INBOUND.x - 9, B.back, B.back + 0.8, 0, 25, MID, 0.1) + box(INBOUND.x + 9, INBOUND.x + 10, B.back, B.back + 0.8, 0, 25, MID, 0.1) + box(INBOUND.x - 10, INBOUND.x + 10, B.back, B.back + 0.8, 24, 25.4, MID, 0.1));
recv.push(box(INBOUND.x - 10.6, INBOUND.x + 10.6, B.back + 0.8, B.back + 3, 25.4, 28, { tone: "mid", className: "st-drum" }, 0.4));
const rollers = []; for (let y = B.back + 1; y < -1; y += 2.2) rollers.push(seg([INBOUND.x - 6.4, y, 1.42], [INBOUND.x + 6.4, y, 1.42]));
recv.push(box(INBOUND.x - 7, INBOUND.x + 7, B.back + 0.8, -1, 0, 1.4, HI, 0.2) + L(rollers.join(""), { tone: "faint" }));
// the door: slats in the opening, clipped from the top as it rolls up
const doorSlats = []; for (let z = 2; z < 24; z += 2) doorSlats.push(seg([INBOUND.x - 9, B.back + 0.12, z], [INBOUND.x + 9, B.back + 0.12, z]));
const dTop = at([INBOUND.x - 9, B.back, 24]), dBot = at([INBOUND.x + 9, B.back, 0]);
const recvDoor = `<clipPath id="wh-door-clip"><rect data-door-rect x="${dTop[0].toFixed(1)}" y="${dTop[1].toFixed(1)}" width="${(dBot[0] - dTop[0]).toFixed(1)}" height="${(dBot[1] - dTop[1]).toFixed(1)}" data-h="${(dBot[1] - dTop[1]).toFixed(2)}"/></clipPath>`
  + g('clip-path="url(#wh-door-clip)"', face(INBOUND.x - 9, INBOUND.x + 9, B.back + 0.1, 0, 24, "wh-door") + L(doorSlats.join(""), { tone: "lo" }));
// the scan arch over the roller bed
const SCAN_Y = -18;
recv.push(box(INBOUND.x - 9, INBOUND.x - 8, SCAN_Y - 0.5, SCAN_Y + 0.5, 0, 19, MID, 0.1) + box(INBOUND.x + 8, INBOUND.x + 9, SCAN_Y - 0.5, SCAN_Y + 0.5, 0, 19, MID, 0.1) + box(INBOUND.x - 9.4, INBOUND.x + 9.4, SCAN_Y - 0.7, SCAN_Y + 0.7, 18.6, 20, HI, 0.3));
recv.push(box(INBOUND.x - 2, INBOUND.x + 2, SCAN_Y + 0.7, SCAN_Y + 1.1, 18.8, 19.8, { tone: "lo", crease: "none", className: "ec-screen" }, 0.1));
const scan = `<path class="st-scan" data-scan d="${poly([[INBOUND.x - 7.6, SCAN_Y, 0], [INBOUND.x + 7.6, SCAN_Y, 0]], false)}" style="opacity:0"/>`;
// the stock screen on the back wall
const SC = { x0: INBOUND.x - 12, x1: INBOUND.x + 12, z0: 31, z1: 42 };
recv.push(box(SC.x0 - 0.6, SC.x1 + 0.6, B.back + 0.4, B.back + 1.4, SC.z0 - 0.6, SC.z1 + 0.6, { tone: "mid", crease: "lo" }, 0.4) + face(SC.x0, SC.x1, B.back + 1.42, SC.z0, SC.z1, "wh-screen"));
recv.push(text(SC.x0 + 1.6, B.back + 1.44, SC.z1 - 2.6, 1.3, "STOCK ON HAND", "wh-screen-label", "start"));
recv.push(text(SC.x0 + 1.6, B.back + 1.44, SC.z0 + 2.6, 4.4, "1,248", "wh-screen-count", "start", "data-count"));
recv.push(face(SC.x1 - 5.6, SC.x1 - 1.6, B.back + 1.44, SC.z1 - 3.4, SC.z1 - 2.6, "wh-screen-bar"));
recv.push(g('data-screen-glow style="opacity:0"', face(SC.x0, SC.x1, B.back + 1.46, SC.z0, SC.z1, "ec-glow-fill")));
recv.push(box(INBOUND.x - 1.2, INBOUND.x + 1.2, B.back, B.back + 0.4, SC.z1 + 0.6, B.roof - 2.4, MID, 0.05));

/* ---------- the rack: uprights, beams, pallets in their bays, location plates ---------- */
const palletBase = (cls = "") => box(-PAL.l / 2, PAL.l / 2, -PAL.w / 2, PAL.w / 2, 0, 0.3, MID, 0.1)
  + [-PAL.l / 2 + 0.7, 0, PAL.l / 2 - 0.7].map((x) => box(x - 0.7, x + 0.7, -PAL.w / 2, PAL.w / 2, 0.3, 1.1, MID, 0.1)).join("")
  + box(-PAL.l / 2, PAL.l / 2, -PAL.w / 2, PAL.w / 2, 1.1, PAL.base, { tone: "mid", crease: "lo", className: cls }, 0.1);
const load = (lit) => {
  const lx = PAL.l / 2 - 0.3, ly = PAL.w / 2 - 0.3, zt = PAL.base + PAL.load;
  const seams = [seg([-lx, ly + 0.02, PAL.base + PAL.load / 2], [lx, ly + 0.02, PAL.base + PAL.load / 2]), seg([0, ly + 0.02, PAL.base], [0, ly + 0.02, zt])];
  return box(-lx, lx, -ly, ly, PAL.base, zt, { tone: "hi", crease: "lo", lit, className: lit ? "rt-carton" : "st-carton", inner: L(seams.join(""), { tone: "faint" }) }, 0.2);
};
const placed = (svg, x, y, z) => { const q = at([x, y, z]); return `<g transform="translate(${(q[0] - o[0]).toFixed(2)} ${(q[1] - o[1]).toFixed(2)})">${svg}</g>`; };
const rack = [];
for (const x of RACK.bays) {
  rack.push(box(x - 0.6, x + 0.6, RACK.y0, RACK.y1, 0, 44, MID, 0.1) + box(x - 1.2, x + 1.2, RACK.y0 - 0.6, RACK.y1 + 0.6, 0, 0.4, MID, 0.2));
  rack.push(D(Array.from({ length: 22 }, (_, i) => at([x, RACK.y1 + 0.02, 1.4 + i * 1.95])), { size: 0.3, tone: "lo" }));
}
for (const z of RACK.levels) rack.push(box(RACK.x0, RACK.x1, RACK.y0, RACK.y1, z - 1, z, { tone: "hi", crease: "lo", className: "wh-beam" }, 0.1));
rack.push(box(RACK.x0, RACK.x1, RACK.y0, RACK.y1, 43, 44, MID, 0.1));
for (const [x, z] of [[19, 0], [37, 0], [73, 0], [91, 0], [19, 14], [37, 14], [55, 14], [73, 14], [19, 28], [37, 28], [73, 28], [91, 28]]) rack.push(placed(palletBase() + load(false), x, -16, z));
// C-06: a pick face, a pallet of loose cartons; the two on top are picked
const CTN = { l: 4.6, w: 6, h: 4 };
const carton = (lit, cls = "") => box(-CTN.l / 2, CTN.l / 2, -CTN.w / 2, CTN.w / 2, 0, CTN.h, { tone: "hi", crease: "lo", lit, className: cls || (lit ? "rt-carton" : "st-carton") }, 0.2, 2, 0.1) + L(seg([-CTN.l / 2, CTN.w / 2 + 0.02, CTN.h * 0.72], [CTN.l / 2, CTN.w / 2 + 0.02, CTN.h * 0.72]), { tone: "faint" });
rack.push(placed(palletBase(), C06.x, -16, C06.z));
for (const x of [-3.6, 0, 3.6]) rack.push(placed(carton(false), C06.x + x * 1.25, -16, C06.z + PAL.base));
const PICKS = [{ x: C06.x - 2.6, y: -16, z: C06.z + PAL.base + CTN.h }, { x: C06.x + 2.6, y: -16, z: C06.z + PAL.base + CTN.h }];
rack.push(g('data-a03 style="opacity:0"', placed(palletBase("rt-pallet") + load(true), A03.x, -16, A03.z)));
rack.push(plate(A03.x, A03.z + 0.2, "A-03") + plate(C06.x, C06.z + 0.2, "C-06"));
// the slot lights: a soft orange frame in the bay opening
const slotLight = (x0, x1, z0, z1, name) => g(`data-slot="${name}" style="opacity:0"`, `<path class="wh-slot" d="${poly([[x0, RACK.y1 + 0.1, z0], [x1, RACK.y1 + 0.1, z0], [x1, RACK.y1 + 0.1, z1], [x0, RACK.y1 + 0.1, z1]])}"/>`);
const slots = slotLight(A03.x - 8.2, A03.x + 8.2, A03.z + 0.2, A03.z + 14.4, "a03") + slotLight(C06.x - 8.2, C06.x + 8.2, C06.z + 0.2, C06.z + 13.6, "c06");

/* ---------- the cold room: insulated walls, a glass front, a strip curtain at each door, shelving, the readout ---------- */
const cold = [], coldFront = [];
cold.push(face(COLD.x0 + 2, COLD.x1 - 2, B.back + 0.2, 0, COLD.top, "wh-cold"));
cold.push(box(COLD.x0 + 2, COLD.x1 - 2, B.back, 12, 0, 0.12, { tone: "hi", crease: "none", className: "wh-cold-floor" }, 0.02));
const S = COLD.shelf;
for (const x of [S.x0, (S.x0 + S.x1) / 2, S.x1]) cold.push(box(x - 0.4, x + 0.4, S.y0, S.y1, 0, 32, MID, 0.05));
for (const z of S.levels) {
  cold.push(box(S.x0, S.x1, S.y0, S.y1, z - 0.4, z, HI, 0.05));
  for (let x = S.x0 + 3; x < S.x1 - 1; x += 5.4) if (!(z === CZ02.z && Math.abs(x - CZ02.x) < 2.8)) cold.push(placed(box(-2.2, 2.2, -3, 3, 0, 4.4, { tone: "hi", crease: "lo", className: "wh-chill" }, 0.2), x, -22, z));
}
cold.push(box(S.x0, S.x1, S.y0, S.y1, 31.6, 32, HI, 0.05));
for (const [x0, x1] of [[COLD.x0, COLD.x0 + 2], [COLD.x1 - 2, COLD.x1]]) {
  cold.push(box(x0, x1, B.back, -12, 0, COLD.top, { tone: "hi", crease: "lo", className: "wh-panel" }, 0.1));
  coldFront.push(box(x0, x1, -12, 12, 41, COLD.top, { tone: "hi", crease: "lo", className: "wh-panel" }, 0.1));
}
coldFront.push(box(COLD.x0, COLD.x1, B.back, 12, COLD.top, COLD.top + 2, { tone: "hi", crease: "lo", className: "wh-panel" }, 0.2));
// the glass front, with mullions and a few highlights
coldFront.push(face(COLD.x0 + 2, COLD.x1 - 2, 11.9, 0, COLD.top, "wh-glass"));
const glint = []; for (const x of [126, 152, 166]) glint.push(poly([[x, 11.95, 6], [x + 6, 11.95, 34]], false));
coldFront.push(`<path class="wh-glint" d="${glint.join("")}"/>`);
for (const x of [COLD.x0 + 1.6, (COLD.x0 + COLD.x1) / 2, COLD.x1 - 1.6]) coldFront.push(box(x - 0.4, x + 0.4, 11.6, 12.2, 0, COLD.top, MID, 0.05));
coldFront.push(box(COLD.x0 + 2, COLD.x1 - 2, 11.6, 12.2, 0, 1.2, MID, 0.05));
// strip curtains in both door openings, seen edge on
const strips = (x) => g('data-strips', box(x - 0.5, x + 0.5, -12, 11.4, 0.6, 41, { tone: "hi", crease: "none", className: "wh-strip" }, 0.05));
coldFront.push(strips(COLD.x0 + 1) + strips(COLD.x1 - 1));
// the readout on the header: 4.0 °C
const RD = { x: (COLD.x0 + COLD.x1) / 2, z: COLD.top + 2 };
coldFront.push(box(RD.x - 9, RD.x + 9, 11, 12.4, RD.z, RD.z + 6, { tone: "mid", crease: "lo" }, 0.4) + face(RD.x - 8.2, RD.x + 8.2, 12.42, RD.z + 0.8, RD.z + 5.2, "wh-screen"));
coldFront.push(text(RD.x - 6.2, 12.44, RD.z + 1.6, 3, "4.0°C", "wh-screen-count", "start") + g('data-temp-dot', `<circle class="wh-temp-dot" cx="${at([RD.x + 6.2, 12.44, RD.z + 3])[0].toFixed(1)}" cy="${at([RD.x + 6.2, 12.44, RD.z + 3])[1].toFixed(1)}" r="${(h.cam.k * 0.6).toFixed(2)}"/>`));
coldFront.push(plate(CZ02.x, CZ02.z - 0.4, "CZ-02", 11.4, 8.4));
cold.push(N.glow([148, -18, 22], 30, 24, "cool"));
recv.push(N.glow([(SC.x0 + SC.x1) / 2, B.back + 1.5, (SC.z0 + SC.z1) / 2], 16, 10, "cool"));
const czLight = g('data-slot="cz02" style="opacity:0"', `<path class="wh-slot" d="${poly([[CZ02.x - 3.2, S.y1 + 0.1, CZ02.z + 0.1], [CZ02.x + 3.2, S.y1 + 0.1, CZ02.z + 0.1], [CZ02.x + 3.2, S.y1 + 0.1, CZ02.z + 5.6], [CZ02.x - 3.2, S.y1 + 0.1, CZ02.z + 5.6]])}"/>`);
const CHILL = { x: CZ02.x, y: -22, z: CZ02.z };

/* ---------- the kitting bench and the dock conveyor ---------- */
const bench = [];
for (const x of [BENCH.x0 + 1, BENCH.x1 - 2]) bench.push(box(x, x + 1, -6, -5, 0, BENCH.z - 0.8, MID, 0.1) + box(x, x + 1, 4, 5, 0, BENCH.z - 0.8, MID, 0.1));
bench.push(box(BENCH.x0 + 1, BENCH.x1 - 1, -6, 5, 2.4, 2.9, MID, 0.1));
bench.push(box(BENCH.x0, BENCH.x1, -7, 6, BENCH.z - 0.8, BENCH.z, HI, 0.3));
// the tape dispenser, the label printer and a stack of flat boxes on the bench
bench.push(box(BENCH.x0 + 2, BENCH.x0 + 7, -6, -1.4, BENCH.z, BENCH.z + 2.2, MID, 0.4) + box(BENCH.x0 + 2.4, BENCH.x0 + 6.6, -5, -2.4, BENCH.z + 2.2, BENCH.z + 3.4, { tone: "hi", crease: "lo", className: "wh-tape-roll" }, 0.5));
bench.push(box(BENCH.x1 - 9, BENCH.x1 - 2, -6, -1, BENCH.z, BENCH.z + 4.4, WHITE, 0.6, 2, 0.3) + box(BENCH.x1 - 7.6, BENCH.x1 - 3.4, -1.02, -0.98, BENCH.z + 2.8, BENCH.z + 3.6, LO, 0.1));
bench.push(box(BENCH.x0 + 1.6, BENCH.x0 + 9, 1, 5.4, BENCH.z, BENCH.z + 1.2, { tone: "hi", crease: "lo", className: "wh-kraft" }, 0.1));
bench.push(plate((BENCH.x0 + BENCH.x1) / 2, BENCH.z - 1, "PK-01", 6.1, 8.4));
// the roller conveyor from the bench, through the dock door, to the truck's floor
const CONV = { x0: BENCH.x1, x1: DOCK.x + 2, z: BENCH.z };
const conv = [];
for (let x = CONV.x0 + 4; x < CONV.x1; x += 12) conv.push(box(x, x + 1, -4.4, -3.4, 0, CONV.z - 1.2, MID, 0.1) + box(x - 0.6, x + 1.6, -4.8, -3, 0, 0.4, MID, 0.2));
conv.push(box(CONV.x0, CONV.x1, -5, 5, CONV.z - 1.6, CONV.z - 0.3, HI, 0.3));
conv.push(box(CONV.x0 + 0.6, CONV.x1 - 0.6, -4.4, 4.4, CONV.z - 0.3, CONV.z, { tone: "hi", crease: "none", className: "fp-road" }, 0.1));
conv.push(D(Array.from({ length: 13 }, (_, i) => at([CONV.x0 + 1.4 + i * 2.4, 5.02, CONV.z - 0.9])), { size: 0.32, tone: "lo" }));
const roll = `<path class="ec-roll" data-belt-roll d="${poly([[CONV.x0 + 1, 5.05, CONV.z - 1.2], [CONV.x1 - 1, 5.05, CONV.z - 1.2]], false)}"/>`;

/* ---------- the turret truck: a man-up cab and fork head that ride the mast together ---------- */
const tt = [], ttLift = [], ttFront = [];
const wheel = (x, r, near) => { const y0 = near ? 3.6 : -5, y1 = near ? 5 : -3.6; let s = discY(x, y0, y1, r, r, LO); if (near) s += discY(x, y1, y1 + 0.3, r, r * 0.55, MID) + discY(x, y1 + 0.3, y1 + 0.5, r, r * 0.2, HI); return s; };
tt.push(wheel(-11, 2.2, false), wheel(0.6, 2, false));
tt.push(box(-1, 1.6, -4.4, -3.4, 1, 40, MID, 0.1));                                                 // far upright
tt.push(box(-15.6, 2.6, -4.8, 4.8, 1.2, 7.4, WHITE, 1, 2, 0.4));                                   // chassis
tt.push(`<path class="st-stripe" d="${poly([[-15, 4.82, 4.4], [2, 4.82, 4.4], [2, 4.82, 5.2], [-15, 4.82, 5.2]])}"/>`);
tt.push(box(-16.2, -15.4, -4.4, 4.4, 1.2, 5, MID, 0.3) + box(-14.6, -10, -3, 3, 7.4, 8.2, MID, 0.4));
ttLift.push(box(-13.4, 0.4, -4.6, 4.6, 7.4, 8.2, HI, 0.3));                                        // cab floor
ttLift.push(box(-13.4, -12.6, -4.6, -3.8, 8.2, 18.4, MID, 0.1) + box(-13.4, -12.6, 3.8, 4.6, 8.2, 18.4, MID, 0.1));
ttLift.push(box(-3, 0.2, -3.4, 3.4, 8.2, 12.8, { tone: "hi", crease: "lo", className: "st-white" }, 0.4) + box(-2.6, -0.4, -1, 1, 12.8, 13.2, LO, 0.2));
ttLift.push(box(-13.8, 0.6, -4.9, 4.9, 18.4, 19.2, HI, 0.3));                                      // overhead guard
ttLift.push(box(-13.2, 0.2, 4.2, 4.6, 12.2, 12.8, MID, 0.05) + box(-0.4, 0.2, 3.8, 4.6, 8.2, 18.4, MID, 0.1));   // near rail and post
ttLift.push(box(1.6, 2.4, -4, 4, 0.6, 8.4, MID, 0.2) + box(1.6, 2.4, -4, 4, 6.6, 7.2, LO, 0.05));   // carriage
ttLift.push(box(2.4, 14, -3.4, -2.2, 0.6, 1.1, MID, 0.1) + box(2.4, 14, 2.2, 3.4, 0.6, 1.1, MID, 0.1));
ttFront.push(box(-1, 1.6, 3.4, 4.4, 1, 40, MID, 0.1) + box(-1, 1.6, -4.4, 4.4, 39, 40, MID, 0.1) + box(-0.4, 0.8, 0.4, 1.6, 7.4, 30, LO, 0.1));
ttFront.push(wheel(-11, 2.2, true), wheel(0.6, 2, true));
ttFront.push(D([at([-15.4, 4.82, 6.4]), at([2.2, 4.82, 6.4])], { size: 0.5 }) + box(-6, -2, -1, 1, 40, 41, { tone: "hi", crease: "lo", className: "wh-beacon" }, 0.3));

/* ---------- the moving loads: the inbound pallet, the pick pallet, the cartons, the box ---------- */
const inbound = g('data-inbound style="opacity:0"', palletBase("rt-pallet") + load(true));
const pickBase = g('data-pickbase', palletBase());
const picks = [...PICKS, CHILL].map((p, i) => g(`data-pick="${i}"`, i === 2 ? box(-2.2, 2.2, -3, 3, 0, 4.4, { tone: "hi", crease: "lo", lit: true, className: "wh-chill wh-chill--lit" }, 0.2) : carton(true)));
// the box: open with its flaps up, then taped and labelled; the ShipNoble mark on its side
const BX = { l: 9, w: 7, h: 6.4 };
const boxBody = box(-BX.l / 2, BX.l / 2, -BX.w / 2, BX.w / 2, 0, BX.h, { tone: "hi", crease: "lo", className: "wh-box" }, 0.2, 2, 0.1)
  + `<g transform="${sideM(-1.2, BX.w / 2 + 0.03, BX.h * 0.55)}">${lockup(0.7, { word: false })}</g>`;
const [hL, hR] = [at([-BX.l / 2, BX.w / 2, BX.h]), at([BX.l / 2, BX.w / 2, BX.h])];
const flapW = (BX.l / 2) * h.cam.k, flapT = 0.5 * h.cam.k;
const flap = (side) => { const [hx, hy] = side === "l" ? hL : hR; const x = side === "l" ? hx : hx - flapW; return `<g data-flap="${side}" data-c="${hx.toFixed(2)} ${hy.toFixed(2)}"><rect class="wh-flap" x="${x.toFixed(2)}" y="${(hy - flapT).toFixed(2)}" width="${flapW.toFixed(2)}" height="${flapT.toFixed(2)}"/></g>`; };
const tapeD = poly([[-BX.l / 2 - 0.1, BX.w / 2 + 0.05, BX.h + 0.3], [BX.l / 2 + 0.1, BX.w / 2 + 0.05, BX.h + 0.3]], false);
const labelSvg = g('data-label style="opacity:0"', face(1, BX.l / 2 - 0.6, BX.w / 2 + 0.04, 1.2, 3.8, "wh-label") + L([1.6, 2.1, 2.6].map((z) => seg([1.6, BX.w / 2 + 0.06, z], [3.6, BX.w / 2 + 0.06, z])).join(""), { tone: "lo" }));
const parcel = g('data-box style="opacity:0"', boxBody + labelSvg + flap("l") + flap("r") + `<path class="ec-tape" data-tape d="${tapeD}"/>`);

/* ---------- dock 1: the door in the end wall (seen in section), the canopy, the truck ---------- */
const doorCut = (z0, z1) => `<g class="st-door"><path class="st-face" d="${poly([[DOCK.x + 0.3, B.cut, z0], [DOCK.x + 1.7, B.cut, z0], [DOCK.x + 1.7, B.cut, z1], [DOCK.x + 0.3, B.cut, z1]])}"/></g>`;
const dTop2 = at([DOCK.x, B.cut, DOCK.door]), dBot2 = at([DOCK.x + 2, B.cut, 0]);
const dockDoor = `<clipPath id="wh-dock-clip"><rect data-dock-rect x="${(dTop2[0] - 2).toFixed(1)}" y="${dTop2[1].toFixed(1)}" width="${(dBot2[0] - dTop2[0] + 4).toFixed(1)}" height="0" data-h="${(dBot2[1] - dTop2[1]).toFixed(2)}"/></clipPath>` + g('clip-path="url(#wh-dock-clip)"', doorCut(0, DOCK.door));
const canopyLight = N.pool([DOCK.x + 9, 4, 0.2], 18, 12, "pool", [DOCK.x + 8, 11, DOCK.door + 1.6]) + N.lamp([DOCK.x + 8, 11, DOCK.door + 1.6], 3.4);
const canopy = box(DOCK.x + 2, DOCK.x + 14, -12, 12, DOCK.door + 2, DOCK.door + 3, HI, 0.3) + box(DOCK.x + 2, DOCK.x + 3, 9, 11, 12, 13.6, LO, 0.2) + box(DOCK.x + 2, DOCK.x + 3, -11, -9, 12, 13.6, LO, 0.2);
const truck = [];
truck.push(discY(TRUCK.x0 + 12, -8, -5.6, 3.4, 3.4, LO), discY(TRUCK.x1 - 10, -8, -5.6, 3.4, 3.4, LO));
truck.push(box(TRUCK.x0, TRUCK.x1 - 1, -8, 8, 2.4, TRUCK.floor, MID, 0.4));
truck.push(box(TRUCK.x0, TRUCK.cargo, -8.4, 8.4, TRUCK.floor, TRUCK.roof, WHITE, 0.8, 2, 0.5));
truck.push(h.prism([[TRUCK.cargo, 2.4], [TRUCK.x1, 2.4], [TRUCK.x1, 11], [TRUCK.x1 - 1.6, 18], [TRUCK.x1 - 6, 23.4], [TRUCK.cargo, 24]], -8, 8, WHITE));
truck.push(`<path class="st-glass-fill" d="${poly([[TRUCK.cargo + 4, 8.05, 14], [TRUCK.x1 - 1.4, 8.05, 14], [TRUCK.x1 - 2.6, 8.05, 18], [TRUCK.x1 - 6.2, 8.05, 22], [TRUCK.cargo + 4, 8.05, 22]])}"/>`);
truck.push(L(poly([[TRUCK.cargo + 1.4, 8.05, 3], [TRUCK.x1 - 1.6, 8.05, 3], [TRUCK.x1 - 1.6, 8.05, 11], [TRUCK.x1 - 3.2, 8.05, 18.4], [TRUCK.x1 - 6.8, 8.05, 23], [TRUCK.cargo + 1.4, 8.05, 23]]), { tone: "lo" }));
truck.push(`<path class="st-stripe" d="${poly([[TRUCK.x0 + 1, 8.45, 12], [TRUCK.cargo - 1, 8.45, 12], [TRUCK.cargo - 1, 8.45, 13.4], [TRUCK.x0 + 1, 8.45, 13.4]])}"/>`);
truck.push(`<g transform="${sideM((TRUCK.x0 + TRUCK.cargo) / 2, 8.46, 23)}">${lockup(2.4)}</g>`);
truck.push(L(seg([TRUCK.x0 + 1.2, 8.45, TRUCK.floor + 0.6], [TRUCK.x0 + 1.2, 8.45, TRUCK.roof - 0.6]) + seg([TRUCK.x0 + 1, 8.45, TRUCK.roof - 1.2], [TRUCK.cargo - 0.6, 8.45, TRUCK.roof - 1.2]), { tone: "faint" }));
truck.push(box(TRUCK.x1 - 1.2, TRUCK.x1 + 0.6, -7.6, 7.6, 2.4, 5, MID, 0.6) + box(TRUCK.x1 - 1.8, TRUCK.x1 + 0.2, 5.4, 8, 6.4, 8.2, { tone: "hi", crease: "lo", className: "st-lamp" }, 0.3) + box(TRUCK.x1 - 2.4, TRUCK.x1 - 0.6, 8, 10, 15.6, 19.6, HI, 0.4));
const archT = (x) => { const pts = []; for (let a = 12; a <= 168; a += 12) { const r = (a * Math.PI) / 180; pts.push([x + Math.cos(r) * 4.3, 8.1, 3.4 + Math.sin(r) * 4.3]); } return `<path class="ec-arch" d="${poly(pts, false)}"/>`; };
const spinT = (x) => { const c = at([x, 8, 3.4]); return discY(x, 5.6, 8, 3.4, 3.4, LO) + `<g data-spin data-c="${c[0].toFixed(2)} ${c[1].toFixed(2)}"><circle class="ec-hub" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(h.cam.k * 1.7).toFixed(2)}"/>${[0, 1, 2, 3, 4].map((n) => { const a = n / 5 * Math.PI * 2; return `<circle class="ec-bolt" cx="${(c[0] + Math.cos(a) * h.cam.k * 0.85).toFixed(1)}" cy="${(c[1] + Math.sin(a) * h.cam.k * 0.85).toFixed(1)}" r="${(h.cam.k * 0.2).toFixed(2)}"/>`; }).join("")}</g>`; };
truck.push(N.headlights(TRUCK.x1 + 0.4, 7.4, 7.3) + N.tail([TRUCK.x0 - 0.2, 8.6, 10.2], 1.8) + N.tail([TRUCK.x0 - 0.2, 8.6, 31], 1.2));
const truckNear = archT(TRUCK.x0 + 12) + archT(TRUCK.x1 - 10) + spinT(TRUCK.x0 + 12) + spinT(TRUCK.x1 - 10);

/* ---------- outside: the yard on both sides, the road, trees; the section cut of the building ---------- */
const out = [];
out.push(box(-160, B.x0, -40, 20, -0.6, 0, { tone: "hi", crease: "none", className: "st-yard" }, 0.1));
out.push(box(B.x1, 760, -40, 20, -0.6, 0, { tone: "hi", crease: "none", className: "st-yard" }, 0.1));
out.push(box(B.x1 + 2, 760, -10, 14, 0, 0.2, { tone: "hi", crease: "none", className: "st-road" }, 0.05));
for (let x = B.x1 + 34; x < 760; x += 14) out.push(box(x, x + 7, 1.6, 2.4, 0.2, 0.32, { tone: "hi", crease: "none", className: "st-mark" }, 0.05));
const lobed = (cx, cy, R, n, amp, ph) => Array.from({ length: n * 6 }, (_, i) => { const a = (i / (n * 6)) * Math.PI * 2, rr = R * (1 - amp + amp * Math.abs(Math.cos((a * n) / 2 + ph))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
const pth = (pts) => "M" + pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
const tree = (x, y = -24) => { const [cx, cy] = at([x, y, 22]), R = 7 * h.cam.k, ph = (x * 0.3) % 3; return cylZ(x, y, 0, 17, 0.6, MID, 12) + `<g class="st-tree"><path class="st-crown" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/><path class="st-crown-lit" d="${pth(lobed(cx - R * 0.15, cy - R * 0.15, R * 0.72, 7, 0.15, ph + 1))}"/><path class="iso-line" data-tone="lo" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/></g>`; };
for (const x of [-64, -98, 372, 414, 470, 540, 610]) out.push(tree(x));
const cutFace = (x0, x1, z0, z1) => `<g class="st-cut"><path class="st-face" d="${poly([[x0, B.cut, z0], [x1, B.cut, z0], [x1, B.cut, z1], [x0, B.cut, z1]])}"/></g>`;
const section = cutFace(B.x0, B.x1, -2, 0) + cutFace(B.x0, B.x1, B.roof, B.roof + 2.6) + cutFace(B.x0, B.x0 + 2, 0, B.roof) + cutFace(B.x1 - 2, B.x1, DOCK.door, B.roof);
// the sign on the parapet: the lockup on a white board
const sign = box(-20, 40, B.cut - 1, B.cut, B.roof + 2.6, B.roof + 8.6, WHITE, 0.3) + `<g transform="${sideM(10, B.cut + 0.02, B.roof + 5.6)}">${lockup(2.4)}</g>`;

/* ---------- assemble, back to front ---------- */
const body = [
  N.defs,
  `<defs>${recvDoor.match(/<clipPath[\s\S]*?<\/clipPath>/)[0]}${dockDoor.match(/<clipPath[\s\S]*?<\/clipPath>/)[0]}</defs>`,
  out.join(""), wh.join(""), recv.join(""),
  recvDoor.replace(/<clipPath[\s\S]*?<\/clipPath>/, ""),
  rack.join(""), slots,
  inbound, scan,
  cold.join(""), czLight,
  bench.join(""), conv.join("") + roll,
  g('data-tt', tt.join("") + g('data-tt-lift', ttLift.join("")) + ttFront.join("")),
  pickBase, picks.join(""),
  parcel,
  coldFront.join(""),
  g('data-truck', truck.join("") + truckNear),
  canopy, canopyLight, section, dockDoor.replace(/<clipPath[\s\S]*?<\/clipPath>/, ""), sign,
];
const svg = k.figureSvg({ width: W, height: H, className: "iso-svg fp-svg st-svg ec-svg ls-svg rt-svg wh-svg", label: "A ShipNoble warehouse cut open: a pallet is scanned in and put away in rack slot A-03, a turret truck picks cartons from C-06 and a chilled carton from the cold room, they are kitted into one branded box at PK-01, and the box rolls into a ShipNoble truck at Dock 1, which pulls away.", body });
const data = {
  scene: "warehouse", xs: [0, 1, 2, 3, 4], locs: ["A-03", "C-06", "CZ-02", "PK-01", "DOCK 1"], ax: [0, 0], vb: [W, H], o: o.map((v) => +v.toFixed(2)),
  kx: +h.cam.k.toFixed(5), kz: +(-h.cam.k * h.cam.cosE).toFixed(5), ky: +(h.cam.k * h.cam.sinE).toFixed(5),
  B, A03, C06, CZ02, COLD, BENCH, BOX_X, DOCK, TRUCK, INBOUND, PAL, FORK, STOPS, PICKS, CHILL, CONV, SCAN_Y, BX, count: [1248, 1260],
};
writeFileSync(join(OUT, "fig-warehouse.svg"), svg);
writeFileSync(join(OUT, "fig-warehouse.json"), JSON.stringify(data));
writeFileSync(join(HERE, "out", "fig-warehouse.html"), k.pageHtml({ title: "warehouse", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><link rel="stylesheet" href="../../assets/fx.css"><div class="iso-stage">${svg.replaceAll('href="assets/', 'href="../../assets/')}</div>`, width: 1200 }));
console.log("wrote fig-warehouse", (svg.length / 1024).toFixed(0) + " KB");
