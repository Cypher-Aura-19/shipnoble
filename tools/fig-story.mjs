// Home · the truck story. One model (units: decimetres, x along the truck, y toward the viewer, z up),
// drawn three ways: the side view at the dock (beats 1–3), the camera swing frames (beat 4, tools/render-swing.mjs)
// and the top view at the junction (beat 5). The page (assets/story.js) moves the parts.
// node tools/fig-story.mjs  → assets/story-side.svg, assets/story-top.svg, assets/story.json
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k, G } from "./fig-lib.mjs";
import { nightKit } from "./night.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
mkdirSync(join(HERE, "out"), { recursive: true });

/* ================= dimensions (dm) ================= */
export const T = {
  TW: 12.75, FL: 13.5, ROOF: 40, TL: 130,           // trailer half width, deck top, roof underside, length (rear at x = 0)
  CAB: [141, 165.5], CW: 12.4,                      // cab x range and half width
  wheels: [{ x: 18, r: 5 }, { x: 31.5, r: 5 }, { x: 45, r: 5 }, { x: 114, r: 5.1 }, { x: 151, r: 5.1 }],
  WY: [8, 12.2],                                    // near tyre y range
  KING: 118, LEN: 165.5,
  slots: [122, 108, 94, 80],                        // pallet centres in the trailer, front first
  PAL: { l: 12, w: 10, base: 1.5, load: 12.5 },
};

/* ================= helpers bound to a projection ================= */
export function helpers(P) {
  const cam = k.cameraOf(P);
  const at = (p) => k.iso(p, P);
  const f = (v) => v.toFixed(1);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const seg = (a, b) => k.segment(a, b, P);
  const poly = (pts, closed = true) => pts.map((p, i) => (i ? "L" : "M") + at(p).map(f).join(" ")).join("") + (closed ? "Z" : "");
  const box = (x0, x1, y0, y1, z0, z1, style = { tone: "mid" }, r = 0.3, steps = 2, bevel = 0) =>
    S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: Math.min(r, (x1 - x0) / 2 - 0.01, (y1 - y0) / 2 - 0.01) }, z0, z1 - z0, P, steps, bevel), style);
  const XZ = G.frameOf([0, 0, 0], [0, -1, 0], [1, 0, 0], [0, 0, 1]);
  const prism = (pts, y0, y1, style = { tone: "hi" }) => S(G.prismOf(XZ, pts, -y1, -y0, P), style);
  const discY = (x, y0, y1, z, r, style = { tone: "lo" }) => S(G.disc(0, y1 - y0, r, G.frameAlong([x, y0, z], [0, 1, 0]), P), style);
  const discX = (x0, x1, y, z, r, style = { tone: "mid" }) => S(G.disc(0, x1 - x0, r, G.frameAlong([x0, y, z], [1, 0, 0]), P), style);
  const cylZ = (x, y, z0, z1, r, style = { tone: "mid" }, steps = 20) => S(k.cylinder(x, y, r, z0, z1 - z0, P, steps), style);
  // face matrices: u along +x; on a side face (y = const) v runs down (-z), on a top face (z = const) v runs along +y
  const sideM = (x, y, z) => { const o = at([x, y, z]); return `matrix(${cam.k.toFixed(4)} 0 0 ${(cam.k * cam.cosE).toFixed(4)} ${f(o[0])} ${f(o[1])})`; };
  const topM = (x, y, z) => { const o = at([x, y, z]); return `matrix(${cam.k.toFixed(4)} 0 0 ${(cam.k * cam.sinE).toFixed(4)} ${f(o[0])} ${f(o[1])})`; };
  const depth = (p) => k.depthOf(p, P);
  return { P, cam, at, S, L, D, seg, poly, box, prism, discY, discX, cylZ, sideM, topM, depth, f };
}

const HI = { tone: "hi", crease: "lo" };
const MID = { tone: "mid" };
// a real-world material on top of a tone (story.css paints these in the dock scene only)
const Mt = (style, m) => ({ ...style, className: [style.className, m].filter(Boolean).join(" ") });
const LO = { tone: "lo" };
const GLASS = { tone: "hi", className: "st-glass" };
const WHITE = { tone: "hi", className: "st-white" };

/* ================= the ShipNoble lockup: the mark and the wordmark ================= */
// drawn in face units (1 unit = 1 dm), anchored at its centre; size = cap height of the wordmark
export function lockup(size, { mark = true, word = true, href = "assets/logos/mark.png" } = {}) {
  const m = size * 1.9, gap = size * 0.45, w = word ? size * 6.55 : 0;
  const total = (mark ? m : 0) + (mark && word ? gap : 0) + w;
  let s = "";
  let x = -total / 2;
  if (mark) { s += `<image href="${href}" x="${(x).toFixed(2)}" y="${(-m / 2 - size * 0.05).toFixed(2)}" width="${m.toFixed(2)}" height="${m.toFixed(2)}"/>`; x += m + gap; }
  if (word) s += `<text class="st-word" x="${x.toFixed(2)}" y="${(size * 0.5).toFixed(2)}" font-size="${(size * 1.38).toFixed(2)}" textLength="${w.toFixed(2)}" lengthAdjust="spacingAndGlyphs">SHIPNOBLE</text>`;
  return s;
}

/* ================= a pallet of cartons (bottom centre at the origin) ================= */
export function pallet(H) {
  const { box, L, seg, poly } = H;
  const { l, w, base, load } = T.PAL, hx = l / 2, hy = w / 2, zt = base + load;
  const o = [];
  o.push(box(-hx, hx, -hy, hy, 0, 0.3, Mt(MID, "m-wood"), 0.1));                                          // bottom boards
  for (const x of [-hx + 0.6, 0, hx - 0.6]) o.push(box(x - 0.65, x + 0.65, -hy, hy, 0.3, 1.15, Mt(MID, "m-wood"), 0.1));   // blocks
  o.push(box(-hx, hx, -hy, hy, 1.15, base, Mt(MID, "m-wood"), 0.1));                                       // top deck
  // cartons: a 2 × 3 grid on each face, a corner board at each corner
  const lx = hx - 0.25, ly = hy - 0.25;
  const seams = [];
  for (const z of [base + load / 3, base + (2 * load) / 3]) seams.push(seg([-lx, ly, z], [lx, ly, z]));
  seams.push(seg([0, ly, base], [0, ly, zt]));
  o.push(box(-lx, lx, -ly, ly, base, zt, { tone: "hi", crease: "lo", className: "st-carton m-kraft", inner: L(seams.join(""), { tone: "faint" }) }, 0.2));
  for (const x of [-lx, lx - 0.7]) o.push(box(x, x + 0.7, ly - 0.7, ly + 0.05, base + 0.4, zt - 0.2, { tone: "mid", className: "m-card" }, 0.05));
  // two straps over the top and down the near face
  const st = [];
  for (const x of [-hx / 2, hx / 2]) st.push(poly([[x, ly + 0.06, base + 0.2], [x, ly + 0.06, zt + 0.02], [x, -ly, zt + 0.02]], false));
  o.push(`<path class="st-strap" d="${st.join("")}"/>`);
  return o.join("");
}

/* ================= the forklift (fork heel at the origin, facing +x, on the floor z = 0) ================= */
export function forklift(H) {
  const { box, discY, cylZ, L, seg } = H;
  const o = [];
  const wheel = (x, r, near) => {
    const y0 = near ? 4.2 : -5.6, y1 = near ? 5.6 : -4.2;
    let s = discY(x, y0, y1, r, r, Mt(LO, "m-tyre"));
    if (near) s += discY(x, y1, y1 + 0.3, r, r * 0.55, Mt(MID, "m-rim")) + discY(x, y1 + 0.3, y1 + 0.5, r, r * 0.2, Mt(HI, "m-rim"));
    return s;
  };
  o.push(wheel(-4.4, 3.2, false), wheel(-19.6, 2.5, false));
  for (const y of [-4.8]) o.push(box(-6.6, -5.9, y, y + 0.7, 9.5, 21.6, Mt(MID, "m-dark"), 0.1), box(-18, -17.3, y, y + 0.7, 11.5, 21.6, Mt(MID, "m-dark"), 0.1));   // far guard posts
  o.push(box(-3.4, -2.6, -3.9, -2.9, 0.8, 22.6, Mt(MID, "m-dark"), 0.1));                                  // far mast upright
  o.push(box(-22.2, -2.6, -5, 5, 2, 9.6, { tone: "hi", crease: "lo", className: "m-forklift" }, 0.8, 3, 0.4));         // chassis
  o.push(box(-25.6, -19.5, -5.2, 5.2, 1.6, 11.6, Mt(MID, "m-forklift"), 1.6, 4, 0.4));                          // counterweight
  o.push(box(-19.4, -8.4, -4.4, 4.4, 9.6, 11.6, Mt(HI, "m-forklift"), 0.6, 2, 0.3));                            // hood
  o.push(box(-15.4, -11.2, -2.4, 2.4, 11.6, 13.4, Mt(MID, "m-seat"), 0.6) + box(-16.4, -14.9, -2.4, 2.4, 13.4, 18.2, Mt(MID, "m-seat"), 0.5));   // seat, backrest
  o.push(box(-9.4, -8.6, -0.5, 0.5, 11.6, 15.4, Mt(MID, "m-dark"), 0.2));                                  // steering column
  o.push(box(-10.4, -8, -1.8, 1.8, 15.4, 15.9, Mt(LO, "m-seat"), 0.8));                                    // steering wheel
  o.push(box(-18.6, -5.4, -5, 5, 21.6, 22.5, Mt(MID, "m-dark"), 0.3));                                      // overhead guard roof
  o.push(box(-3.4, -2.6, 2.9, 3.9, 0.8, 22.6, Mt(MID, "m-dark"), 0.1));                                    // near mast upright
  o.push(box(-3.4, -2.6, -3.9, 3.9, 21.6, 22.6, Mt(MID, "m-dark"), 0.1) + box(-3.4, -2.6, -3.9, 3.9, 4, 4.8, Mt(MID, "m-dark"), 0.1));     // mast cross bars
  o.push(box(-3.9, -3.4, 0.6, 1.6, 2, 18, Mt(LO, "m-chrome"), 0.2));                                         // lift cylinder
  for (const y of [4.2]) o.push(box(-6.6, -5.9, y, y + 0.7, 9.5, 21.6, Mt(MID, "m-dark"), 0.1), box(-18, -17.3, y, y + 0.7, 11.5, 21.6, Mt(MID, "m-dark"), 0.1));   // near guard posts
  o.push(wheel(-4.4, 3.2, true), wheel(-19.6, 2.5, true));
  o.push(box(-22.6, -2.4, 5, 5.4, 6.2, 7.2, Mt(MID, "m-dark"), 0.1));                                       // step plate
  return o.join("");
}
// the carriage and forks (lifted by the page); a pallet rides in [data-fork-load]
export function forks(H) {
  const { box } = H;
  const D = Mt(MID, "m-dark"), F = Mt(LO, "m-fork");
  return box(-2.4, -1.2, -4, 4, 0.4, 7, D, 0.15)
    + [-2.4, 0, 2.4].map((y) => box(-2.2, -1.6, y - 0.25, y + 0.25, 7, 12.5, D, 0.05)).join("") + box(-2.2, -1.6, -4, 4, 12, 12.5, D, 0.05)
    + box(-1.4, 11, -3.1, -2.1, 0, 0.5, F, 0.1) + box(-1.4, -0.7, -3.1, -2.1, 0, 5.4, F, 0.1)
    + box(-1.4, 11, 2.1, 3.1, 0, 0.5, F, 0.1) + box(-1.4, -0.7, 2.1, 3.1, 0, 5.4, F, 0.1);
}

/* ================= the truck: a list of parts, each with a depth centre ================= */
// mode "skin": the closed truck as you see it; "bones": what the blueprint wipe reveals (top view)
export function truckParts(H, { side = false, curtain = true, href } = {}) {
  const { box, prism, discY, discX, cylZ, L, D, seg, poly, sideM, topM, at } = H;
  const { TW, FL, ROOF, TL, CW } = T;
  const parts = [];
  const add = (c, svg, tag = "", unit = c[0] > 103 && !/^(inside|far|near|post|curtain|roof)$/.test(tag) ? "tractor" : "trailer") => parts.push({ c, svg, tag, unit });

  // wheels: tyre, rim, hub; the near ones keep their rim and bolts in a [data-spin] group in the side view
  T.wheels.forEach((w, i) => {
    for (const near of [false, true]) {
      const y0 = near ? T.WY[0] : -T.WY[1], y1 = near ? T.WY[1] : -T.WY[0];
      let s = discY(w.x, y0, y1, w.r, w.r, Mt(LO, "m-tyre"));
      if (near) {
        const F = G.frameAlong([w.x, y1, w.r], [0, 1, 0]);
        let rim = discY(w.x, y1, y1 + 0.25, w.r, w.r * 0.64, Mt(MID, "m-rim")) + discY(w.x, y1 + 0.25, y1 + 0.6, w.r, w.r * 0.27, Mt(HI, "m-rim"));
        rim += L(G.circleOf(F, 0.26, w.r * 0.5, H.P, 40), { tone: "lo" });
        rim += D(Array.from({ length: 8 }, (_, n) => at(G.pointOf(F, 0.6, w.r * 0.17, (n / 8) * Math.PI * 2))), { size: 0.42 });
        rim += Array.from({ length: 6 }, (_, n) => { const p = at(G.pointOf(F, 0.26, w.r * 0.42, (n / 6) * Math.PI * 2 + 0.3)); return `<circle class="st-hole" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${(H.cam.k * w.r * 0.07).toFixed(2)}"/>`; }).join("");
        const c = at([w.x, y1, w.r]);
        s += side ? `<g data-spin="${i}" data-c="${c[0].toFixed(2)} ${c[1].toFixed(2)}">${rim}</g>` : rim;
      }
      add([w.x, near ? 10 : -10, w.r], s, near ? "near" : "far", i >= 3 ? "tractor" : "trailer");
    }
  });

  // tractor chassis: rails, fifth wheel, fuel tank, battery box, air tanks
  for (const y of [-5, 3.6]) add([134, y, 9], box(104, 163, y, y + 1.4, 7, 10.5, Mt(MID, "m-chassis"), 0.2));
  add([116, 0, 11], box(110, 122, -5.6, 5.6, 10.5, 11.5, Mt(MID, "m-chassis"), 0.6) + box(108.5, 112, -6, 6, 9.6, 10.6, Mt(LO, "m-chassis"), 0.3));
  add([132, 9.6, 6.8], discX(125, 139, 9.2, 6.8, 3.1, Mt(HI, "m-alu")) + discX(128, 128.6, 9.2, 6.8, 3.25, Mt(MID, "m-chassis")) + discX(135.4, 136, 9.2, 6.8, 3.25, Mt(MID, "m-chassis")));
  add([132, -9.6, 6.8], box(124, 140, -12, -7.5, 4.2, 10, Mt(MID, "m-chassis"), 0.6));
  // drive axle mudguard and flap
  add([114, 10, 11], box(107.6, 120.6, 7.4, 12.6, 10.7, 11.4, Mt(MID, "m-chassis"), 0.5) + box(107.4, 108.1, 7.6, 12.4, 2.4, 10.7, Mt(LO, "m-tyre"), 0.1));

  // trailer chassis: main beams, landing legs, underrun guard, rear bumper, mudflaps, tail lamps
  for (const y of [-5.2, 4]) add([66, y, 9.5], box(3, 128, y, y + 1.2, 8, 11.5, Mt(MID, "m-chassis"), 0.2));
  for (const y of [-11, 9.6]) add([105, y, 6], box(104.2, 105.8, y, y + 1.4, 2.6, 11.5, Mt(MID, "m-chassis"), 0.2) + box(103.4, 106.6, y - 0.4, y + 1.8, 1.6, 2.6, Mt(MID, "m-chassis"), 0.2), "", "trailer");
  add([105.5, 11.6, 6], box(105.8, 107.4, 11, 11.6, 6.4, 7.4, Mt(LO, "m-chassis"), 0.1), "", "trailer");
  add([76, TW - 0.3, 6], box(52, 100, TW - 0.8, TW - 0.2, 5, 6, Mt(MID, "m-alu"), 0.1) + box(52, 100, TW - 0.8, TW - 0.2, 7.8, 8.8, Mt(MID, "m-alu"), 0.1)
    + [56, 76, 96].map((x) => box(x - 0.5, x + 0.5, TW - 1.2, TW - 0.8, 5, 11.5, Mt(LO, "m-chassis"), 0.1)).join(""));
  add([1.6, 0, 5.6], box(0.6, 2.6, -TW + 0.5, TW - 0.5, 4.6, 6.6, Mt(MID, "m-bumper"), 0.3) + [-9, 8].map((y) => box(1.2, 2.2, y, y + 1, 6.6, 11.5, Mt(LO, "m-chassis"), 0.1)).join(""));
  add([2.6, TW - 2, 7.4], box(0.4, 4.8, TW - 3.4, TW - 0.6, 6.7, 8.3, Mt(HI, "m-alu"), 0.2) + box(3.6, 4.6, TW - 0.62, TW - 0.6, 7, 8, LO, 0.05));
  add([11.6, 10, 6], box(11.2, 12, 8, 12.2, 1.6, 10.6, Mt(LO, "m-tyre"), 0.1));

  // trailer body: floor edge, far curtain (seen from inside), bulkhead, rails, posts
  add([65, 0, FL - 0.2], box(0, TL, -TW, TW, FL - 0.6, FL, { tone: "mid", crease: "none", className: "st-floor m-deck" }, 0.1), "inside");
  add([65, -TW + 0.2, 27], box(0.4, TL - 0.4, -TW, -TW + 0.4, FL, ROOF, { tone: "lo", className: "st-inside" }, 0.1), "inside");
  add([129, 0, 27], box(128.6, TL, -TW, TW, FL, ROOF, { tone: "mid", className: "st-inside" }, 0.1), "inside");
  for (const y of [-TW, TW - 1.2]) add([65, y + 0.6, 12.5], box(0, TL, y, y + 1.2, 11.5, FL, Mt(HI, "m-alu"), 0.2), y < 0 ? "far" : "near");
  for (const y of [-TW, TW - 1.4]) add([65, y + 0.7, 40.7], box(0, TL, y, y + 1.4, ROOF, ROOF + 1.5, Mt(HI, "m-alu"), 0.2), y < 0 ? "far" : "near");
  add([65, 0, 41.5], box(0.2, TL - 0.2, -TW + 1, TW - 1, ROOF + 0.4, ROOF + 1.4, { tone: "hi", crease: "none" }, 0.2), "roof");
  for (const x of [0, TL - 1.6]) for (const y of [-TW, TW - 1.4]) add([x + 0.8, y + 0.7, 27], box(x, x + 1.6, y, y + 1.4, FL, ROOF, Mt(HI, "m-alu"), 0.2), y < 0 ? "far" : "near");
  for (const x of [43, 86]) add([x, TW - 1.1, 27], box(x - 0.6, x + 0.6, TW - 1.6, TW - 0.6, FL, ROOF, Mt(MID, "m-alu"), 0.1), "post");
  // buckles on the near rail
  const buckles = [];
  for (let x = 1.6 + 7.3; x < TL - 3; x += 7.3) buckles.push(box(x - 0.45, x + 0.45, TW - 0.05, TW + 0.15, 11.9, 13.1, Mt(MID, "m-dark"), 0.05));
  add([65, TW + 0.1, 12.5], buckles.join(""), "near");

  // the near curtain: white, folds, the orange livery stripe and the ShipNoble lockup
  if (curtain) {
    const C = { x0: 1.6, x1: TL - 1.6, z0: FL + 0.1, z1: ROOF - 0.1, y: TW + 0.06 };
    const folds = [];
    for (let x = C.x0 + 7.3; x < C.x1 - 1; x += 7.3) folds.push(seg([x, C.y + 0.3, C.z0], [x, C.y + 0.3, C.z1]));
    let s = box(C.x0, C.x1, TW - 0.1, TW + 0.3, C.z0, C.z1, { tone: "hi", crease: "none", className: "st-curtain", inner: L(folds.join(""), { tone: "faint" }) }, 0.1);
    s += `<path class="st-stripe" d="${poly([[C.x0, C.y + 0.32, 16.4], [C.x1, C.y + 0.32, 16.4], [C.x1, C.y + 0.32, 17.6], [C.x0, C.y + 0.32, 17.6]])}"/>`;
    s += `<path class="st-stripe st-stripe--thin" d="${poly([[C.x0, C.y + 0.32, 18.4], [C.x1, C.y + 0.32, 18.4], [C.x1, C.y + 0.32, 18.8], [C.x0, C.y + 0.32, 18.8]])}"/>`;
    s += `<g transform="${sideM(TL * 0.5, C.y + 0.32, 28.5)}">${lockup(3.1, { href })}</g>`;
    if (side) {
      s = `<g data-curtain clip-path="url(#st-curtain)">${s}</g>`;
      // the bunched curtain at the moving edge
      const bf = [];
      for (let n = 1; n < 6; n++) bf.push(seg([n * 0.9, C.y + 0.75, C.z0], [n * 0.9, C.y + 0.75, C.z1]));
      s += `<g data-bunch style="opacity:0">${box(0, 5.4, TW - 0.1, TW + 0.7, C.z0, C.z1, { tone: "hi", crease: "none", className: "st-curtain", inner: L(bf.join(""), { tone: "lo" }) }, 0.4)}</g>`;
    }
    add([65, TW + 0.2, 27], s, "curtain");
    T.CUR = C;
  }

  // the roof seen from above: bows as faint seams, the wordmark, the stripe along each edge
  const bows = [];
  for (let x = 10; x < TL - 4; x += 10) bows.push(seg([x, -TW + 1, ROOF + 1.4], [x, TW - 1, ROOF + 1.4]));
  const roofA = Math.max(0, Math.min(1, (H.cam.sinE - 0.2) / 0.3));
  if (!side) add([65, 0, ROOF + 1.6], L(bows.join(""), { tone: "faint" }) + (roofA > 0.01 ? `<g opacity="${roofA.toFixed(3)}" transform="${topM(TL * 0.47, 0, ROOF + 1.45)}">${lockup(3.6, { href, mark: false })}</g>` : ""), "roof");

  // the cab: body, fairing, glass, door, handle, mark, mirror, steps, bumper, lamps, grab handle
  const cab = [[141, 11], [165.5, 11], [165.5, 31], [164.2, 36.2], [162.2, 37.6], [141, 37.6]];
  add([153, 0, 24], prism(cab, -CW, CW, { tone: "hi", crease: "lo", className: "st-white m-cab" }), "cab");
  add([152, 0, 39], prism([[143, 37.6], [161.6, 37.6], [158.4, 41.2], [143, 41.2]], -CW + 0.8, CW - 0.8, { tone: "hi", crease: "lo", className: "st-white m-cab" }), "cab");
  add([164.8, 0, 29], prism([[164.6, 22], [165.6, 22], [165.6, 31], [164.3, 36], [163.8, 35.6]], -CW + 1.2, CW - 1.2, GLASS), "cab");
  const yN = CW + 0.04;
  const sideFace = (pts) => poly(pts.map(([x, z]) => [x, yN, z]));
  add([153, yN, 22], `<path class="st-glass-fill" d="${sideFace([[147.6, 24.8], [159.4, 24.8], [159.4, 32.8], [158.2, 34.2], [147.6, 34.2]])}"/>`
    + L(sideFace([[147.6, 24.8], [159.4, 24.8], [159.4, 32.8], [158.2, 34.2], [147.6, 34.2]]), { tone: "mid" })
    + L(sideFace([[145.6, 11.6], [160.6, 11.6], [160.6, 33.6], [159, 35.4], [145.6, 35.4]]), { tone: "lo" })
    + L(sideFace([[161.4, 12.2], [164.8, 12.2], [164.8, 30.6], [163.6, 35.4], [161.4, 35.4]]), { tone: "faint" })
    + L(sideFace([[141.6, 31.4], [144.6, 31.4], [144.6, 36.8], [141.6, 36.8]]), { tone: "faint" })
    + `<g transform="${sideM(153.1, yN, 18.6)}">${lockup(1.6, { href, word: false })}</g>`, "cabside");
  add([163.6, 0, 37.4], box(159.6, 166.2, -CW + 0.6, CW - 0.6, 36.6, 37.8, Mt(MID, "m-dark"), 0.4), "cab");
  add([150, 0, 41.4], [146, 150, 154].map((x) => box(x - 0.6, x + 0.6, -1, 1, 41.2, 41.8, Mt(MID, "m-amber"), 0.2)).join(""), "cab");
  add([147.6, CW + 0.3, 22], box(146.8, 149.2, CW, CW + 0.5, 21.6, 22.6, Mt(MID, "m-chrome"), 0.2), "cabside");
  add([141.8, CW + 0.4, 22], box(141.4, 142.2, CW, CW + 0.8, 13.6, 30.4, Mt(MID, "m-chrome"), 0.2), "cabside");
  add([165.6, CW + 2.4, 31], box(162.6, 166.8, CW - 0.4, CW + 0.6, 33, 33.8, Mt(MID, "m-dark"), 0.2) + box(165.8, 167.6, CW + 0.6, CW + 2.6, 25.4, 33.4, Mt(HI, "m-dark"), 0.5), "mirror");
  add([143, 9, 7], box(141, 145.4, -CW + 0.4, CW - 0.4, 3.4, 11, Mt(HI, "m-cab"), 0.6) + box(141.4, 145, CW - 0.4, CW, 7, 7.6, Mt(MID, "m-alu"), 0.1) + box(141.4, 145, CW - 0.4, CW, 4, 4.6, Mt(MID, "m-alu"), 0.1), "cab");
  add([161, 0, 7], box(156.8, 165.8, -CW, CW, 3.4, 11, Mt(HI, "m-cab"), 1, 3, 0.4) + box(164.6, 166, -CW + 0.6, CW - 0.6, 3.4, 6, Mt(MID, "m-bumper"), 0.4), "cab");
  add([165.4, CW - 2, 9], box(163.8, 166, CW - 3.6, CW - 0.4, 8, 9.8, { tone: "hi", crease: "lo", className: "st-lamp" }, 0.3), "cab");
  add([151, 10, 11.2], box(145, 157.2, CW - 4.2, CW + 0.2, 10.6, 11.4, Mt(MID, "m-dark"), 0.5), "cab");
  // air lines between the cab and the trailer: two hoses (seen in the gap and from above)
  add([135.6, 2, 30], `<path class="st-hose" d="${poly([[141, 2, 30], [138, 2.6, 28.2], [134.6, 1.4, 29.4], [131.6, 2.2, 28], [130, 2, 27.6]], false)}"/><path class="st-hose st-hose--b" d="${poly([[141, -2, 29], [137.6, -2.6, 27.2], [134.4, -1.4, 28.4], [131.4, -2.2, 27], [130, -2, 26.6]], false)}"/>`, "hose");
  return parts;
}

/* ================= the side view at the dock (beats 1–3) ================= */
function sideView() {
  const W = 1600, H = 540;
  const P = k.fitProjection([[-92, 0, -2], [190, 0, -2], [-92, 0, 86], [190, 0, 86]], W, H, { pad: 18, azimuth: 90, elevation: 4 });
  const h = helpers(P);
  const { at, S, L, D, seg, poly, box, cylZ, discY, sideM } = h;
  const { FL } = T;
  const CUTY = 30;                                   // the section plane through the warehouse
  const world = [], back = [], front = [];

  // ground: the yard slab, joints
  world.push(box(-1.5, 1600, -70, 60, -2.4, 0, { tone: "mid", className: "st-yard" }, 0.4));
  const joints = []; for (let x = 28.5; x < 1600; x += 30) joints.push(seg([x, -70, 0], [x, 60, 0]));
  world.push(L(joints.join(""), { tone: "faint" }));
  // yard light poles behind the truck
  const NS = nightKit(h, "sd");
  for (const x of [232, 470]) world.push(NS.pool([x, -38, 0.2], 46, 30, "pool", [x, -38, 89.2]) + NS.lamp([x, -38, 89.2], 5));
  for (const x of [232, 470]) world.push(cylZ(x, -46, 0, 92, 0.75, Mt(MID, "m-steel")) + box(x - 0.9, x + 0.9, -46, -38, 91.2, 92.2, Mt(MID, "m-steel"), 0.3) + box(x - 2.4, x + 2.4, -40, -36, 89.4, 91.6, Mt(HI, "m-dark"), 0.6) + cylZ(x, -46, 0, 1.6, 2, Mt(MID, "m-concrete")));

  // the warehouse, cut by the section plane: back wall, truss, mezzanine, rack, lift, door, poché
  const X0 = -400, XW = -4, XD = -1.5;
  world.push(box(X0, XW, -62, -60, FL, 74, { tone: "hi", crease: "none", className: "st-wall" }, 0.1));
  const panels = []; for (let x = XW - 12; x > X0; x -= 12) panels.push(seg([x, -60, FL], [x, -60, 74]));
  world.push(L(panels.join(""), { tone: "faint" }));
  // steel truss under the roof
  {
    const yT = -24, b0 = 66, b1 = 67, t0 = 72.6;
    const tr = [box(X0, XW, yT - 0.4, yT + 0.4, b0, b1, Mt(MID, "m-truss"), 0.05), box(X0, XW, yT - 0.4, yT + 0.4, t0, t0 + 1, Mt(MID, "m-truss"), 0.05)];
    const web = [];
    for (let x = XW - 1; x - 12 > X0; x -= 12) { tr.push(box(x - 0.5, x, yT - 0.4, yT + 0.4, b1, t0, Mt(MID, "m-truss"), 0.05)); web.push(seg([x - 0.5, yT + 0.4, b1], [x - 11.5, yT + 0.4, t0])); }
    world.push(tr.join("") + L(web.join(""), { tone: "lo" }));
    // two pendant lamps hanging from the bottom chord
    for (const x of [-49.5, -85.5]) world.push(NS.pool([x, -20, FL + 0.15], 30, 22, "pool", [x, yT + 2, 59.8]) + NS.lamp([x, yT + 2, 59.8], 4.4));
    for (const x of [-49.5, -85.5]) world.push(L(seg([x, yT + 0.4, b0], [x, yT + 0.4, 61.4]), { tone: "lo" }) + box(x - 2.2, x + 2.2, yT - 2, yT + 2, 60, 61.4, Mt(HI, "m-dark"), 0.8) + D([at([x, yT + 2, 61.4])], { size: 0.5 }));
  }
  // rack at the back, under the mezzanine
  {
    const yR = -48, r = [];
    for (const x of [-120, -104, -88, -72]) r.push(box(x - 0.6, x + 0.6, yR - 5, yR + 5, FL, 43.6, Mt(MID, "m-rack"), 0.1));
    for (const z of [26, 38]) r.push(box(-120.6, -71.4, yR + 4, yR + 5, z, z + 1.2, Mt(MID, "m-beam"), 0.1));
    world.push(r.join(""));
    const pz = (x, z) => world.push(`<g transform="translate(${(at([x, yR, z])[0] - at([0, 0, 0])[0]).toFixed(1)} ${(at([x, yR, z])[1] - at([0, 0, 0])[1]).toFixed(1)})">${pallet(h)}</g>`);
    pz(-112, 27.2); pz(-96, 27.2); pz(-80, 27.2); pz(-96, FL);
  }
  // the mezzanine: deck, beam, columns, the roller conveyor feeding the lift, handrail
  const MZ = 47.5, CV = 49;
  world.push(box(-130, -27.6, -60, 10, MZ - 3, MZ - 1.4, Mt(MID, "m-truss"), 0.1) + box(-130, -27.6, -60, 10, MZ - 1.4, MZ, Mt(HI, "m-steel"), 0.1));
  for (const x of [-120, -76]) world.push(box(x - 0.9, x + 0.9, 7, 9, FL, MZ - 3, Mt(MID, "m-rack"), 0.2));
  {
    const cv = [box(-80, -27.6, -5.6, 5.6, MZ, MZ + 0.9, Mt(MID, "m-steel"), 0.1)];
    const rollers = []; for (let x = -79; x < -28; x += 2.8) rollers.push(at([x, 5.62, CV - 0.6]));
    cv.push(box(-80, -27.6, 5, 5.6, MZ + 0.4, CV - 0.2, Mt(MID, "m-steel"), 0.05));
    world.push(cv.join("") + rollers.map(([x, y]) => `<circle class="st-roller" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(h.cam.k * 0.5).toFixed(2)}"/>`).join(""));
    for (const x of [-78, -54, -30]) world.push(box(x - 0.4, x + 0.4, 5, 5.6, MZ, MZ + 0.4, Mt(LO, "m-dark"), 0.05));
  }
  // the vertical lift (VRC): two posts at the back, a header with its motor; the platform moves
  world.push(box(-28.4, -27, -11, -9.4, FL - 1, 64, Mt(MID, "m-safety"), 0.2) + box(-12.8, -11.4, -11, -9.4, FL - 1, 64, Mt(MID, "m-safety"), 0.2) + box(-28.4, -11.4, -11, -9.4, 64, 65.6, Mt(MID, "m-safety"), 0.2) + box(-23, -17, -11.6, -8.6, 65.6, 68.6, Mt(HI, "m-dark"), 0.6));
  world.push(box(-26.2, -12.8, -9.4, -8.8, FL - 1, 64, { tone: "lo", crease: "none" }, 0.05));
  const liftSvg = box(-26.4, -12.6, -6, 6, -1.2, 0, { tone: "hi", crease: "lo", className: "m-steel" }, 0.2) + box(-26.4, -25.6, -6, 6, 0, 3.2, Mt(MID, "m-safety"), 0.1) + box(-26.4, -12.6, -9.4, -8.4, -1.2, 6, Mt(MID, "m-safety"), 0.1)
    + D([-24, -21, -18, -15].map((x) => at([x, 6, -0.6])), { size: 0.4 });
  // handrail along the mezzanine edge (in front of the queue), with a gap at the lift
  {
    const hr = [];
    for (const x of [-128, -112, -96, -80, -64, -48, -32]) hr.push(box(x - 0.35, x + 0.35, 9.4, 10, MZ, MZ + 10.4, Mt(MID, "m-safety"), 0.05));
    hr.push(box(-128.4, -31.6, 9.4, 10, MZ + 10, MZ + 10.8, Mt(MID, "m-safety"), 0.05) + box(-128.4, -31.6, 9.4, 10, MZ + 5, MZ + 5.6, Mt(MID, "m-safety"), 0.05) + box(-128.4, -31.6, 9.4, 10, MZ, MZ + 1, Mt(MID, "m-safety"), 0.05));
    front.push(hr.join(""));
  }
  // the poché: slab and podium, the dock wall above the door, the roof and parapet
  const face = (x0, x1, z0, z1, cls, inner = "") => `<g class="${cls}"><path class="st-face" d="${poly([[x0, CUTY, z0], [x1, CUTY, z0], [x1, CUTY, z1], [x0, CUTY, z1]])}"/>${inner}<path class="iso-line" data-tone="hi" d="${poly([[x0, CUTY, z0], [x1, CUTY, z0], [x1, CUTY, z1], [x0, CUTY, z1]])}"/></g>`;
  const cut = (x0, x1, z0, z1) => face(x0, x1, z0, z1, "st-cut");
  const earth = [];
  {
    const x0 = X0, x1 = XD, z0 = 0, z1 = FL - 1.6, hatch = [];
    for (let c = x0 + 2; c < x1 + (z1 - z0); c += 3.2) {
      // a 45° line from (c, z0) going up-left, clipped to the rectangle
      let a = [c, z0], b = [c - (z1 - z0), z1];
      if (a[0] > x1) { a = [x1, z0 + (a[0] - x1)]; }
      if (b[0] < x0) { b = [x0, z1 - (x0 - b[0])]; }
      if (a[1] < b[1]) hatch.push(seg([a[0], CUTY, a[1]], [b[0], CUTY, b[1]]));
    }
    earth.push(face(x0, x1, z0, z1, "st-earth", L(hatch.join(""), { tone: "faint" })));
  }
  // the surfaces seen beyond the cut: the warehouse floor and the roof deck
  world.push(box(X0, XD, -62, CUTY, FL - 0.2, FL, { tone: "hi", crease: "none", className: "st-wall" }, 0.05));
  front.push(box(X0, XD, -64, CUTY, 77 - 0.2, 77, { tone: "hi", crease: "none", className: "st-wall" }, 0.05));
  front.push(earth.join("") + cut(X0, XD, FL - 1.6, FL));
  front.push(cut(XW, XD, 44.6, 74) + cut(X0, XD, 74, 77) + cut(XW, XD, 77, 80.4));
  // the roll-up door: its drum at the lintel; the curtain is drawn by the page's clip
  const doorSlats = []; for (let z = FL + 2.4; z < 44.6; z += 2.4) doorSlats.push(seg([-3.3, CUTY + 0.1, z], [-2.3, CUTY + 0.1, z]));
  const doorSvg = face(-3.3, -2.3, FL, 44.6, "st-door");
  front.push(discY(-4.6, CUTY - 0.6, CUTY, 46.6, 2.1, { tone: "mid", className: "st-drum" }));
  // bumpers on the dock face, the lip (rotated by the page about its hinge)
  front.push(box(XD, XD + 1.2, 8, 11.6, 7, 11.6, Mt(LO, "m-tyre"), 0.3));
  const lipC = at([XD, 0, FL]);
  const lipSvg = box(XD, XD + 4.4, -7, 7, FL - 0.5, FL, { tone: "hi", crease: "lo", className: "m-steel" }, 0.1) + box(XD - 0.8, XD, -7, 7, FL - 1.2, FL, Mt(MID, "m-safety"), 0.1);
  // the sign on the roof: a board on two legs with the lockup
  front.push(box(-56, -55, 24, 25, 77, 84, Mt(MID, "m-steel"), 0.1) + box(-14, -13, 24, 25, 77, 84, Mt(MID, "m-steel"), 0.1) + box(-56, -13, 24, 25, 79.6, 80.4, Mt(MID, "m-steel"), 0.1));
  front.push(box(-64, -6, 25, 25.8, 84, 93, { tone: "hi", crease: "lo", className: "st-white" }, 0.2) + `<g transform="${sideM(-35, 25.82, 88.5)}">${lockup(2.6)}</g>`);

  /* ---------- the truck, split around the forklift's layer ---------- */
  const parts = truckParts(h, { side: true }).sort((a, b) => h.depth(a.c) - h.depth(b.c));
  const backTags = new Set(["far", "inside"]);
  const truckBack = parts.filter((p) => backTags.has(p.tag) || (p.tag === "" && p.c[1] < 6)).map((p) => p.svg).join("");
  const truckFront = parts.filter((p) => !(backTags.has(p.tag) || (p.tag === "" && p.c[1] < 6))).map((p) => p.svg).join("");
  const halo = `<path class="iso-halo" d="${k.haloOf({ x: 0, y: -T.TW, w: 166, d: 2 * T.TW, r: 2 }, 0, 1.2, P)}"/>`;

  const C = T.CUR, cA = at([C.x0, C.y, C.z1 + 1]), cB = at([C.x1, C.y, C.z0 - 1]);
  const defs = `<defs><clipPath id="st-curtain"><rect data-curtain-rect x="${cA[0].toFixed(1)}" y="${(cA[1] - 2).toFixed(1)}" width="${(cB[0] - cA[0]).toFixed(1)}" height="${(cB[1] - cA[1] + 4).toFixed(1)}"/></clipPath>
<clipPath id="st-door"><rect data-door-rect x="${(at([-3.6, CUTY, 0])[0]).toFixed(1)}" y="${at([0, CUTY, 44.6])[1].toFixed(1)}" width="${(h.cam.k * 1.6).toFixed(1)}" height="${(at([0, CUTY, FL])[1] - at([0, CUTY, 44.6])[1]).toFixed(1)}"/></clipPath></defs>`;

  const body = [
    NS.defs, defs,
    `<g data-world>`,
    `<g class="st-bg">${world.join("")}</g>`,
    `<g class="st-lift" data-lift>${liftSvg}<g data-lift-load></g></g>`,
    `<g class="st-queue"><g data-queue></g></g>`,
    `<g class="st-truck" data-truck>${halo}<g data-truck-back>${truckBack}<g data-cargo></g></g></g>`,
    `<g class="st-fork" data-forklift>${forklift(h)}<g data-forks>${forks(h)}<g data-fork-load></g></g></g>`,
    `<g class="st-truck" data-truck-front>${truckFront}${NS.headlights(T.LEN + 0.6, T.CW - 2, 8.9)}${NS.tail([0.3, T.TW + 0.2, 7.5], 2)}${NS.tail([0.3, T.TW + 0.2, 38.5], 1.2)}</g>`,
    `<g class="st-fg">${front.slice(0, 1).join("")}</g>`,
    `<g class="st-dock">${front.slice(1).join("")}<g clip-path="url(#st-door)"><g data-door>${doorSvg}${`<path class="iso-line" data-tone="lo" d="${doorSlats.join("")}"/>`}</g></g><g data-lip data-c="${lipC[0].toFixed(2)} ${lipC[1].toFixed(2)}">${lipSvg}</g></g>`,
    `</g>`,
  ];
  const svg = k.figureSvg({ width: W, height: H, className: "st-svg", label: "The ShipNoble warehouse cut open beside its dock. A curtain-sided truck reverses in, its curtain draws back, and a forklift carries four pallets from the pallet lift into the trailer before the truck drives away.", body });
  const o = at([0, 0, 0]), ux = at([1, 0, 0]), uz = at([0, 0, 1]);
  const data = {
    vb: [W, H], o: o.map((v) => +v.toFixed(2)), ax: [+(ux[0] - o[0]).toFixed(5), 0], az: [0, +(uz[1] - o[1]).toFixed(5)],
    wheels: T.wheels, slots: T.slots, floor: FL, mz: CV, cur: C, lift: { x: -19.5, top: CV, bottom: FL }, queue: [-34, -48, -62], park: -42, pick: -25.5,
    ground: +(at([0, 60, 0])[1]).toFixed(2), truckLen: T.LEN,
  };
  return { svg, data, h, palletSvg: pallet(h) };
}

/* ================= the junction: road A runs east–west, road B leaves it northward at XJ ================= */
const ROAD = { tone: "hi", crease: "none", className: "st-road" };
const MARK = { tone: "hi", crease: "none", className: "st-mark" };
const WALK = { tone: "hi", crease: "lo", className: "st-walk" };

export const J = { XS: 334, R: 180, RH: 38, LANE: 0, D: 360, K: 4.2, KP: 3.9, W: 1600, H: 900 };

/* the road's centreline: east along y = 0 to XS, a quarter bend of radius R to the left, then north. The truck drives on it. */
export function roadCentre(step = 3, from = -760, north = -1100) {
  const { XS, R } = J, pts = [];
  for (let x = from; x < XS; x += step) pts.push([x, 0]);
  const n = Math.ceil((Math.PI * R / 2) / step);
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI / 2; pts.push([XS + R * Math.sin(a), -R + R * Math.cos(a)]); }
  for (let y = -R - step; y > north; y -= step) pts.push([XS + R, y]);
  return pts;
}

export function junctionWorld(h) {
  const { box, L, seg, cylZ, at, S, P } = h;
  const NJ = nightKit(h, "sj");
  const RH = J.RH, SW = 12, XS = J.XS, R = J.R;
  const ground = [], far = [], items = [], glow = [];
  const item = (c, svg) => items.push({ c, svg, far: c[1] < -RH - 30 || c[1] > RH + SW + 4 });
  const solid = (ring, z, hgt, style) => S(k.extrude(ring, z, hgt, P, { convex: false }), style);
  const C = roadCentre(3);
  const nrm = C.map((p, i) => { const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [-(b[1] - a[1]) / l, (b[0] - a[0]) / l]; });
  const off = (pts, ns, o) => pts.map((p, i) => [p[0] + ns[i][0] * o, p[1] + ns[i][1] * o]);
  // the straight part before the bend is "near"; the bend and the road north of it fade in as the camera rises
  const cut = C.findIndex((p) => p[0] >= XS - 3);
  const parts = [[C.slice(0, cut + 1), nrm.slice(0, cut + 1), ground], [C.slice(cut), nrm.slice(cut), far]];
  const band = (pts, ns, o1, o2) => [...off(pts, ns, o1), ...off(pts, ns, o2).reverse()];
  ground.push(`<path class="st-paper-fill" d="${h.poly([[-760, -1100, 0], [1100, -1100, 0], [1100, 400, 0], [-760, 400, 0]])}"/>`);
  for (const [pts, ns, list] of parts) {
    list.push(solid(band(pts, ns, -RH, RH), 0, 0.2, ROAD));
    list.push(solid(band(pts, ns, RH - 2.2, RH - 1.5), 0.2, 0.12, MARK) + solid(band(pts, ns, -RH + 1.5, -RH + 2.2), 0.2, 0.12, MARK));
    // paving joints across both sidewalks
    const pj = [];
    for (let i = 0; i < pts.length; i += 5) for (const [a, b] of [[RH, RH + SW], [-RH - SW, -RH]]) { const p = pts[i], n = ns[i]; pj.push(seg([p[0] + n[0] * a, p[1] + n[1] * a, 1.4], [p[0] + n[0] * b, p[1] + n[1] * b, 1.4])); }
  }
  // lamp posts on the inside kerb, their arms over the road; trees on both verges; shrubs on the outer verge
  const along = (every, offs, fn) => { let acc = 0; for (let i = 1; i < C.length; i++) { acc += Math.hypot(C[i][0] - C[i - 1][0], C[i][1] - C[i - 1][1]); if (acc >= every) { acc = 0; fn(C[i], nrm[i], i); } } };
  const lamp = (p, n) => {
    const x = p[0] - n[0] * (RH + 4), y = p[1] - n[1] * (RH + 4), ex = x + n[0] * 9, ey = y + n[1] * 9;
    item([x, y, 30], cylZ(x, y, 0, 1.4, 1.6, Mt(MID, "m-steel")) + cylZ(x, y, 1.4, 66, 0.55, Mt(MID, "m-steel"))
      + `<path class="st-arm" d="${h.poly([[x, y, 65.5], [ex, ey, 65.5]], false)}"/>` + cylZ(ex, ey, 63.6, 65.4, 1.9, Mt(HI, "m-dark"), 16) + NJ.lamp([ex, ey, 63.4], 4.2));
    // light lies on top of every road surface: near pools are drawn after the far road too, so none is cut at the seam
    (ex > XS - 3 || ey < -RH - 4 ? far : glow).push(NJ.pool([ex, ey, 0.3], 26, 26, "pool", [ex, ey, 63.4]));
  };
  const lobed = (cx, cy, Rr, n, amp, ph) => Array.from({ length: n * 6 }, (_, i) => { const a = (i / (n * 6)) * Math.PI * 2, rr = Rr * (1 - amp + amp * Math.abs(Math.cos((a * n) / 2 + ph))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.98]; });
  const pathOf = (pts) => "M" + pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
  // a tree: wood trunk, a soft shadow on the ground, and a crown of overlapping leaf masses (one clean outline drawn
  // under the fills, a shaded side away from the light, a sunlit side toward it); the cluster varies tree to tree
  const tree = (x, y, r = 8.5, trunk = true) => {
    const zc = trunk ? 22 + r * 0.8 : r, [cx, cy] = at([x, y, zc]), R = r * h.cam.k, seed = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 6.283;
    const f = (v) => v.toFixed(1), c = (dx, dy, rr) => [cx + dx * R, cy + dy * R, rr * R];
    const blobs = [c(0, 0.04, 0.62), c(-0.44, 0.2, 0.46), c(0.44, 0.18, 0.47), c(-0.22, -0.4, 0.46), c(0.25, -0.38, 0.44), c(0.02, 0.42, 0.44)]
      .map(([bx, by, br], i) => [bx + Math.cos(seed + i * 2.1) * R * 0.04, by + Math.sin(seed + i * 1.7) * R * 0.04, br]);
    const circ = (q, cls) => `<circle class="${cls}" cx="${f(q[0])}" cy="${f(q[1])}" r="${f(q[2])}"/>`;
    const [gx, gy] = at([x + r * 0.15, y + r * 0.15, 0.05]);
    const shadow = `<ellipse class="tr-shadow" cx="${f(gx)}" cy="${f(gy)}" rx="${f(R * 0.8)}" ry="${f(R * 0.8 * Math.max(0.12, h.cam.sinE))}"/>`;
    const crown = blobs.map((q) => circ(q, "tr-out")).join("") + blobs.map((q) => circ(q, "tr-leaf")).join("")
      + [c(0.3, 0.3, 0.34), c(-0.3, 0.34, 0.26), c(0.42, -0.02, 0.26)].map((q) => circ(q, "tr-shade")).join("")
      + [c(-0.24, -0.3, 0.27), c(0.14, -0.4, 0.2), c(-0.44, -0.04, 0.17)].map((q) => circ(q, "tr-lit")).join("");
    ground.push(shadow);
    item([x, y, zc], (trunk ? cylZ(x, y, 0.6, 22, 0.8, Mt(MID, "m-trunk")) : "") + `<g class="st-tree tr">${crown}</g>`);
  };
  along(130, 0, (p, n) => lamp(p, n));
  return { ground, far, items, glow, nightDefs: NJ.defs };
}

/* the skeleton: what the blueprint wipe reveals (top view, truck-local, heading +x) */
export function bones(h, unit, { loaded = true } = {}) {
  const { box, L, D, seg, at, cylZ, poly, S } = h;
  const B = { tone: "hi", crease: "lo", className: "st-bp" };
  const o = [];
  if (unit === "trailer") {
    const T0 = T.TW;
    o.push(`<path class="st-bp-base" d="${poly([[0, -T0, 11], [T.TL, -T0, 11], [T.TL, T0, 11], [0, T0, 11]])}"/>`);
    for (const y of [-T0, T0 - 1.2]) o.push(box(0, T.TL, y, y + 1.2, 11.5, 13.5, B, 0.2));
    for (const y of [-5.2, 4]) o.push(box(3, 128, y, y + 1.2, 8, 11.5, B, 0.2));
    for (let x = 6; x < 127; x += 7.4) o.push(box(x - 0.4, x + 0.4, -T0 + 1.2, T0 - 1.2, 10.4, 11.2, B, 0.05));
    o.push(box(0.6, 2.6, -T0 + 0.5, T0 - 0.5, 4.6, 6.6, B, 0.3));
    for (const ax of [18, 31.5, 45]) {
      o.push(box(ax - 0.8, ax + 0.8, -11.4, 11.4, 4, 6, B, 0.3));
      for (const [y0, y1] of [[8, 12.2], [-12.2, -8]]) {
        const tread = []; for (let x = ax - 4.2; x <= ax + 4.3; x += 1.4) tread.push(seg([x, y0 + 0.3, 10], [x, y1 - 0.3, 10]));
        o.push(box(ax - 5, ax + 5, y0, y1, 0, 10, { ...B, inner: L(tread.join(""), { tone: "lo" }) }, 1.2));
      }
      for (const y of [-6, 6]) o.push(cylZ(ax + 5.2, y, 6, 10, 1.7, B, 16));
      o.push(cylZ(ax - 3.4, -4.6, 6, 8, 1, B, 12) + cylZ(ax - 3.4, 4.6, 6, 8, 1, B, 12));
    }
    for (const y of [-10.3, 10.3]) o.push(box(104.2, 105.8, y - 0.7, y + 0.7, 2.6, 11.5, B, 0.2));
    o.push(box(104.6, 105.4, -9.6, 9.6, 6, 6.8, B, 0.1));
    o.push(box(110, 127, -8, 8, 11, 11.4, B, 0.4));
    o.push(L(k.ring(118, 0, 1.6, 11.4, h.P, 20), { tone: "hi" }) + D([at([118, 0, 11.4])], { size: 0.6 }));
    const lines = poly([[126, -2, 11.3], [50, -2, 11.3], [50, -9.2, 11.3]], false) + poly([[126, 2, 11.3], [36.5, 2, 11.3], [36.5, 9.2, 11.3]], false);
    o.push(`<path class="st-bp-wire" d="${lines}"/>` + D([at([126, -2, 11.3]), at([50, -9.2, 11.3]), at([126, 2, 11.3]), at([36.5, 9.2, 11.3])], { size: 0.55 }));
    for (const x of [0.8, 43, 86, 129.2]) for (const y of [-T0 + 0.6, T0 - 0.6]) o.push(D([at([x, y, 13.5])], { size: 0.7 }));
    if (loaded) for (const sx of T.slots) {
      const { l, w } = T.PAL, x0 = sx - l / 2, y0 = -w / 2, z = 28;
      const gl = seg([sx, y0 + 0.3, z], [sx, -y0 - 0.3, z]) + seg([x0 + 0.3, 0, z], [x0 + l - 0.3, 0, z]);
      o.push(box(x0, x0 + l, y0, -y0, 13.5, z, { tone: "hi", crease: "lo", className: "st-carton m-kraft", inner: L(gl, { tone: "faint" }) }, 0.2));
      o.push(`<path class="st-strap" d="${seg([sx - 3, y0, z + 0.05], [sx - 3, -y0, z + 0.05]) + seg([sx + 3, y0, z + 0.05], [sx + 3, -y0, z + 0.05])}"/>`);
    }
  } else {
    o.push(`<path class="st-bp-base" d="${poly([[103.6, -T.CW, 0.2], [165.5, -T.CW, 0.2], [165.5, T.CW, 0.2], [103.6, T.CW, 0.2]])}"/>`);
    for (const y of [-5, 3.6]) o.push(box(104, 163, y, y + 1.4, 7, 10.5, B, 0.2));
    for (const x of [107, 125, 142, 161]) o.push(box(x - 0.5, x + 0.5, -3.6, 3.6, 8, 9.6, B, 0.05));
    for (const [ax, dual] of [[114, true], [151, false]]) {
      o.push(box(ax - 0.9, ax + 0.9, -11.4, 11.4, 4, 6, B, 0.3));
      for (const [y0, y1] of [[8, 12.2], [-12.2, -8]]) {
        const tread = []; for (let x = ax - 4.2; x <= ax + 4.3; x += 1.4) tread.push(seg([x, y0 + 0.3, 10.2], [x, y1 - 0.3, 10.2]));
        o.push(box(ax - 5.1, ax + 5.1, y0, y1, 0, 10.2, { ...B, inner: L(tread.join(""), { tone: "lo" }) }, 1.2));
      }
      if (dual) o.push(cylZ(ax, 0, 6, 8.6, 3, B, 20));
    }
    o.push(box(116, 136, -0.6, 0.6, 6.6, 7.4, B, 0.3));
    o.push(box(136, 146, -3.2, 3.2, 7, 13, B, 1));
    o.push(box(146, 160.5, -4.8, 4.8, 8, 18, B, 1, 2, 0.4));
    for (let n = 0; n < 6; n++) o.push(L(k.ring(147.8 + n * 2.2, 0, 0.8, 18, h.P, 14), { tone: "hi" }));
    o.push(box(161.6, 163.4, -8.6, 8.6, 9, 22, B, 0.3));
    o.push(S(G.disc(0, 1, 5.6, G.frameAlong([116, 0, 10.5], [0, 0, 1]), h.P), B) + `<path class="st-bp-wire" d="${poly([[110.4, -1.6, 11.6], [116, -0.6, 11.6], [116, 0.6, 11.6], [110.4, 1.6, 11.6]], false)}"/>`);
    o.push(box(125, 139, 6.4, 12.2, 3.8, 9.8, B, 2.6));
    o.push(box(124, 140, -12, -7.6, 4.2, 10, B, 1.2));
    o.push(L(poly([[141, -T.CW, 11.2], [165.5, -T.CW, 11.2], [165.5, T.CW, 11.2], [141, T.CW, 11.2]]), { tone: "hi" }));
    for (const y of [-6.4, 6.4]) o.push(box(147, 152.5, y - 2.6, y + 2.6, 11.2, 16, B, 1) + box(145.4, 147, y - 2.6, y + 2.6, 16, 24, B, 0.6));
    o.push(L(k.ring(157.2, 6.4, 2.2, 22, h.P, 20), { tone: "hi" }) + box(160, 164, -11, 11, 20, 22, B, 0.6));
  }
  return o.join("");
}

/* ---------- a projection for the junction views: the camera looks at target from elevation E, K px per dm ---------- */
export function junctionProjection(E, { W = J.W, H = J.H, K = J.K, target = [82.75, J.LANE, 0] } = {}) {
  const UNIT = Math.sqrt(1.6);
  const P0 = { origin: [0, 0], scale: K / UNIT, azimuth: 90, elevation: E };
  const v = k.iso(target, P0);
  return { ...P0, origin: [W / 2 - v[0], H / 2 - v[1]] };
}

// one swing frame: the world, then every item and truck part by depth
export function swingScene(E, opts = {}) {
  const P = junctionProjection(E, opts);
  const h = helpers(P);
  const { ground, far, items, glow, nightDefs } = junctionWorld(h);
  const Pt = { ...P, origin: k.iso([0, J.LANE, 0], P) };
  const ht = helpers(Pt);
  const parts = truckParts(ht, { href: opts.href }).map((p) => ({ c: [p.c[0], p.c[1] + J.LANE, p.c[2]], svg: p.svg }));
  const halo = `<path class="iso-halo" d="${k.haloOf({ x: 0, y: -T.TW, w: 166, d: 2 * T.TW, r: 2 }, 0, 1.2, Pt)}"/>`;
  const NT = nightKit(ht, "sw");
  const truckNight = NT.defs + NT.headlights(166.2, T.CW - 2, 8.9) + NT.tail([0.2, -T.TW + 1.6, 7.4], 1.8) + NT.tail([0.2, T.TW - 1.6, 7.4], 1.8);
  const byDepth = (list) => list.sort((a, b) => h.depth(a.c) - h.depth(b.c)).map((p) => p.svg).join("");
  // what lies beyond the north kerb fades in as the camera rises (an orthographic camera near the ground would stack it up the frame)
  const t = Math.max(0, Math.min(1, (E - 14) / 26)), fade = t * t * (3 - 2 * t);
  const farSvg = fade > 0.001 ? `<g opacity="${fade.toFixed(3)}">${far.join("")}${byDepth(items.filter((i) => i.far))}</g>` : "";
  return k.figureSvg({ width: opts.W || J.W, height: opts.H || J.H, className: "st-svg", label: "", body: [nightDefs, `<g class="st-world">${ground.join("")}</g>`, farSvg, glow.join(""), halo, truckNight, byDepth([...items.filter((i) => !i.far), ...parts])] });
}

/* the top view: world, the truck in two articulated units, each with its skin masked by the blueprint wipe */
function topView() {
  const P = junctionProjection(90);
  const h = helpers(P);
  const { ground: g0, far, items, glow, nightDefs } = junctionWorld(h);
  const ground = [...g0, ...far, ...glow];
  const Pt = { ...P, origin: k.iso([0, J.LANE, 0], P) };
  const ht = helpers(Pt);
  const parts = truckParts(ht, {}).sort((a, b) => ht.depth(a.c) - ht.depth(b.c));
  const skinOf = (u) => parts.filter((p) => p.unit === u).map((p) => p.svg).join("");
  const sx = (x) => k.iso([x, 0, 0], Pt)[0];
  const shadow = (x0, x1, w) => `<path class="st-shadow" filter="url(#st-soft)" d="${ht.poly([[x0, -w, 0], [x1, -w, 0], [x1, w, 0], [x0, w, 0]])}"/>`;
  const NT = nightKit(ht, "st");
  const lightsOf = (u) => u === "tractor" ? NT.headlights(166.2, T.CW - 2, 8.9) : NT.tail([0.2, -T.TW + 1.6, 7.4], 1.8) + NT.tail([0.2, T.TW - 1.6, 7.4], 1.8);
  const unit = (u) => `<g class="st-unit" data-unit="${u}">${lightsOf(u)}${u === "trailer" ? shadow(-0.5, T.TL + 0.5, T.TW + 0.6) : shadow(103, 166.4, T.CW + 0.6)}<g class="st-bones">${bones(ht, u)}</g><g class="st-skin" mask="url(#st-wipe-${u})">${skinOf(u)}</g></g>`;
  const grad = (u) => `<linearGradient id="st-wipe-grad-${u}" data-wipe-grad="${u}" gradientUnits="userSpaceOnUse" x1="${sx(200).toFixed(1)}" y1="0" x2="${sx(214).toFixed(1)}" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#d8d8d8"/><stop offset=".65" stop-color="#272727"/><stop offset="1" stop-color="#000"/></linearGradient>
<mask id="st-wipe-${u}" maskUnits="userSpaceOnUse" x="-6000" y="-6000" width="14000" height="14000"><rect x="-6000" y="-6000" width="14000" height="14000" fill="url(#st-wipe-grad-${u})"/></mask>`;
  const ctx = items.sort((a, b) => h.depth(a.c) - h.depth(b.c)).map((p) => p.svg).join("");
  const body = [
    nightDefs, NT.defs,
    `<defs>${grad("tractor")}${grad("trailer")}<filter id="st-soft" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="5"/></filter></defs>`,
    `<g data-cam>`,
    `<g class="st-world">${ground.join("")}</g>`,
    `<g class="st-ctx" data-ctx>${ctx}</g>`,
    `<g data-truck-top>${unit("tractor")}${unit("trailer")}<path class="st-scan" data-scan d="" style="opacity:0"/></g>`,
    `</g>`,
  ];
  const svg = k.figureSvg({ width: J.W, height: J.H, className: "st-svg", label: "Seen from above, the ShipNoble truck turns left at a junction and drives north; a blueprint sweep reveals its frame, axles, engine and the four pallets strapped inside.", body });
  const o = k.iso([0, 0, 0], P), ux = k.iso([1, 0, 0], P), uy = k.iso([0, 1, 0], P);
  return { svg, data: { vb: [J.W, J.H], o: o.map((v) => +v.toFixed(2)), ax: +(ux[0] - o[0]).toFixed(5), ay: +(uy[1] - o[1]).toFixed(5), ...J, drive: 114, king: 118, axle: 31.5, len: T.LEN } };
}

/* ================= run ================= */
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const s = sideView();
  writeFileSync(join(OUT, "story-side.svg"), s.svg);
  writeFileSync(join(OUT, "story-pallet.svg"), s.palletSvg);
  const t = topView();
  writeFileSync(join(OUT, "story-top.svg"), t.svg);
  writeFileSync(join(OUT, "story.json"), JSON.stringify({ side: s.data, top: t.data }));
  writeFileSync(join(HERE, "out", "story-top.html"), k.pageHtml({ title: "story top", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><div class="iso-stage" style="overflow:hidden">${t.svg.replaceAll('href="assets/', 'href="../../assets/')}</div>`, width: 1600 }));
  console.log("wrote story-top.svg", (t.svg.length / 1024).toFixed(0) + " KB");
  // the preview poses the scene mid-loading: two pallets in, one on the forks, the curtain open
  const d = s.data, tr = (x, z) => `translate(${(x * d.ax[0]).toFixed(1)} ${(z * d.az[1]).toFixed(1)})`;
  let preview = s.svg.replaceAll('href="assets/', 'href="../../assets/');
  preview = preview.replace("<g data-cargo></g>", `<g data-cargo>${[0, 1].map((i) => `<g transform="${tr(T.slots[i], T.FL)}">${s.palletSvg}</g>`).join("")}</g>`);
  preview = preview.replace(/<g class="st-fork" data-forklift>/, `<g class="st-fork" data-forklift transform="${tr(40, T.FL)}">`);
  preview = preview.replace("<g data-fork-load></g>", `<g data-fork-load><g transform="${tr(6, 0.6)}">${s.palletSvg}</g></g>`);
  preview = preview.replace(/<rect data-curtain-rect x="([\d.]+)"/, (m, x) => `<rect data-curtain-rect x="${(+x + 118 * d.ax[0]).toFixed(1)}"`);
  preview = preview.replace('<g data-bunch style="opacity:0">', `<g data-bunch transform="${tr(118, 0)}">`);
  preview = preview.replace(/<g class="st-lift" data-lift>/, `<g class="st-lift" data-lift transform="${tr(0, T.FL)}">`);
  preview = preview.replace("<g data-queue></g>", `<g data-queue>${[-34, -48].map((x) => `<g transform="${tr(x, 49)}">${s.palletSvg}</g>`).join("")}</g>`);
  writeFileSync(join(HERE, "out", "story-side.html"), k.pageHtml({ title: "story side", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&display=swap" rel="stylesheet"><div class="iso-stage" style="overflow:hidden">${preview}</div>`, width: 1600 }));
  console.log("wrote story-side.svg", (s.svg.length / 1024).toFixed(0) + " KB");
}
