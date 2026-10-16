// Fig 1 · One order down one line (anatomy kit).
// A straight conveyor runs past four stations and into a trailer; one tote rides it.
// node tools/floor-figure.mjs   → assets/floor-figure.svg + .json, tools/out/floor-verify.html
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const SKILL = join(os.homedir(), ".claude/skills/anatomy");
const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
mkdirSync(join(HERE, "out"), { recursive: true });

const WIDTH = 820, HEIGHT = 400;

/* ---------- world: x runs along the line, y toward the viewer, z up ---------- */
const PLATE = { x: -246, y: -78, w: 512, d: 140, r: 10 }, PLATE_H = 10, FOOT_H = 5;
const BELT = { x: -232, y: 16, w: 388, d: 28 }, BELT_Z = 14;          // top of the belt
const RACK = { x: -232, y: -66, w: 84, d: 30 }, RACK_TOP = 94, LEVELS = [0, 32, 62];
const PICK = { x: -126, y: -44, w: 62, d: 36, r: 1.5 }, TABLE_H = 28;
const COLD = { x: -40, y: -68, w: 78, d: 62, r: 3 }, COLD_H = 64;
const CDOOR = { x0: -20, x1: 18, top: 50 };
const BENCH = { x: 54, y: -44, w: 74, d: 36, r: 1.5 };
const TRUCK = { x: 160, y: 3, w: 100, d: 52, r: 2 }, TRUCK_Z = 12, TRUCK_H = 62;
const STOPS = [
  { loc: "A-03", x: -190 },
  { loc: "C-06", x: -95 },
  { loc: "CZ-02", x: -1 },
  { loc: "PK-01", x: 91 },
  { loc: "DOCK 1", x: 184 },
];
const LINE_Y = BELT.y + BELT.d / 2;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [RACK.x, RACK.y, RACK_TOP], [COLD.x + COLD.w, COLD.y, COLD_H + 12], [TRUCK.x + TRUCK.w, TRUCK.y, TRUCK_Z + TRUCK_H]],
  WIDTH, HEIGHT, { pad: 22, azimuth: 72, elevation: 30 }
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const seg = (a, b) => k.segment(a, b, P);
const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
const byDepth = (pts) => [...pts].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
const target = (loc, svg) => `<g data-target="${loc}">${svg}</g>`;

/* ---------- base plate ---------- */
const base = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H, PLATE_H, P)}"/>`];
base.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid", className: "fp-plate" }));
base.push(L(k.planOutline(k.insetPlan(PLATE, 6), 0, P), { tone: "faint" }));

/* ---------- stations, back to front ---------- */
const st = [];

// A-03 · pallet rack, two bays, three levels
{
  const bayW = RACK.w / 2, r = [];
  const upright = (x) => {
    const out = [];
    const ya = RACK.y + 1.5, yb = RACK.y + RACK.d - 1.5, br = [];
    for (let z = 6; z < RACK_TOP - 16; z += 26) br.push(seg([x, ya, z], [x, yb, z + 13]), seg([x, yb, z + 13], [x, ya, z + 26]));
    out.push(L(br.join(""), { tone: "lo" }));
    for (const y of [RACK.y, RACK.y + RACK.d - 3]) out.push(S(k.slabOf({ x: x - 1.5, y, w: 3, d: 3, r: 0.3 }, 0, RACK_TOP, P, 2), { tone: "mid" }));
    return out.join("");
  };
  r.push(upright(RACK.x));
  for (let b = 0; b < 2; b++) {
    const x0 = RACK.x + b * bayW + 2, x1 = x0 + bayW - 4;
    LEVELS.forEach((lz, li) => {
      if (li) r.push(S(k.slabOf({ x: x0, y: RACK.y, w: x1 - x0, d: 2.6, r: 0.3 }, lz - 4, 4, P, 2), { tone: "mid" }));
      const pal = { x: x0 + 3, y: RACK.y + 3, w: x1 - x0 - 6, d: RACK.d - 6, r: 0.4 };
      r.push(S(k.slabOf(pal, lz, 4, P, 2), { tone: "lo" }));
      const tall = li === 2 ? 20 : 24, boxes = [];
      for (let c = 0; c < 2; c++) {
        const box = { x: pal.x + 1 + c * (pal.w - 2) / 2, y: pal.y + 1, w: (pal.w - 2) / 2 - 1, d: pal.d - 2, r: 0.4 };
        boxes.push(S(k.slabOf(box, lz + 4, tall, P, 2, 0.4), { tone: "hi", crease: "lo" }));
        boxes.push(L(k.lineOnTop([box.x, box.y + box.d / 2], [box.x + box.w, box.y + box.d / 2], lz + 4 + tall, P), { tone: "lo" }));
      }
      r.push(b === 1 && li === 0 ? target("A-03", boxes.join("")) : boxes.join(""));
      if (li) r.push(S(k.slabOf({ x: x0, y: RACK.y + RACK.d - 2.6, w: x1 - x0, d: 2.6, r: 0.3 }, lz - 4, 4, P, 2), { tone: "mid" }));
    });
    r.push(upright(RACK.x + (b + 1) * bayW));
  }
  st.push(r.join(""));
}

// C-06 · pick station: table, screen, scanner and the order tote
{
  const t = [`<path class="iso-halo" d="${k.haloOf(PICK, 0, 2, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PICK, 4))) t.push(S(k.slabOf({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.4 }, 0, TABLE_H - 3, P, 2), { tone: "mid", crease: "none" }));
  t.push(S(k.slabOf(k.insetPlan(PICK, 4), 9, 1.4, P, 2), { tone: "lo" }));
  t.push(S(k.slabOf(PICK, TABLE_H - 3, 3, P, 3, 0.5), { tone: "mid" }));
  const post = [PICK.x + 14, PICK.y + 6];
  t.push(S(k.cylinder(post[0], post[1], 1.4, TABLE_H, 14, P, 12), { tone: "mid", crease: "none" }));
  const screen = { x: PICK.x + 2, y: PICK.y + 7.6, w: 24, d: 1.6, r: 0.3 };
  t.push(S(k.slabOf(screen, TABLE_H + 12, 16, P, 2, 0.2), { tone: "mid" }));
  const tote = { x: PICK.x + 32, y: PICK.y + 8, w: 22, d: 18, r: 1 };
  t.push(target("C-06", S(k.slabOf(tote, TABLE_H, 11, P, 3, 0.4), { tone: "hi", crease: "lo" }) + L(k.planOutline(k.insetPlan(tote, 1.6), TABLE_H + 11, P, 3), { tone: "lo" })));
  const gun = [PICK.x + 16, PICK.y + 26];
  t.push(S(k.slabOf({ x: gun[0] - 6, y: gun[1] - 2, w: 12, d: 4, r: 1 }, TABLE_H, 2.4, P, 2), { tone: "lo" }));
  t.push(S(k.cylinder(gun[0] + 3, gun[1], 1.6, TABLE_H + 2.4, 3, P, 12), { tone: "mid" }));
  st.push(t.join(""));
}

// CZ-02 · cold room with a strip curtain facing the line
{
  const c = [`<path class="iso-halo" d="${k.haloOf(COLD, 0, 2, P)}"/>`];
  const fy = COLD.y + COLD.d, fx = COLD.x + COLD.w;
  const seams = [];
  for (let x = COLD.x + 13; x < fx - 6; x += 13) if (x < CDOOR.x0 - 6 || x > CDOOR.x1 + 6) seams.push(seg([x, fy, 0], [x, fy, COLD_H]));
  for (let y = COLD.y + 15.5; y < fy - 6; y += 15.5) seams.push(seg([fx, y, 0], [fx, y, COLD_H]));
  c.push(S(k.slabOf(COLD, 0, COLD_H, P, 3, 0.8), { tone: "hi", crease: "lo", inner: L(seams.join(""), { tone: "faint" }) }));
  c.push(S(k.slabOf({ x: CDOOR.x0 - 4, y: fy, w: 4, d: 2.4, r: 0.4 }, 0, CDOOR.top + 4, P, 2), { tone: "mid" }));
  c.push(S(k.slabOf({ x: CDOOR.x1, y: fy, w: 4, d: 2.4, r: 0.4 }, 0, CDOOR.top + 4, P, 2), { tone: "mid" }));
  const strips = [];
  for (let x = CDOOR.x0 + 3.8; x < CDOOR.x1 - 1; x += 3.8) strips.push(seg([x, fy + 0.4, 0.6], [x, fy + 0.4, CDOOR.top]));
  c.push(S(k.slabOf({ x: CDOOR.x0, y: fy, w: CDOOR.x1 - CDOOR.x0, d: 0.4, r: 0 }, 0, CDOOR.top, P, 1), { tone: "lo", crease: "none" }));
  c.push(target("CZ-02", L(strips.join(""), { tone: "mid" })));
  c.push(S(k.slabOf({ x: CDOOR.x0 - 4, y: fy, w: CDOOR.x1 - CDOOR.x0 + 8, d: 2.6, r: 0.4 }, CDOOR.top, 4, P, 2), { tone: "mid" }));
  const ev = { x: COLD.x + 14, y: COLD.y + 16, w: 50, d: 28, r: 2 };
  c.push(S(k.slabOf(ev, COLD_H, 10, P, 3, 0.6), { tone: "mid" }));
  for (const ex of [ev.x + 13, ev.x + 37]) {
    c.push(L(k.ring(ex, ev.y + ev.d / 2, 9, COLD_H + 10, P, 32) + k.ring(ex, ev.y + ev.d / 2, 2.6, COLD_H + 10, P, 14), { tone: "lo" }));
    c.push(D([at([ex, ev.y + ev.d / 2, COLD_H + 10])], { size: 0.5 }));
  }
  st.push(c.join(""));
}

// PK-01 · packing bench: a carton, tape and a roll of wrap
{
  const b = [`<path class="iso-halo" d="${k.haloOf(BENCH, 0, 2, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BENCH, 4))) b.push(S(k.slabOf({ x: x - 1.5, y: y - 1.5, w: 3, d: 3, r: 0.4 }, 0, TABLE_H - 3, P, 2), { tone: "mid", crease: "none" }));
  b.push(S(k.slabOf(k.insetPlan(BENCH, 4), 9, 1.4, P, 2), { tone: "lo" }));
  b.push(S(k.slabOf(BENCH, TABLE_H - 3, 3, P, 3, 0.5), { tone: "mid" }));
  b.push(S(k.cylinder(BENCH.x + 12, BENCH.y + 10, 5, TABLE_H, 18, P, 22), { tone: "hi", crease: "lo", inner: L(k.sideArc(BENCH.x + 12, BENCH.y + 10, 5, TABLE_H + 9, P, 16), { tone: "faint" }) }));
  const box = { x: BENCH.x + 26, y: BENCH.y + 8, w: 28, d: 22, r: 0.4 };
  b.push(target("PK-01", S(k.slabOf(box, TABLE_H, 15, P, 2, 0.4), { tone: "hi", crease: "lo" }) + L(k.lineOnTop([box.x + box.w / 2, box.y], [box.x + box.w / 2, box.y + box.d], TABLE_H + 15, P), { tone: "lo" })));
  b.push(S(k.slabOf({ x: BENCH.x + 58, y: BENCH.y + 20, w: 12, d: 6, r: 1 }, TABLE_H, 4, P, 2), { tone: "mid" }));
  b.push(S(k.cylinder(BENCH.x + 64, BENCH.y + 23, 3.4, TABLE_H + 4, 3, P, 16), { tone: "lo" }));
  st.push(b.join(""));
}

/* ---------- the conveyor ---------- */
const belt = [];
{
  const legs = [];
  for (let x = BELT.x + 8; x < BELT.x + BELT.w; x += 64) for (const y of [BELT.y + 1, BELT.y + BELT.d - 4]) legs.push([x, y]);
  for (const [x, y] of byDepth(legs)) belt.push(S(k.slabOf({ x, y, w: 3, d: 3, r: 0.3 }, 0, BELT_Z - 4, P, 2), { tone: "mid", crease: "none" }));
  belt.push(S(k.slabOf({ ...BELT, r: 1 }, BELT_Z - 4, 4, P, 3, 0.4), { tone: "mid" }));
  const top = { x: BELT.x + 1, y: BELT.y + 3, w: BELT.w - 2, d: BELT.d - 6, r: 0.5 };
  const rollers = [];
  for (let x = top.x + 6; x < top.x + top.w - 3; x += 7) rollers.push(k.lineOnTop([x, top.y], [x, top.y + top.d], BELT_Z, P));
  belt.push(S(k.slabOf(top, BELT_Z - 0.01, 0.01, P, 2), { tone: "lo", crease: "none", flat: true, className: "fp-road", inner: L(rollers.join(""), { tone: "faint" }) }));
  // stop marks on the near rail, one per station
  const marks = STOPS.map((s, i) => `<g data-stop="${i}">${S(k.slabOf({ x: s.x - 4, y: BELT.y + BELT.d - 3, w: 8, d: 3, r: 0.3 }, BELT_Z + 3, 0.6, P, 2), { tone: "hi", crease: "none" })}</g>`).join("");
  for (const y of [BELT.y, BELT.y + BELT.d - 3]) belt.push(S(k.slabOf({ x: BELT.x, y, w: BELT.w, d: 3, r: 0.4 }, BELT_Z - 1, 4, P, 2, 0.3), { tone: "mid" }));
  belt.push(marks);
  belt.push(D([BELT.x + 4, BELT.x + BELT.w - 4].map((x) => at([x, BELT.y + BELT.d - 1.5, BELT_Z + 3])), { size: 0.45 }));
}

/* ---------- the tote: the one lit part, built at x = 0 on the line ---------- */
const TOTE = (() => {
  const t = [];
  const body = { x: -11, y: LINE_Y - 9, w: 22, d: 18, r: 1.2 };
  t.push(S(k.slabOf(body, BELT_Z, 13, P, 3, 0.4), { tone: "hi", lit: true, inner: L(k.sideSeam(body, BELT_Z + 9.5, P, 3), { tone: "lo" }) }));
  t.push(L(k.planOutline(k.insetPlan(body, 1.8), BELT_Z + 13, P, 3), { tone: "lo" }));
  return t.join("");
})();

/* ---------- DOCK 1 · the trailer the line feeds ---------- */
const truck = [];
{
  truck.push(`<path class="iso-halo" d="${k.haloOf(TRUCK, 0, 2, P)}"/>`);
  for (const [x, y] of byDepth([[TRUCK.x + 66, TRUCK.y + 4], [TRUCK.x + 82, TRUCK.y + 4], [TRUCK.x + 66, TRUCK.y + TRUCK.d - 8], [TRUCK.x + 82, TRUCK.y + TRUCK.d - 8]]))
    truck.push(S(k.slabOf({ x: x - 6, y, w: 12, d: 4, r: 1.6 }, 0, TRUCK_Z, P, 3, 0.4), { tone: "lo" }));
  const fy = TRUCK.y + TRUCK.d, fx = TRUCK.x + TRUCK.w;
  const ribs = [];
  for (let x = TRUCK.x + 12; x < fx - 4; x += 12) ribs.push(seg([x, fy, TRUCK_Z], [x, fy, TRUCK_Z + TRUCK_H]));
  ribs.push(seg([fx, TRUCK.y + TRUCK.d / 2, TRUCK_Z], [fx, TRUCK.y + TRUCK.d / 2, TRUCK_Z + TRUCK_H]));
  truck.push(target("DOCK 1", S(k.slabOf(TRUCK, TRUCK_Z, TRUCK_H, P, 3, 0.8), { tone: "hi", crease: "lo", inner: L(ribs.join(""), { tone: "faint" }) })));
  truck.push(L(k.planOutline(k.insetPlan(TRUCK, 4), TRUCK_Z + TRUCK_H, P, 3), { tone: "faint" }));
  // dock bumpers either side of the belt where it enters
  for (const y of [BELT.y - 8, BELT.y + BELT.d + 3]) truck.push(S(k.slabOf({ x: TRUCK.x - 3, y, w: 3, d: 5, r: 0.8 }, TRUCK_Z + 2, 10, P, 2, 0.3), { tone: "lo" }));
}

/* ---------- assemble: stations, belt, tote, trailer ---------- */
const body = [
  base.join(""),
  `<g class="fp-stations">${st.join("")}</g>`,
  belt.join(""),
  `<g class="fp-cart" data-part="cart">${TOTE}</g>`,
  truck.join(""),
];
const LABEL = "A straight conveyor on a base plate. One tote rides it past a pallet rack, a pick station, a cold room and a packing bench, then into a trailer at the dock.";
const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, className: "fp-svg", label: LABEL, body });

const o0 = at([0, 0, 0]), ux = at([1, 0, 0]);
const DATA = { ax: [+(ux[0] - o0[0]).toFixed(5), +(ux[1] - o0[1]).toFixed(5)], xs: STOPS.map((s) => s.x), locs: STOPS.map((s) => s.loc) };

writeFileSync(join(OUT, "floor-figure.svg"), svg);
writeFileSync(join(OUT, "floor-figure.json"), JSON.stringify(DATA));
const plate = k.plateHtml({ fig: "Fig 1", title: "One order, five stops", hint: "Scroll", readout: "At A-03", caption: LABEL, body: `<div class="iso-stage">${svg}</div>` });
writeFileSync(join(HERE, "out", "floor-verify.html"), k.pageHtml({ title: "Floor model", theme: "light", body: plate, script: kitScript(), width: 900 }));
console.log("wrote floor-figure.svg", (svg.length / 1024).toFixed(0) + " KB");
