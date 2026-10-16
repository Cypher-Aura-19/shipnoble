// Small animated anatomy scenes for the service "how it works" cards: one action per step, drawn with the same kit,
// helpers and classes as the home page figures (white solids, navy road, orange only on what moves).
// Motion is CSS (service.css, "pm-*" keyframes) on groups marked data-a; the page only starts it when a card is in view.
// Drawn at the card's own size (640 x 250) so every stroke lands at 1 px, like the home figures.
//   node tools/proc-mini.mjs  -> tools/out/proc-mini.json (read by make-services.py) + tools/out/proc-mini.html (preview)
import { writeFileSync, mkdirSync } from "node:fs";
import { k } from "./fig-lib.mjs";
import { helpers } from "./fig-story.mjs";

const W = 640, H = 250;
const HI = { tone: "hi", crease: "lo" }, MID = { tone: "mid" }, LO = { tone: "lo" };
const WHITE = { tone: "hi", crease: "lo", className: "st-white" };
const ACC = { tone: "hi", crease: "lo", className: "pm-acc" };
const f1 = (v) => v.toFixed(1);
let CLIP = 0;
function convexHull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const boxPts = (x0, x1, y0, y1, z0, z1) => [x0, x1].flatMap((x) => [y0, y1].flatMap((y) => [[x, y, z0], [x, y, z1]]));

// one scene: fit the camera to the given world points, build the body with the helpers
function mini(fit, build, { az = 62, el = 24, label = "" } = {}) {
  const P = k.fitProjection(fit, W, H, { pad: 10, azimuth: az, elevation: el });
  const h = helpers(P);
  // screen offset of a world move, for the CSS translate of a moving group
  h.dv = (a, b) => { const p = h.at(a), q = h.at(b); return [+(q[0] - p[0]).toFixed(1), +(q[1] - p[1]).toFixed(1)]; };
  // face matrices from the real camera (the shared ones assume a side-on view): 1 unit = 1 dm on the face
  const mat = (o, u, v) => { const O = h.at(o), U = h.at(u), V = h.at(v); return `matrix(${[U[0] - O[0], U[1] - O[1], V[0] - O[0], V[1] - O[1], O[0], O[1]].map((n) => n.toFixed(4)).join(" ")})`; };
  h.topM = (x, y, z) => mat([x, y, z], [x + 1, y, z], [x, y + 1, z]);          // u along +x, v along +y
  h.sideM = (x, y, z) => mat([x, y, z], [x + 1, y, z], [x, y, z - 1]);         // on a +y face: u along +x, v down
  // a moving group: kind is the keyframe family, [dx, dy] its screen travel, t its phase (s) in the shared loop
  h.anim = (kind, inner, { d = [0, 0], m = [0, 0], t = 0, o = null } = {}) => `<g data-a="${kind}" style="--dx:${d[0]}px;--dy:${d[1]}px;--mx:${m[0]}px;--my:${m[1]}px;--t:${t}s${o ? `;transform-origin:${f1(o[0])}px ${f1(o[1])}px` : ""}">${inner}</g>`;
  // a mask for something that passes through an opening: it shows everywhere except over the solid (hull of the
  // given world points), and through the opening again (polygon of world points)
  h.through = (solid, opening, inner) => {
    const id = `pmc${++CLIP}`, pts = solid.map(h.at), hull = convexHull(pts), op = opening.map(h.at);
    const d = `M-200 -200H${W + 200}V${H + 200}H-200Z` + "M" + hull.map((q) => q.map(f1).join(" ")).join("L") + "Z" + "M" + op.map((q) => q.map(f1).join(" ")).join("L") + "Z";
    return `<clipPath id="${id}"><path clip-rule="evenodd" d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
  };
  const body = build(h);
  return k.figureSvg({ width: W, height: H, className: "iso-svg st-svg pm", label, body });
}

/* ---------- shared parts, in dm: x along, y across, z up ---------- */
// ground: a soft halo and a pavement slab with faint paving joints
function pad(h, x0, x1, y0, y1, joints = 8) {
  const s = `<path class="iso-halo" d="${k.haloOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 2 }, 0, 1.2, h.P)}"/>` + h.box(x0, x1, y0, y1, -1.4, 0, { tone: "hi", crease: "lo", className: "st-walk" }, 1.4);
  const j = []; for (let x = x0 + joints; x < x1 - 2; x += joints) j.push(h.seg([x, y0 + 1, 0.01], [x, y1 - 1, 0.01]));
  return s + h.L(j.join(""), { tone: "faint" });
}
// a street: asphalt with lane marks between two kerbs
function road(h, x0, x1, y0, y1) {
  let s = h.box(x0, x1, y0, y1, 0, 0.25, { tone: "hi", crease: "none", className: "st-road" }, 0.1);
  for (let x = x0 + 4; x < x1 - 6; x += 12) s += h.box(x, x + 6, (y0 + y1) / 2 - 0.35, (y0 + y1) / 2 + 0.35, 0.25, 0.32, { tone: "hi", crease: "none", className: "st-mark" }, 0.05);
  return s + h.box(x0, x1, y1, y1 + 1.2, 0, 0.9, HI, 0.2) + h.box(x0, x1, y0 - 1.2, y0, 0, 0.9, HI, 0.2);
}
// a wheel on the near (+1) or far (-1) side: tyre, hub, centre bolt
function wheel(h, x, y, z, r, side) {
  const t = 1.4;
  if (side > 0) return h.discY(x, y - t, y, z, r, LO) + h.discY(x, y, y + 0.3, z, r * 0.5, MID) + h.D([h.at([x, y + 0.32, z])], { size: 0.5 });
  return h.discY(x, y, y + t, z, r, LO);
}
// a delivery van facing +x, rear at x: body, cab, glass, seams, stripe, lights, mirror, wheels
function van(h, x, y = 0, { door = false } = {}) {
  const { box, prism, poly, L, seg } = h, L0 = 30, CAB = 12, w = 7, ny = y + w;
  let s = wheel(h, x + 7, y - w + 0.2, 3, 3, -1) + wheel(h, x + L0 + 6, y - w + 0.2, 3, 3, -1);
  s += box(x, x + L0, y - w, y + w, 1.6, 21, WHITE, 0.8);
  s += prism([[x + L0, 1.6], [x + L0 + CAB, 1.6], [x + L0 + CAB, 8.6], [x + L0 + CAB - 1.4, 14.4], [x + L0 + 5, 20.4], [x + L0, 21]], y - w + 0.2, y + w - 0.2, WHITE);
  const face = (pts, cls) => `<path class="${cls}" d="${poly(pts.map(([px, pz]) => [px, ny + 0.03, pz]))}"/>`;
  s += face([[x + L0 + 2, 12], [x + L0 + CAB - 1.5, 12], [x + L0 + CAB - 2.5, 14.6], [x + L0 + 5.4, 19.2], [x + L0 + 2, 19.2]], "st-glass-fill");
  if (door) s += face([[x + 16.6, 2.4], [x + L0 - 1.6, 2.4], [x + L0 - 1.6, 19.6], [x + 16.6, 19.6]], "pm-hole");
  s += face([[x + 1.2, 6.2], [x + (door ? 16 : L0 + CAB - 1), 6.2], [x + (door ? 16 : L0 + CAB - 1), 7.1], [x + 1.2, 7.1]], "st-stripe");
  if (door) s += face([[x + L0 - 1, 6.2], [x + L0 + CAB - 1, 6.2], [x + L0 + CAB - 1, 7.1], [x + L0 - 1, 7.1]], "st-stripe");
  s += L([seg([x + L0 + 1.4, ny + 0.04, 2.4], [x + L0 + 1.4, ny + 0.04, 20.2]), seg([x + 16, ny + 0.04, 2.4], [x + 16, ny + 0.04, 20.4]), seg([x + L0 - 1, ny + 0.04, 2.4], [x + L0 - 1, ny + 0.04, 20.4])].join(""), { tone: "lo" });
  s += box(x + L0 + 3, x + L0 + 4.6, ny - 0.1, ny + 0.2, 10.4, 10.8, MID, 0.1);
  s += box(x + L0 + CAB - 0.8, x + L0 + CAB + 0.4, y - w + 0.6, y + w - 0.6, 1.6, 3.4, MID, 0.4);
  s += box(x + L0 + CAB - 0.9, x + L0 + CAB + 0.2, ny - 2.4, ny - 0.4, 5.2, 6.8, { tone: "hi", crease: "lo", className: "st-lamp" }, 0.3);
  s += box(x - 0.2, x + 0.4, ny - 2, ny - 0.4, 8, 11, { tone: "mid", crease: "none", className: "pm-tail" }, 0.2);
  s += box(x + L0 + 1.6, x + L0 + 3.2, ny, ny + 1.8, 14.6, 17.2, HI, 0.3);
  return s + wheel(h, x + 7, ny, 3, 3, 1) + wheel(h, x + L0 + 6, ny, 3, 3, 1);
}
// a wine bottle standing at (x, y, z): body, shoulder, neck, foil
const bottle = (h, x, y, z, s = 1, style = HI) => h.cylZ(x, y, z, z + 2 * s, 0.42 * s, style, 16) + h.cylZ(x, y, z + 2 * s, z + 2.45 * s, 0.3 * s, style, 14) + h.cylZ(x, y, z + 2.45 * s, z + 3.1 * s, 0.14 * s, style, 10) + h.cylZ(x, y, z + 3.1 * s, z + 3.4 * s, 0.16 * s, MID, 10);
// a carton with a tape seam on its top
const carton = (h, x, y, z, l, w, ht, style = HI) => h.box(x - l / 2, x + l / 2, y - w / 2, y + w / 2, z, z + ht, style, 0.2) + h.L(h.seg([x, y - w / 2 + 0.2, z + ht + 0.01], [x, y + w / 2 - 0.2, z + ht + 0.01]), { tone: "lo" });
// a window on a +y-facing wall: glass with mullions
const win = (h, x0, x1, y, z0, z1) => h.box(x0, x1, y - 0.05, y + 0.05, z0, z1, { tone: "mid", crease: "none", className: "st-glass" }, 0.2) + h.L(h.seg([(x0 + x1) / 2, y + 0.07, z0], [(x0 + x1) / 2, y + 0.07, z1]) + h.seg([x0, y + 0.07, (z0 + z1) / 2], [x1, y + 0.07, (z0 + z1) / 2]), { tone: "lo" });
// a small tree: trunk and a lobed crown
function tree(h, x, y, ht = 16) {
  const [cx, cy] = h.at([x, y, ht]), R = 5 * h.cam.k;
  const pts = Array.from({ length: 48 }, (_, i) => { const a = (i / 48) * Math.PI * 2, rr = R * (0.87 + 0.13 * Math.abs(Math.cos(a * 4))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  const d = "M" + pts.map((q) => q.map(f1).join(" ")).join("L") + "Z";
  return h.cylZ(x, y, 0, ht - 2, 0.5, MID, 12) + `<g class="st-tree"><path class="st-crown" d="${d}"/><path class="iso-line" data-tone="lo" d="${d}"/></g>`;
}
// a small house: walls, gable roof, door, windows
function house(h, x0, x1, y0, y1, ht = 14) {
  const { box, prism } = h, mx = (x0 + x1) / 2;
  return box(x0, x1, y0, y1, 0, ht, WHITE, 0.4) + prism([[x0 - 0.8, ht], [x1 + 0.8, ht], [mx, ht + 6]], y0 - 0.8, y1 + 0.8, { tone: "mid", crease: "lo", className: "wn-roof" })
    + box(mx - 1.6, mx + 1.6, y1 - 0.05, y1 + 0.05, 0, 6, { tone: "mid", crease: "none", className: "wn-door" }, 0.1) + win(h, x0 + 1.6, x0 + 4.6, y1, 6, 9.6) + win(h, x1 - 4.6, x1 - 1.6, y1, 6, 9.6);
}
// a map pin standing at screen point p, and a check badge at screen point c
const pinAt = (p) => `<path class="pm-pin" d="M${f1(p[0])} ${f1(p[1])}c-7 -9 -11 -13 -11 -19a11 11 0 0 1 22 0c0 6 -4 10 -11 19Z"/><circle class="pm-pin-dot" cx="${f1(p[0])}" cy="${f1(p[1] - 19)}" r="3.6"/>`;
const checkAt = (c) => `<circle class="pm-check-bg" cx="${f1(c[0])}" cy="${f1(c[1])}" r="11"/><path class="pm-check" d="M${f1(c[0] - 5)} ${f1(c[1])}l3.6 3.6l6.6 -7.4"/>`;

// a box truck: body, chassis, cab with glass, ribs, stripe, lights, mirror, three axles. dir = +1 faces +x, -1 faces -x;
// x is the rear of the body. Only the +y side and the +x end are seen, so the near details go there.
function truck(h, x, y = 0, { dir = 1, len = 44, ht = 25, open = false } = {}) {
  const { box, prism, poly, L, seg } = h, w = 8.4, ny = y + w;
  const X = (lx) => x + dir * lx, bx = (a, b, y0, y1, z0, z1, st, r) => box(Math.min(X(a), X(b)), Math.max(X(a), X(b)), y0, y1, z0, z1, st, r);
  const axles = [7, 14, len + 9];
  let s = axles.map((a) => wheel(h, X(a), y - w + 0.2, 3.4, 3.4, -1)).join("");
  s += bx(1, len + 15, y - w + 1.6, y + w - 1.6, 2.2, 3.8, MID, 0.3);
  s += bx(0, len, y - w, y + w, 3.8, 3.8 + ht, WHITE, 0.6);
  const ribs = []; for (let a = 6; a < len - 2; a += 6) ribs.push(seg([X(a), ny + 0.04, 5], [X(a), ny + 0.04, 2.8 + ht]));
  s += L(ribs.join(""), { tone: "faint" });
  const face = (pts, cls) => `<path class="${cls}" d="${poly(pts.map(([lx, z]) => [X(lx), ny + 0.04, z]))}"/>`;
  s += face([[2, 8.6], [len - 2, 8.6], [len - 2, 9.6], [2, 9.6]], "st-stripe");
  if (open && dir < 0) s += `<path class="pm-hole" d="${poly([[X(0) + 0.04, y - w + 1, 5], [X(0) + 0.04, y + w - 1, 5], [X(0) + 0.04, y + w - 1, 2.6 + ht], [X(0) + 0.04, y - w + 1, 2.6 + ht]])}"/>`;
  const cab = [[len + 1, 2.2], [len + 15, 2.2], [len + 15, 10], [len + 14, 16], [len + 10, 21.4], [len + 1, 22]].map(([lx, z]) => [X(lx), z]);
  s += prism(dir > 0 ? cab : [...cab].reverse(), y - w + 0.4, y + w - 0.4, WHITE);
  s += face([[len + 3, 13], [len + 13.4, 13], [len + 12.6, 16], [len + 9.6, 20], [len + 3, 20.4]], "st-glass-fill");
  s += L(seg([X(len + 2.4), ny - 0.36, 3], [X(len + 2.4), ny - 0.36, 21]), { tone: "lo" });
  s += bx(len + 14.4, len + 15.6, y - w + 0.8, y + w - 0.8, 2.2, 4.2, MID, 0.4);
  s += bx(len + 14.2, len + 15.2, ny - 2.8, ny - 0.8, 6, 7.6, { tone: "hi", crease: "lo", className: "st-lamp" }, 0.3);
  s += bx(-0.3, 0.3, ny - 2.2, ny - 0.6, 6, 9, { tone: "mid", crease: "none", className: "pm-tail" }, 0.2);
  s += bx(len + 2, len + 3.6, ny - 0.2, ny + 1.6, 15, 18, HI, 0.3);
  return s + axles.map((a) => wheel(h, X(a), ny - 0.4, 3.4, 3.4, 1)).join("");
}
// a pallet with two layers of four cartons, centred at (x, y) on z
function pallet(h, x, y, z = 0, { l = 10, w = 8, layers = 2, style = HI } = {}) {
  const { box, L, seg } = h;
  let s = box(x - l / 2, x + l / 2, y - w / 2, y + w / 2, z, z + 1.3, MID, 0.2) + L([-0.3, 0, 0.3].map((k) => seg([x + k * l, y + w / 2 + 0.02, z + 0.2], [x + k * l, y + w / 2 + 0.02, z + 1.1])).join(""), { tone: "lo" });
  const cl = l / 2 - 0.2, cw = w / 2 - 0.2, ch = 3.4;
  for (let n = 0; n < layers; n++) for (const cy of [y - w / 4, y + w / 4]) for (const cx of [x - l / 4, x + l / 4]) s += carton(h, cx, cy, z + 1.3 + n * ch, cl, cw, ch - 0.1, style);
  return s;
}
// a pallet rack: posts at both ends of each bay, beam pairs per level; fill(level, bay) draws what sits there
function rack(h, x0, x1, y0, y1, levels, top, bays, fill = () => "", { floor = false } = {}) {
  const { box } = h, bw = (x1 - x0) / bays, xs = Array.from({ length: bays + 1 }, (_, i) => x0 + i * bw);
  let s = xs.map((x) => box(x - 0.5, x + 0.5, y0 - 0.5, y0 + 0.5, 0, top, MID, 0.1)).join("");
  levels.forEach((z, i) => {
    if (!(floor && i === 0)) s += box(x0, x1, y0 - 0.4, y0 + 0.4, z - 0.9, z, HI, 0.1);
    for (let b = 0; b < bays; b++) s += fill(i, b, x0 + bw * (b + 0.5), (y0 + y1) / 2, z);
    if (!(floor && i === 0)) s += box(x0, x1, y1 - 0.4, y1 + 0.4, z - 0.9, z, HI, 0.1);
  });
  return s + xs.map((x) => box(x - 0.5, x + 0.5, y1 - 0.5, y1 + 0.5, 0, top, MID, 0.1)).join("");
}
// a table on four legs with a lower shelf, top at z
function table(h, x0, x1, y0, y1, z) {
  const { box } = h; let s = "";
  for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1]]) s += box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 0, z - 1.2, MID, 0.2);
  s += box(x0 + 0.6, x1 - 0.6, y0 + 0.6, y1 - 0.6, z * 0.32, z * 0.32 + 0.6, MID, 0.3);
  for (const [x, y] of [[x0 + 1, y1 - 1], [x1 - 1, y1 - 1]]) s += box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 0, z - 1.2, MID, 0.2);
  return s + box(x0, x1, y0, y1, z - 1.2, z, HI, 0.4);
}
// a flat device (phone, tablet) lying at z; inner is drawn on its screen in screen units (0..w-1.6, 0..d-1.6)
const device = (h, x0, x1, y0, y1, z, inner = "") => h.box(x0, x1, y0, y1, z, z + 0.9, HI, 1) + h.box(x0 + 0.8, x1 - 0.8, y0 + 0.8, y1 - 0.8, z + 0.9, z + 0.95, { tone: "lo", crease: "none", className: "pm-screen" }, 0.6) + `<g transform="${h.topM(x0 + 0.8, y0 + 0.8, z + 0.96)}">${inner}</g>`;
// a monitor standing on a desk, facing +y; inner is drawn on its screen (u right, v down, face units)
function monitor(h, x, y, z, w = 16, ht = 10) {
  const { box } = h;
  return box(x - 3, x + 3, y - 2.4, y + 0.6, z, z + 0.5, MID, 0.4) + box(x - 0.6, x + 0.6, y - 1.6, y - 0.6, z + 0.5, z + 3, MID, 0.2)
    + box(x - w / 2, x + w / 2, y - 0.6, y + 0.4, z + 3, z + 3 + ht, HI, 0.5) + box(x - w / 2 + 0.6, x + w / 2 - 0.6, y + 0.4, y + 0.45, z + 3.6, z + 2.4 + ht, { tone: "lo", crease: "none", className: "pm-screen" }, 0.3);
}
const screenM = (h, x, y, z, w = 16, ht = 10) => h.sideM(x - w / 2 + 0.6, y + 0.47, z + 2.4 + ht);
// a warehouse front: walls, parapet, dock doors on the +y face (open ones show the dark inside)
function warehouse(h, x0, x1, y0, y1, ht, doors = [], open = []) {
  const { box, L, seg } = h;
  let s = box(x0, x1, y0, y1, 0, ht, WHITE, 0.6) + box(x0 - 0.6, x1 + 0.6, y0 - 0.6, y1 + 0.6, ht, ht + 1.2, HI, 0.4);
  doors.forEach(([a, b], i) => {
    s += box(a, b, y1 - 0.05, y1 + 0.05, 0.2, 13, { tone: "mid", crease: "none", className: open.includes(i) ? "pm-hole-box" : "wn-door" }, 0.2);
    if (!open.includes(i)) s += L([3, 6, 9, 12].map((z) => seg([a, y1 + 0.07, z], [b, y1 + 0.07, z])).join(""), { tone: "lo" });
    s += box(a - 0.6, b + 0.6, y1, y1 + 2, 13, 13.8, HI, 0.2);
  });
  return s;
}
// a cold-room fan unit, a thermometer panel, a person-free door curtain: small things that say "cold"
const fanUnit = (h, x, y, z) => h.box(x - 4, x + 4, y - 3, y + 3, z, z + 3.4, HI, 0.4) + h.cylZ(x, y, z + 3.4, z + 3.6, 2.2, MID, 24) + h.cylZ(x, y, z + 3.6, z + 3.7, 0.6, LO, 12);

/* ---------- the scenes ---------- */
export const MINI = {
  "wine-and-spirits-delivery": [
    // LCBO pickup: the case is carried out of the store's door into the van's open side door
    mini([[-36, -16, 0], [52, -16, 0], [-36, 14, 0], [52, 14, 0], [-36, -16, 27], [52, 14, 22]], (h) => {
      const { box } = h;
      let s = pad(h, -36, 52, -16, 14);
      s += box(-33, -3, -15, 0, 0, 22, WHITE, 0.6) + box(-34, -2, -16, 1, 22, 23.4, HI, 0.4);
      s += win(h, -31, -21, 0, 3, 13) + win(h, -11, -5, 0, 3, 13) + box(-19, -13, -0.05, 0.05, 0, 13, { tone: "mid", crease: "none", className: "wn-door" }, 0.2) + box(-14.6, -14, 0.05, 0.3, 6, 7.4, MID, 0.1);
      s += box(-33, -3, 0, 3.4, 14.4, 15.2, HI, 0.2);
      s += box(-30, -6, 0.1, 0.6, 16.6, 20.8, HI, 0.3) + [-24, -21, -18, -15, -12].map((x) => bottle(h, x, 0.9, 17.2, 0.85, MID)).join("");
      s += box(-20, -12, 0, 6, 0, 0.3, MID, 0.2);
      s += van(h, 6, 4, { door: true });
      const c = carton(h, -16, 5, 0.3, 4.6, 3.4, 3.6, ACC) + [-1.2, 0, 1.2].map((dx) => bottle(h, -16 + dx, 5, 3.9, 0.5)).join("");
      s += h.anim("slide", c, { d: h.dv([-16, 5, 0.3], [27, 11, 4]) });
      return s;
    }, { label: "A case of wine carried from the store into the van" }),
    // packaging: six bottles drop into a divided crate on the packing table, the lid closes, the tape runs over it
    mini([[-20, -12, 0], [20, -12, 0], [-20, 12, 0], [20, 12, 0], [-20, 12, 26], [20, -12, 26]], (h) => {
      const { box } = h, Z = 9.6;
      let s = pad(h, -20, 20, -12, 12, 6);
      for (const [x, y] of [[-15, -7.4], [15, -7.4], [-15, 7.4], [15, 7.4]]) s += box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 0, 8.4, MID, 0.2);
      s += box(-16, 16, -8.4, 8.4, 3, 3.6, MID, 0.3) + box(-16.6, 16.6, -9, 9, 8.4, Z, HI, 0.4);
      s += box(-11, 11, -6.6, 6.6, Z, Z + 1, MID, 0.4) + box(-10.4, 10.4, -6, 6, Z + 1, Z + 1.5, { tone: "hi", crease: "none", className: "wn-foam" }, 0.3);
      s += box(-11, 11, -6.6, -6, Z + 1, Z + 4.2, HI, 0.1) + box(-11, -10.4, -6.6, 6.6, Z + 1, Z + 4.2, HI, 0.1);
      s += box(-3.6, -3.4, -6, 6, Z + 1.5, Z + 4, HI, 0.02) + box(3.4, 3.6, -6, 6, Z + 1.5, Z + 4, HI, 0.02) + box(-10.4, 10.4, -0.1, 0.1, Z + 1.5, Z + 4, HI, 0.02);
      [[-7, -3], [0, -3], [7, -3], [-7, 3], [0, 3], [7, 3]].forEach(([x, y], i) => { s += h.anim("drop", bottle(h, x, y, Z + 1.5, 2.2, i === 4 ? ACC : HI), { d: [0, -60], t: i * 0.22 }); });
      s += box(-11, 11, 6, 6.6, Z + 1, Z + 4.2, HI, 0.1) + box(10.4, 11, -6.6, 6.6, Z + 1, Z + 4.2, HI, 0.1);
      s += h.anim("lid", box(-11.4, 11.4, -7, 7, Z + 4.2, Z + 9, HI, 0.2) + box(-11.4, 11.4, -7, 7, Z + 9, Z + 9.8, HI, 0.4) + `<path class="pm-tape" pathLength="1" d="${h.poly([[0, -7, Z + 9.82], [0, 7, Z + 9.82], [0, 7.02, Z + 6]], false)}"/>`, { d: [0, -46] });
      return s;
    }, { label: "Bottles packed into a divided crate and sealed" }),
    // route: the van drives down the street while its route draws ahead to the customer's door
    mini([[-6, -24, 0], [112, -24, 0], [-6, 12, 0], [112, 12, 0], [-6, -24, 22], [112, 12, 22]], (h) => {
      const { at } = h;
      let s = pad(h, -6, 112, -24, 12, 10) + road(h, -6, 112, -7, 7);
      s += house(h, 8, 26, -22, -12) + house(h, 34, 52, -22, -12) + house(h, 86, 106, -22, -12) + tree(h, 30, -10) + tree(h, 64, -10) + tree(h, 80, -10);
      const p0 = at([46, -2.6, 0.4]), p1 = at([96, -2.6, 0.4]), p2 = at([96, -9.4, 0.9]);
      s += `<path class="pm-route" data-a="draw" pathLength="1" d="M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}L${f1(p2[0])} ${f1(p2[1])}"/>`;
      const pin = at([96, -10, 2]);
      s += h.anim("pop", pinAt(pin), { o: pin });
      s += h.anim("drive", van(h, 2, -2.6), { d: h.dv([0, 0, 0], [48, 0, 0]) });
      return s;
    }, { label: "The van drives an optimized route to the customer" }),
    // photo: the case set down on the porch, framed and photographed
    mini([[-26, -14, 0], [26, -14, 0], [-26, 14, 0], [26, 14, 0], [-26, -14, 28], [26, 14, 20]], (h) => {
      const { box, prism, at } = h;
      let s = pad(h, -26, 26, -14, 14);
      s += box(-24, 24, -14, -4, 0, 24, WHITE, 0.6) + prism([[-25, 24], [25, 24], [0, 29]], -15, -3, { tone: "mid", crease: "lo", className: "wn-roof" });
      s += box(-3.6, 3.6, -4.05, -3.95, 2.6, 15, { tone: "mid", crease: "none", className: "wn-door" }, 0.2) + box(2, 2.6, -3.95, -3.7, 8.4, 9.2, MID, 0.1) + win(h, -18, -10, -4, 9, 15) + win(h, 10, 18, -4, 9, 15);
      s += box(-12, 12, -4, 4, 0, 1.3, MID, 0.3) + box(-12, 12, -4, 1, 1.3, 2.6, HI, 0.3) + box(-6, 6, 4, 7, 0, 0.6, HI, 0.2);
      for (const x of [-11, 11]) s += box(x - 0.5, x + 0.5, 2.6, 3.6, 2.6, 17, MID, 0.1);
      s += box(-12.6, 12.6, -4, 4.4, 17, 18, HI, 0.3);
      s += carton(h, 4, 2.6, 2.6, 5, 3.6, 4, ACC);
      const c = at([4, 2.6, 4.6]), b = (sx, sy) => `M${f1(c[0] + sx * 30)} ${f1(c[1] + sy * 24 - sy * 9)}V${f1(c[1] + sy * 24)}H${f1(c[0] + sx * 30 - sx * 9)}`;
      s += h.anim("frame", `<path class="pm-bracket" d="${[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => b(x, y)).join("")}"/>`, { o: c });
      s += `<circle class="pm-flash" data-a="flash" cx="${f1(c[0])}" cy="${f1(c[1])}" r="40"/>`;
      return s;
    }, { label: "The delivered case photographed on the porch" }),
    // signature: the courier's tablet stands beside the delivered case; the customer signs, a check confirms it
    mini([[-18, -9, 0], [21, -9, 0], [-18, 10, 0], [21, 10, 0], [-18, -9, 17.5], [21, 10, 9]], (h) => {
      const { box } = h, mx = -4, my = -3, w = 22, ht = 13;
      let s = pad(h, -18, 21, -9, 10);
      s += monitor(h, mx, my, 0, w, ht);
      const scr = `<rect class="pm-ui" x="1.4" y="1.2" width="7" height="1.1" rx=".4"/><rect class="pm-ui" x="1.4" y="2.9" width="4.4" height=".7" rx=".3"/><path class="pm-sign-line" d="M1.6 9.6h17.6"/><path class="pm-sign" data-a="draw" d="M2.4 8.6c1.6 -5 3.8 -6.4 3.8 -2.8s-2.2 4.2 .2 1.8s2.8 -5.4 4.4 -1.8s.8 3.2 2.8 .6s2.6 -3.2 4.2 -1"/>`;
      s += `<g transform="${screenM(h, mx, my, 0, w, ht)}">${scr}</g>`;
      s += carton(h, 13, 4, 0, 7, 5.6, 5.4, HI);
      const ck = h.at([mx + w / 2 - 2.4, my + 0.5, ht + 1.4]);
      s += h.anim("pop", checkAt(ck), { o: ck, t: 0.3 });
      return s;
    }, { label: "The customer signs for the delivery on the courier's tablet" }),
  ],

  warehousing: [
    // inventory: a pallet rolls into its ground-level slot between the uprights; the location confirms
    mini([[-26, -14, 0], [26, -14, 0], [-26, 12, 0], [26, 12, 0], [-26, -14, 30], [26, 12, 20]], (h) => {
      let s = pad(h, -26, 26, -14, 12);
      s += rack(h, -20, 20, -11, -1, [0, 9.8, 18.7], 27, 2, (lv, b, x, y, z) => {
        if (lv === 0 && b === 1) return h.anim("push", pallet(h, x, y, 0, { l: 15, w: 8, style: ACC }), { d: h.dv([x, y, 0], [x, y + 14, 0]) });
        return pallet(h, x, y, z, { l: 15, w: 8, layers: lv === 2 ? 1 : 2 });
      }, { floor: true });
      const ck = h.at([10, -1, 11]);
      s += h.anim("pop", checkAt(ck), { o: ck });
      return s;
    }, { label: "A pallet put away in its rack location" }),
    // fulfillment: cartons ride the conveyor through the scan arch
    mini([[-34, -10, 0], [34, -10, 0], [-34, 10, 0], [34, 10, 0], [-34, -10, 20], [34, 10, 16]], (h) => {
      const { box, discY } = h, Z = 7;
      let s = pad(h, -34, 34, -10, 10);
      for (const x of [-26, 0, 26]) s += box(x - 0.6, x + 0.6, -3.6, -2.8, 0, Z, MID, 0.2);
      s += box(-1.2, 1.2, -6, -5, 0, 17, MID, 0.2) + box(-30, 30, -4.2, -3.2, Z - 1.4, Z + 0.6, HI, 0.2);
      for (let x = -29; x <= 29; x += 2.4) s += discY(x, -3.2, 3.2, Z - 0.5, 0.55, MID);
      for (const [i, t] of [[0, 0], [1, 2], [2, 4]]) s += h.anim("slide", carton(h, -24, 0, Z + 0.1, 6, 5, 4.4, i === 1 ? ACC : HI), { d: h.dv([-24, 0, 0], [24, 0, 0]), t: -t });
      s += box(-30, 30, 3.2, 4.2, Z - 1.4, Z + 0.6, HI, 0.2);
      for (const x of [-26, 0, 26]) s += box(x - 0.6, x + 0.6, 2.8, 3.6, 0, Z, MID, 0.2);
      s += box(-1.2, 1.2, 5, 6, 0, 17, MID, 0.2) + box(-1.6, 1.6, -6.4, 6.4, 16.6, 18, HI, 0.3) + box(-1, 1, -1.6, 1.6, 15.2, 16.6, MID, 0.3);
      return s;
    }, { label: "Cartons on the fulfilment conveyor" }),
    // temperature control: a pallet rolls in through the cold room's curtained door and disappears inside
    mini([[-26, -16, 0], [26, -16, 0], [-26, 14, 0], [26, 14, 0], [-26, -16, 30], [26, 14, 16]], (h) => {
      const { box, L, seg } = h;
      let s = pad(h, -26, 26, -16, 14);
      s += box(-22, 18, -15, -3, 0, 22, { tone: "hi", crease: "lo", className: "st-white" }, 0.8) + box(-22.6, 18.6, -15.6, -2.4, 22, 23, HI, 0.4);
      s += box(-8, 8, -3.05, -2.95, 0.2, 15, { tone: "mid", crease: "none", className: "pm-hole-box" }, 0.2);
      s += L(Array.from({ length: 10 }, (_, i) => seg([-7 + i * 1.55, -2.9, 14.6], [-7 + i * 1.55, -2.9, 9])).join(""), { tone: "faint" });
      s += box(-8.8, 8.8, -3, -2.2, 15, 16.4, HI, 0.2) + fanUnit(h, 8, -9, 23);
      s += box(11, 15, -3.05, -2.7, 8, 14, HI, 0.3) + box(12.6, 13.4, -2.7, -2.6, 9, 13, { tone: "mid", crease: "none", className: "pm-therm" }, 0.2);
      const door = [[-8, -3, 0.2], [8, -3, 0.2], [8, -3, 15], [-8, -3, 15]];
      s += h.through(boxPts(-22, 18, -15, -3, 0, 23), door, h.anim("slide", pallet(h, 0, 9, 0, { l: 10, w: 8, style: ACC }), { d: h.dv([0, 9, 0], [0, -10, 0]) }));
      return s;
    }, { label: "A pallet moved into temperature-controlled storage" }),
    // value-added: two products drop into a gift box, the lid goes on, the band wraps it
    mini([[-20, -12, 0], [20, -12, 0], [-20, 12, 0], [20, 12, 0], [-20, 12, 24], [20, -12, 24]], (h) => {
      const { box } = h, Z = 9.6;
      let s = pad(h, -20, 20, -12, 12, 6) + table(h, -17, 17, -9, 9, Z);
      s += box(-9, 9, -6, 6, Z, Z + 0.6, MID, 0.4) + box(-9, 9, -6, -5.4, Z + 0.6, Z + 4, HI, 0.1) + box(-9, -8.4, -6, 6, Z + 0.6, Z + 4, HI, 0.1);
      s += h.anim("drop", box(-6.6, -1, -3.4, 3.4, Z + 0.6, Z + 3.4, ACC, 0.3), { d: [0, -56] }) + h.anim("drop", h.cylZ(4, 0, Z + 0.6, Z + 4.4, 2, ACC, 20), { d: [0, -56], t: 0.3 });
      s += box(-9, 9, 5.4, 6, Z + 0.6, Z + 4, HI, 0.1) + box(8.4, 9, -6, 6, Z + 0.6, Z + 4, HI, 0.1);
      s += h.anim("lid", box(-9.4, 9.4, -6.4, 6.4, Z + 2.6, Z + 5, HI, 0.3) + `<path class="pm-tape" pathLength="1" d="${h.poly([[-9.42, 0, Z + 5.02], [9.42, 0, Z + 5.02], [9.44, 0, Z + 2.6]], false)}"/>`, { d: [0, -46] });
      s += box(11, 15, -1, 3, Z, Z + 0.3, HI, 0.2) + h.L(h.seg([11.6, 1, Z + 0.32], [14.4, 1, Z + 0.32]), { tone: "lo" });
      return s;
    }, { label: "Products kitted into a branded box" }),
    // distribution: the loaded truck pulls away from the dock door
    mini([[-34, -20, 0], [70, -20, 0], [-34, 14, 0], [70, 14, 0], [-34, -20, 26], [70, 14, 26]], (h) => {
      let s = pad(h, -34, 70, -20, 14, 10);
      s += warehouse(h, -32, 64, -20, -10, 22, [[-24, -12], [-6, 6], [16, 28], [40, 52]], [1]);
      s += h.anim("drive", truck(h, -14, 3, { len: 40 }), { d: h.dv([0, 0, 0], [40, 0, 0]) });
      return s;
    }, { label: "A loaded truck leaving the dock" }),
  ],

  "e-commerce-fulfillment": [
    // order: the customer taps "place order"; the confirmation slides in, the badge pops, the order becomes a parcel
    mini([[-20, -12, 0], [20, -12, 0], [-20, 12, 0], [20, 12, 0], [-20, 12, 18], [20, -12, 18]], (h) => {
      const Z = 9.6;
      let s = pad(h, -20, 20, -12, 12, 6) + table(h, -17, 17, -9, 9, Z);
      const scr = `<rect class="pm-ui" x="1" y="1" width="6.8" height="4.4" rx=".6"/><rect class="pm-ui" x="1" y="6.2" width="5" height=".7" rx=".3"/><rect class="pm-ui" x="1" y="7.4" width="3.4" height=".6" rx=".3"/><rect class="pm-btn" x="1" y="9.6" width="6.8" height="1.6" rx=".8"/>`
        + `<g data-a="fade" style="--t:-2.6s"><rect class="pm-banner" x=".5" y=".5" width="7.8" height="3" rx=".6"/><path class="pm-banner-ck" d="M1.5 2.1l.7 .7l1.4 -1.5"/><rect class="pm-banner-t" x="4" y="1.4" width="3.6" height=".55" rx=".25"/><rect class="pm-banner-t" x="4" y="2.35" width="2.4" height=".45" rx=".2"/></g>`;
      s += device(h, -5, 5, -7, 7, Z, scr);
      const ck = h.at([4, -6, Z + 2]);
      s += h.anim("pop", `<circle class="pm-check-bg" cx="${f1(ck[0])}" cy="${f1(ck[1])}" r="10"/><text class="pm-badge" x="${f1(ck[0])}" y="${f1(ck[1] + 4)}">1</text>`, { o: ck, t: -2.2 });
      s += h.anim("pop", carton(h, 11, 2, Z, 6, 5, 4.4, ACC), { o: h.at([11, 2, Z]), t: -1.2 });
      return s;
    }, { label: "A new order placed on a phone" }),
    // picking: the item is pulled off its shelf and lowered into the tote on the cart
    mini([[-24, -14, 0], [24, -14, 0], [-24, 14, 0], [24, 14, 0], [-24, -14, 26], [24, 14, 16]], (h) => {
      const { box } = h;
      let s = pad(h, -24, 24, -14, 14);
      s += rack(h, -20, 20, -12, -4, [0.9, 8.6, 16.3], 24, 3, (lv, b, x, y, z) => (lv === 1 && b === 1 ? "" : carton(h, x, y, z, 9, 6, lv === 2 ? 3.6 : 5, HI)));
      for (const [x, y] of [[-5, 3], [5, 3]]) s += box(x - 0.4, x + 0.4, y - 0.4, y + 0.4, 1.6, 9, MID, 0.1);
      s += box(-6, 6, 3, 11, 1.6, 2.4, HI, 0.3) + box(-5.4, 5.4, 3.6, 10.4, 2.4, 6.4, HI, 0.4);
      for (const [x, y] of [[-5, 4], [5, 4], [-5, 10], [5, 10]]) s += h.cylZ(x, y, 0, 1.6, 0.8, LO, 12);
      const rest = [0, 7, 4];
      s += h.anim("move2", carton(h, 0, 7, 4, 5, 3.6, 3.4, ACC), { d: h.dv(rest, [0, -8, 8.6]), m: h.dv(rest, [0, 2, 11]) });
      s += box(-6, 6, 10.4, 11, 2.4, 6.4, HI, 0.2);
      return s;
    }, { label: "An item picked from the shelf into a tote" }),
    // packing: the items drop into the parcel, the flaps close, the tape runs over
    mini([[-20, -12, 0], [20, -12, 0], [-20, 12, 0], [20, 12, 0], [-20, 12, 24], [20, -12, 24]], (h) => {
      const { box } = h, Z = 9.6;
      let s = pad(h, -20, 20, -12, 12, 6) + table(h, -17, 17, -9, 9, Z);
      s += box(-8, 8, -6, 6, Z, Z + 0.6, MID, 0.3) + box(-8, 8, -6, -5.5, Z + 0.6, Z + 7, HI, 0.1) + box(-8, -7.5, -6, 6, Z + 0.6, Z + 7, HI, 0.1);
      s += h.anim("drop", box(-6, 0, -4, 2, Z + 0.6, Z + 4.4, ACC, 0.3), { d: [0, -56] }) + h.anim("drop", box(1, 6, -2, 4, Z + 0.6, Z + 3, ACC, 0.3), { d: [0, -56], t: 0.3 });
      s += box(-8, 8, 5.5, 6, Z + 0.6, Z + 7, HI, 0.1) + box(7.5, 8, -6, 6, Z + 0.6, Z + 7, HI, 0.1);
      s += h.anim("lid", box(-8.2, 8.2, -6.2, 6.2, Z + 7, Z + 7.6, HI, 0.2) + `<path class="pm-tape" pathLength="1" d="${h.poly([[-8.2, 0, Z + 7.62], [8.2, 0, Z + 7.62], [8.22, 0, Z + 4.6]], false)}"/>`, { d: [0, -40] });
      s += h.cylZ(13, 4, Z, Z + 3.2, 2, MID, 24) + h.cylZ(13, 4, Z + 3.2, Z + 3.3, 0.9, LO, 12);
      return s;
    }, { label: "An order packed and taped" }),
    // label: the printer feeds the shipping label onto the parcel
    mini([[-20, -12, 0], [20, -12, 0], [-20, 12, 0], [20, 12, 0], [-20, 12, 22], [20, -12, 22]], (h) => {
      const { box, prism } = h, Z = 9.6;
      let s = pad(h, -20, 20, -12, 12, 6) + table(h, -17, 17, -9, 9, Z);
      s += box(-14, -2, -6, 4, Z, Z + 5.6, HI, 0.8) + prism([[-14, Z + 5.6], [-2, Z + 5.6], [-3, Z + 7], [-13, Z + 7]], -6, 4, HI) + box(-12, -4, 4, 4.3, Z + 3.6, Z + 4.2, LO, 0.1) + h.cylZ(-4, 4.3, Z + 1.4, Z + 1.6, 0.5, { tone: "mid" }, 10);
      s += carton(h, 8, 0, Z, 10, 8, 6, HI);
      const lab = box(5, 11, -2.6, 2.6, Z + 6, Z + 6.12, ACC, 0.1) + `<g transform="${h.topM(5.6, -2, Z + 6.13)}"><rect class="pm-ui" x=".4" y=".4" width="3.4" height=".6"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect class="pm-bar" x="${0.4 + i * 0.5}" y="1.8" width="${i % 3 ? 0.18 : 0.32}" height="1.8"/>`).join("")}</g>`;
      s += h.anim("drop", lab, { d: h.dv([8, 0, Z + 6], [-8, 4.6, Z + 4]) });
      return s;
    }, { label: "A shipping label printed onto the parcel" }),
    // last mile: the van drives to the customer's house; the parcel arrives at the door
    mini([[-6, -26, 0], [110, -26, 0], [-6, 12, 0], [110, 12, 0], [-6, -26, 22], [110, 12, 22]], (h) => {
      let s = pad(h, -6, 110, -26, 12, 10) + road(h, -6, 110, -7, 7);
      s += house(h, 10, 28, -24, -14) + tree(h, 40, -11) + house(h, 82, 104, -24, -13, 15) + tree(h, 64, -11);
      s += h.box(91, 95, -13, -9, 0, 0.6, HI, 0.2);
      s += h.anim("pop", carton(h, 93, -10.6, 0.6, 3.4, 2.6, 2.8, ACC), { o: h.at([93, -10.6, 0.6]) });
      s += h.anim("drive", van(h, 2, -2.6), { d: h.dv([0, 0, 0], [40, 0, 0]) });
      return s;
    }, { label: "The van delivering the parcel to the customer's door" }),
  ],

  "b2b-transportation": [
    // pickup: a pallet rolls off the dock into the truck's open back and out of sight inside
    mini([[-12, -14, 0], [92, -14, 0], [-12, 14, 0], [92, 14, 0], [-12, -14, 28], [92, 14, 28]], (h) => {
      const { box } = h;
      let s = pad(h, -12, 92, -14, 14, 10);
      s += truck(h, 62, 0, { dir: -1, len: 46, open: true });
      s += box(66, 90, -12, 12, 0, 5, HI, 0.4) + box(66, 90, -12, -9, 5, 28, WHITE, 0.4) + box(68, 88, -9.05, -8.95, 5.2, 24, { tone: "mid", crease: "none", className: "pm-hole-box" }, 0.2);
      const opening = [[62.05, -7.4, 5], [62.05, 7.4, 5], [62.05, 7.4, 27.4], [62.05, -7.4, 27.4]];
      s += h.through(boxPts(16, 62, -8.4, 8.4, 2.2, 28.8), opening, h.anim("slide", pallet(h, 78, 0, 5, { style: ACC }), { d: h.dv([78, 0, 5], [42, 0, 5]) }));
      return s;
    }, { label: "A pallet loaded from the dock into the truck" }),
    // scan: the pallet passes the scan portal; the beam reads it and confirms
    mini([[-24, -14, 0], [24, -14, 0], [-24, 14, 0], [24, 14, 0], [-24, -14, 28], [24, 14, 20]], (h) => {
      const { box, at } = h;
      let s = pad(h, -24, 24, -14, 14);
      s += box(-1, 1, -11, -9, 0, 24, MID, 0.2) + box(-1.4, 1.4, -11, 11, 24, 26, HI, 0.3) + box(-2, 2, -2, 2, 22, 24, MID, 0.3);
      s += pallet(h, 0, 0, 0, { l: 12, w: 9 }) + box(-2, 2, 4.52, 4.6, 3.4, 5.4, ACC, 0.1);
      const a = at([0, 0, 22]), b1 = at([-6, 4.6, 7.6]), b2 = at([6, 4.6, 7.6]);
      s += `<path class="pm-beam" data-a="flash" d="M${f1(a[0])} ${f1(a[1])}L${f1(b1[0])} ${f1(b1[1])}L${f1(b2[0])} ${f1(b2[1])}Z"/>`;
      s += box(-1, 1, 9, 11, 0, 24, MID, 0.2);
      const ck = at([9, 4, 14]);
      s += h.anim("pop", checkAt(ck), { o: ck });
      return s;
    }, { label: "A pallet scanned at the portal" }),
    // route: the truck takes the optimized route down the highway to the pin
    mini([[-8, -18, 0], [140, -18, 0], [-8, 14, 0], [140, 14, 0], [-8, -18, 26], [140, 14, 26]], (h) => {
      const { at, box } = h;
      let s = pad(h, -8, 140, -18, 14, 12) + road(h, -8, 140, -9, 9);
      for (let x = 0; x < 140; x += 10) s += box(x - 0.3, x + 0.3, -13.4, -12.8, 0, 2.6, MID, 0.1);
      s += box(-8, 140, -13.6, -12.6, 2.2, 3, HI, 0.2) + tree(h, 30, -16, 14) + tree(h, 90, -16, 14) + tree(h, 120, -16, 14);
      const p0 = at([70, -3, 0.4]), p1 = at([130, -3, 0.4]);
      s += `<path class="pm-route" data-a="draw" pathLength="1" d="M${f1(p0[0])} ${f1(p0[1])}L${f1(p1[0])} ${f1(p1[1])}"/>`;
      const pin = at([130, -3, 1]);
      s += h.anim("pop", pinAt(pin), { o: pin });
      s += h.anim("drive", truck(h, 2, -3, { len: 40 }), { d: h.dv([0, 0, 0], [56, 0, 0]) });
      return s;
    }, { label: "The truck on its optimized route" }),
    // tracking: on the tablet map, the route draws and the delivery pin drops
    mini([[-20, -14, 0], [20, -14, 0], [-20, 14, 0], [20, 14, 0], [-20, 14, 14], [20, -14, 14]], (h) => {
      const Z = 9.6;
      let s = pad(h, -20, 20, -14, 14, 6) + table(h, -18, 18, -11, 11, Z);
      const map = `<path class="pm-map" d="M0 3.4h19.6M0 9h19.6M5 0v14.4M13 0v14.4M0 13l8 -6l11.6 2"/><path class="pm-route-s" data-a="draw" pathLength="1" d="M2 12.4H5V9h8V3.4h4.6"/>`;
      s += device(h, -11, 11, -8, 8, Z, map);
      const pin = h.at([7.4, -4, Z + 1]);
      s += h.anim("pop", pinAt(pin), { o: pin });
      s += h.cylZ(14, 6, Z, Z + 0.6, 0.6, HI, 10);
      return s;
    }, { label: "The customer tracking the shipment on a map" }),
    // drop: the pallet is rolled up to the business's door; delivery confirmed
    mini([[-30, -18, 0], [40, -18, 0], [-30, 14, 0], [40, 14, 0], [-30, -18, 26], [40, 14, 22]], (h) => {
      const { box, at } = h;
      let s = pad(h, -30, 40, -18, 14, 10);
      s += warehouse(h, -28, 36, -18, -8, 22, [[-20, -8], [14, 26]]) + box(-4, 8, -8.05, -7.95, 9, 18, { tone: "mid", crease: "none", className: "st-glass" }, 0.2);
      s += h.anim("push", pallet(h, 20, -2, 0, { style: ACC }), { d: h.dv([20, -2, 0], [20, 12, 0]) });
      const ck = at([28, -2, 12]);
      s += h.anim("pop", checkAt(ck), { o: ck });
      return s;
    }, { label: "The pallet delivered to the business" }),
  ],

  "retail-distribution": [
    // order receipt: the store's order comes in on screen and is accepted
    mini([[-20, -12, 0], [20, -12, 0], [-20, 12, 0], [20, 12, 0], [-20, -12, 26], [20, 12, 14]], (h) => {
      const Z = 9.6, mx = 0, my = -4;
      let s = pad(h, -20, 20, -12, 12, 6) + table(h, -17, 17, -9, 9, Z) + monitor(h, mx, my, Z, 18, 11);
      const rows = [1.2, 3.4, 5.6].map((y) => `<rect class="pm-ui" x="1" y="${y}" width="10" height="1.2" rx=".4"/><rect class="pm-ui" x="12" y="${y}" width="3" height="1.2" rx=".4"/>`).join("");
      s += `<g transform="${screenM(h, mx, my, Z, 18, 11)}">${rows}<g data-a="fade"><rect class="pm-row" x=".6" y="7.6" width="15.6" height="1.6" rx=".5"/></g></g>`;
      s += h.box(-8, 8, 2, 6, Z, Z + 0.6, HI, 0.4);
      const ck = h.at([10, -4, Z + 13]);
      s += h.anim("pop", checkAt(ck), { o: ck });
      return s;
    }, { label: "A store order received" }),
    // picking: the forklift lifts the pallet up to its rack level
    mini([[-26, -14, 0], [26, -14, 0], [-26, 14, 0], [26, 14, 0], [-26, -14, 30], [26, 14, 20]], (h) => {
      const { box } = h;
      let s = pad(h, -26, 26, -14, 14);
      s += rack(h, 2, 24, -12, -2, [0.9, 12], 24, 1, (lv, b, x, y, z) => (lv === 0 ? pallet(h, x, y, z, { l: 15, w: 8 }) : ""));
      // forklift facing +x: counterweight body, guard, mast, wheels; forks and pallet rise
      const fx = -18;
      s += wheel(h, fx + 2, -4.6, 2.2, 2.2, -1) + wheel(h, fx + 10, -4.6, 2.2, 2.2, -1);
      s += box(fx, fx + 12, -4.4, 4.4, 1.4, 7.6, WHITE, 0.6) + box(fx - 0.6, fx + 3, -4.4, 4.4, 1.4, 9, HI, 0.6);
      s += box(fx + 2, fx + 2.6, -4, -3.4, 7.6, 17, MID, 0.1) + box(fx + 9, fx + 9.6, -4, -3.4, 7.6, 17, MID, 0.1) + box(fx + 2, fx + 2.6, 3.4, 4, 7.6, 17, MID, 0.1) + box(fx + 1.6, fx + 10, -4.2, 4.2, 17, 17.6, HI, 0.2);
      s += box(fx + 12, fx + 13, -3.6, -2.6, 0.6, 22, MID, 0.1) + box(fx + 12, fx + 13, 2.6, 3.6, 0.6, 22, MID, 0.1);
      s += h.anim("rise", box(fx + 13, fx + 14, -3.6, 3.6, 1, 6, MID, 0.1) + box(fx + 13, fx + 22, -2.6, -1.8, 1, 1.4, MID, 0.1) + box(fx + 13, fx + 22, 1.8, 2.6, 1, 1.4, MID, 0.1) + pallet(h, fx + 21, -0.2, 1.4, { l: 15, w: 8, style: ACC }), { d: h.dv([0, 0, 0], [0, 0, 11]) });
      s += wheel(h, fx + 2, 4.4, 2.2, 2.2, 1) + wheel(h, fx + 10, 4.4, 2.2, 2.2, 1);
      return s;
    }, { label: "A forklift lifting a pallet to its rack level" }),
    // wrap: stretch film winds round the pallet, layer by layer
    mini([[-20, -14, 0], [20, -14, 0], [-20, 14, 0], [20, 14, 0], [-20, -14, 22], [20, 14, 18]], (h) => {
      const { box, at } = h;
      let s = pad(h, -20, 20, -14, 14);
      s += h.cylZ(0, 0, 0, 1, 9, MID, 40) + pallet(h, 0, 0, 1, { l: 12, w: 9, layers: 3 });
      s += box(12, 14, -1, 1, 0, 16, MID, 0.3) + box(11.4, 12.4, -1.4, 1.4, 4, 9, HI, 0.4);
      [3.6, 6.8, 10].forEach((z, i) => {
        const a = at([-6.02, 4.52, z]), b = at([6.02, 4.52, z]), c = at([6.02, -4.52, z]);
        s += `<path class="pm-wrap" data-a="draw" pathLength="1" style="--t:${-i * 0.5}s" d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(c[0])} ${f1(c[1])}"/>`;
      });
      return s;
    }, { label: "A pallet stretch-wrapped for the store" }),
    // distribution centre: a truck drives past the dock doors on its way out
    mini([[-34, -22, 0], [74, -22, 0], [-34, 14, 0], [74, 14, 0], [-34, -22, 26], [74, 14, 26]], (h) => {
      let s = pad(h, -34, 74, -22, 14, 10);
      s += warehouse(h, -32, 70, -22, -10, 22, [[-26, -16], [-10, 0], [6, 16], [22, 32], [38, 48], [54, 64]], [2]);
      s += h.anim("drive", truck(h, -26, 3, { len: 40 }), { d: h.dv([0, 0, 0], [42, 0, 0]) });
      return s;
    }, { label: "A truck leaving the distribution centre" }),
    // the store: stock lands on the shelf, front and centre
    mini([[-24, -12, 0], [24, -12, 0], [-24, 12, 0], [24, 12, 0], [-24, -12, 26], [24, 12, 16]], (h) => {
      const { box } = h;
      let s = pad(h, -24, 24, -12, 12);
      s += box(-20, 20, -8, -7, 0, 22, HI, 0.2) + box(-20.4, 20.4, -8, 0.4, 0, 2.4, MID, 0.3);
      [2.4, 9, 15.6].forEach((z, lv) => {
        s += box(-20, 20, -7, 0, z, z + 0.6, HI, 0.2);
        for (let i = 0; i < 6; i++) {
          const x = -16.6 + i * 6.6;
          const item = carton(h, x, -3.6, z + 0.6, 4.4, 4.2, lv === 2 ? 3.6 : 4.6, lv === 1 && i > 2 ? ACC : HI);
          s += lv === 1 && i > 2 ? h.anim("drop", item, { d: [0, -40], t: (i - 3) * 0.25 }) : item;
        }
      });
      s += box(-20.6, -19.6, -8, 0.4, 0, 22.4, MID, 0.2) + box(19.6, 20.6, -8, 0.4, 0, 22.4, MID, 0.2);
      return s;
    }, { label: "Stock on the store shelf" }),
  ],

  "logistics-management-system": [
    // integration: three storefronts sync into one system, data runs down the lines
    mini([[-26, -16, 0], [26, -16, 0], [-26, 14, 0], [26, 14, 0], [-26, -16, 16], [26, 14, 12]], (h) => {
      const { box, at } = h;
      let s = pad(h, -26, 26, -16, 14);
      const tiles = [[-16, -9], [0, -9], [16, -9]], hub = [0, 7];
      tiles.forEach(([x, y]) => { const a = at([x, y + 3, 0.05]), b = at([x, y + 9, 0.05]), c = at([hub[0], hub[1] - 3, 0.05]); s += `<path class="pm-link" d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(c[0])} ${f1(c[1])}"/>`; });
      tiles.forEach(([x, y], i) => { const a = at([x, y + 3, 0.1]), b = at([x, y + 9, 0.1]), c = at([hub[0], hub[1] - 3, 0.1]); s += `<path class="pm-route" data-a="draw" pathLength="1" style="--t:${-i * 0.6}s" d="M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(c[0])} ${f1(c[1])}"/>`; });
      tiles.forEach(([x, y]) => { s += box(x - 5, x + 5, y - 3, y + 3, 0, 6, HI, 0.6) + box(x - 5.6, x + 5.6, y - 3.4, y + 3.4, 6, 7, MID, 0.4); });
      s += box(-6, 6, 4, 10, 0, 9, WHITE, 0.6) + [2.6, 5, 7.4].map((z) => h.L(h.seg([-5, 10.02, z], [5, 10.02, z]), { tone: "lo" })).join("");
      const led = at([4, 10.05, 7.4]);
      s += h.anim("pop", `<circle class="pm-led" cx="${f1(led[0])}" cy="${f1(led[1])}" r="2.6"/>`, { o: led });
      return s;
    }, { label: "Sales channels syncing into one system" }),
    // inventory: stock levels rise and settle, one line in orange
    mini([[-24, -12, 0], [24, -12, 0], [-24, 12, 0], [24, 12, 0], [-24, -12, 22], [24, 12, 12]], (h) => {
      const { box } = h;
      let s = pad(h, -24, 24, -12, 12, 6);
      s += box(-20, 20, -7, -6.6, 0, 0.4, MID, 0.1) + [5, 10, 15].map((z) => h.L(h.seg([-20, -8, z], [20, -8, z]), { tone: "faint" })).join("");
      [[-15, 9, HI], [-7.5, 14, HI], [0, 6, HI], [7.5, 17, ACC], [15, 11, HI]].forEach(([x, ht, st], i) => {
        s += h.anim("grow", box(x - 2.6, x + 2.6, -4, 2, 0, ht, st, 0.3), { t: -i * 0.2, o: h.at([x, -1, 0]) });
      });
      return s;
    }, { label: "Live inventory levels" }),
    // warehouse management: the right slot lights up on the floor plan and the pick path draws to it
    mini([[-26, -16, 0], [26, -16, 0], [-26, 16, 0], [26, 16, 0], [-26, -16, 10], [26, 16, 8]], (h) => {
      const { box, at } = h;
      let s = pad(h, -26, 26, -16, 16);
      for (const y of [-11, -3, 5]) for (let x = -20; x < 20; x += 8) s += box(x, x + 7, y, y + 4, 0, 3.6, HI, 0.2);
      const p = [[-22, 12], [-4, 12], [-4, 3.2], [8.5, 3.2]].map(([x, y]) => at([x, y, 0.05]));
      s += `<path class="pm-route" data-a="draw" pathLength="1" d="M${p.map((q) => q.map(f1).join(" ")).join("L")}"/>`;
      s += h.anim("pop", box(4.2, 10.8, 5, 9, 3.6, 3.7, { tone: "mid", crease: "none", className: "pm-slot" }, 0.2), { o: at([7.5, 7, 3.6]) });
      s += box(-24, -20, 10, 14, 0, 2.4, ACC, 0.3);
      return s;
    }, { label: "The pick path to the right slot" }),
    // fleet: the truck drives its route on the map, its location pinned
    mini([[-8, -18, 0], [120, -18, 0], [-8, 14, 0], [120, 14, 0], [-8, -18, 30], [120, 14, 26]], (h) => {
      const { at, box } = h;
      let s = pad(h, -8, 120, -18, 14, 12) + road(h, -8, 120, -9, 9);
      s += box(10, 30, -18, -12, 0, 8, HI, 0.4) + box(70, 96, -18, -12, 0, 10, HI, 0.4) + tree(h, 50, -14, 14) + tree(h, 108, -14, 14);
      const drive = h.dv([0, 0, 0], [52, 0, 0]);
      const pin = at([44, -3, 30]);
      s += h.anim("drive", truck(h, 2, -3, { len: 36 }) + pinAt(pin), { d: drive });
      return s;
    }, { label: "A truck tracked live on its route" }),
    // digital BOL: the bill of lading is signed on the tablet and stamped approved
    mini([[-20, -14, 0], [20, -14, 0], [-20, 14, 0], [20, 14, 0], [-20, 14, 14], [20, -14, 14]], (h) => {
      const Z = 9.6;
      let s = pad(h, -20, 20, -14, 14, 6) + table(h, -18, 18, -11, 11, Z);
      const doc = `<rect class="pm-paper" x="1" y=".8" width="12" height="13.4" rx=".4"/><rect class="pm-ui" x="2.2" y="2" width="5" height=".9" rx=".3"/>${[3.8, 5.2, 6.6, 8].map((y) => `<rect class="pm-ui" x="2.2" y="${y}" width="${y === 8 ? 5 : 9}" height=".5" rx=".2"/>`).join("")}<path class="pm-sign-line" d="M2.2 12.4h6"/><path class="pm-sign" data-a="draw" pathLength="1" d="M2.4 11.8c.8 -3.2 2 -3.6 2 -1.4s-1 2.2 .2 1s1.4 -3 2.2 -1.2s.4 1.6 1.6 .2"/>`;
      s += device(h, -11, 5, -9, 9, Z, doc);
      const st = h.at([-1, -2, Z + 1]);
      s += h.anim("pop", `<g transform="rotate(-12 ${f1(st[0])} ${f1(st[1])})"><rect class="pm-stamp" x="${f1(st[0] - 30)}" y="${f1(st[1] - 11)}" width="60" height="22" rx="5"/><text class="pm-stamp-t" x="${f1(st[0])}" y="${f1(st[1] + 4)}">APPROVED</text></g>`, { o: st, t: 0.4 });
      s += carton(h, 12, 2, Z, 6, 5, 4, HI);
      return s;
    }, { label: "A digital bill of lading signed and approved" }),
  ],
};

// preview page
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isMain) {
  mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
  writeFileSync(new URL("./out/proc-mini.json", import.meta.url), JSON.stringify(MINI));
  const cards = () => Object.entries(MINI).map(([key, list]) => `<h3>${key}</h3><div class="grid">${list.map((s) => `<div class="proc-step is-in"><div class="proc-card"><div class="proc-art iso" data-theme="light">${s}</div></div></div>`).join("")}</div>`).join("");
  const lenScript = `<script>document.querySelectorAll('.pm [data-a="draw"], .pm .pm-tape').forEach((el) => el.style.setProperty('--len', el.getTotalLength().toFixed(2)));</script>`;
  writeFileSync(new URL("./out/proc-mini.html", import.meta.url), `<!doctype html><html data-theme="${process.env.THEME || "light"}"><meta charset="utf-8">
<link rel="stylesheet" href="../../assets/iso.css"><link rel="stylesheet" href="../../assets/site.css"><link rel="stylesheet" href="../../assets/story.css"><link rel="stylesheet" href="../../assets/fx.css"><link rel="stylesheet" href="../../assets/service.css"><link rel="stylesheet" href="../../assets/theme-dark.css">
<style>body{padding:24px;background:var(--c-white)}.grid{display:grid;grid-template-columns:repeat(2,640px);gap:16px;margin-bottom:24px}h3{font:600 13px system-ui;color:var(--c-ink)}.proc-card{padding:0}.proc-art{margin:0}</style><body>${cards()}${lenScript}</body></html>`);
  console.log("wrote proc-mini", Object.values(MINI).flat().length, "scenes");
}
