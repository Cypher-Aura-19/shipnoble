// Small line drawings for the service "how it works" cards: one per step, drawn on a ground line in light strokes
// with exactly one orange detail. Shared parts (truck, van, carton, pallet, rack, phone...) keep every page in one style.
//   import { ART } from "./proc-art.mjs";   ART["wine-and-spirits-delivery"][0] -> "<svg ...>"
// Classes (styled in service.css): l = main line, d = dim line, a = orange line, af = orange fill, k = card-coloured fill
// with a main line (hides what is behind it), kd = card fill with a dim line, t = small label text.
const W = 360, H = 132, G = 112;
const f = (n) => +n.toFixed(1);
const P = (d, c = "l") => `<path class="${c}" d="${d}"/>`;
const R = (x, y, w, h, r = 2, c = "k") => `<rect class="${c}" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${r}"/>`;
const C = (x, y, r, c = "k") => `<circle class="${c}" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`;
const L = (x1, y1, x2, y2, c = "l") => P(`M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`, c);
const T = (x, y, s, c = "t") => `<text class="${c}" x="${f(x)}" y="${f(y)}">${s}</text>`;

// the ground: a long line that fades out at both ends, with a few short marks
const ground = (marks = [40, 128, 250, 318]) => `<path class="g" d="M8 ${G}H${W - 8}"/>` + marks.map((x) => P(`M${x} ${G + 7}h10`, "d")).join("");
const wheel = (x, y = G - 8, r = 8) => C(x, y, r) + C(x, y, r * 0.38, "d");
const motion = (x, y, n = 3) => [0, 1, 2].slice(0, n).map((i) => P(`M${x - i * 4} ${y + i * 7}h-${16 - i * 4}`, "d")).join("");

// a box truck facing right: body from x, length len
function truck(x, { len = 150, h = 50, tail = false, brand = true, open = false } = {}) {
  const top = G - 18 - h, cab = x + len + 4;
  let s = R(x, top, len, h, 3);
  if (open) s += R(x + 6, top + 6, len * 0.42, h - 12, 2, "kd");
  for (let i = 1; i < 6; i++) if (!open || x + (len / 6) * i > x + len * 0.42 + 8) s += L(x + (len / 6) * i, top + 6, x + (len / 6) * i, top + h - 6, "d");
  if (brand) s += P(`M${f(x + len * 0.5)} ${f(top + h - 12)}h${f(len * 0.42)}`, "a");
  s += P(`M${cab} ${G - 18}V${top + 14}h22l12 16v${f(h - 30 + 0)}V${G - 18}Z`, "k");
  s += P(`M${cab + 4} ${top + 18}h14l8 10h-22Z`, "kd");
  s += L(x - 2, G - 18, cab + 34, G - 18);
  if (tail) s += R(x - 16, G - 21, 14, 3, 1, "k") + L(x - 2, G - 18, x - 2, G - 6, "d");
  return s + wheel(x + 22) + wheel(x + len - 24) + wheel(cab + 20);
}
// a delivery van facing right
function van(x, { brand = true } = {}) {
  let s = P(`M${x} ${G - 16}V${G - 58}a4 4 0 0 1 4-4h66l18 22h8a4 4 0 0 1 4 4v20Z`, "k");
  s += P(`M${x + 72} ${G - 58}h-6v20h22Z`, "kd");
  s += L(x + 60, G - 54, x + 60, G - 16, "d");
  if (brand) s += P(`M${x + 10} ${G - 30}h40`, "a");
  s += L(x - 2, G - 16, x + 102, G - 16);
  return s + wheel(x + 22) + wheel(x + 80);
}
// a carton: front face and top, with tape
function carton(x, y, w, h, { tape = true, acc = false } = {}) {
  const d = Math.min(10, w * 0.22);
  let s = P(`M${f(x)} ${f(y)}h${f(w)}v${f(h)}h-${f(w)}Z`, "k") + P(`M${f(x)} ${f(y)}l${d} -${d * 0.6}h${f(w)}l-${d} ${d * 0.6}M${f(x + w)} ${f(y)}l${d} -${d * 0.6}v${f(h)}l-${d} ${d * 0.6}`, "k");
  if (tape) s += P(`M${f(x + w / 2)} ${f(y)}v${f(h * 0.32)}`, acc ? "a" : "d");
  return s;
}
const pallet = (x, w, y = G) => R(x, y - 6, w, 6, 1) + [0.15, 0.5, 0.85].map((k) => L(x + w * k, y - 6, x + w * k, y, "d")).join("");
// a stack of cartons on a pallet
function load(x, w = 70, rows = 2, { acc = -1 } = {}) {
  let s = pallet(x, w); const bw = (w - 4) / 2, bh = 18;
  for (let r = 0; r < rows; r++) for (let c = 0; c < 2; c++) s += carton(x + 2 + c * bw, G - 6 - bh * (r + 1), bw - 2, bh - 1, { acc: r * 2 + c === acc });
  return s;
}
// a rack: uprights and beams, with cartons on its shelves
function rack(x, w, h, levels = 3, { fill = [], acc = -1 } = {}) {
  let s = ""; const top = G - h;
  for (let i = 0; i < levels; i++) { const y = top + (h / levels) * (i + 1) - 2; s += L(x, y, x + w, y); }
  s += L(x, top, x, G) + L(x + w, top, x + w, G) + L(x + w / 2, top, x + w / 2, G, "d");
  fill.forEach(([lv, slot], i) => { const y = top + (h / levels) * (lv + 1) - 2, bw = w / 2 - 12; s += carton(x + 6 + slot * (w / 2), y - 16, bw, 15, { acc: i === acc }); });
  return s;
}
// a phone: frame, notch, and whatever its screen shows
const phone = (x, y, screen = "", w = 46, h = 84) => R(x, y, w, h, 8) + P(`M${x + w / 2 - 6} ${y + 6}h12`, "d") + screen;
const pin = (x, y, c = "af") => P(`M${x} ${y}c-7 -8 -11 -12 -11 -18a11 11 0 0 1 22 0c0 6 -4 10 -11 18Z`, c === "af" ? "a" : c) + C(x, y - 18, 3.5, c === "af" ? "af" : "d");
const check = (x, y, s = 1, c = "a") => P(`M${x - 6 * s} ${y}l${4 * s} ${4 * s}l${8 * s} -${9 * s}`, c);
// a building with a flat roof, a door and windows
function shed(x, w, h, { door = true, acc = false, sign = false } = {}) {
  let s = R(x, G - h, w, h, 2) + L(x - 4, G - h, x + w + 4, G - h);
  if (door) s += R(x + w / 2 - 14, G - 34, 28, 34, 1, "kd") + [8, 16, 24].map((k) => L(x + w / 2 - 14, G - 34 + k, x + w / 2 + 14, G - 34 + k, "d")).join("");
  if (sign) s += R(x + w / 2 - 22, G - h + 8, 44, 10, 2, acc ? "a" : "kd");
  return s;
}

const svg = (body, label) => `<svg class="pa" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">${body}</svg>`;

export const ART = {
  warehousing: [
    // inventory: a rack with a handheld scanner reading one carton
    svg(ground() + rack(60, 150, 86, 3, { fill: [[0, 0], [0, 1], [1, 0], [2, 1], [2, 0]], acc: 3 }) + R(240, 48, 22, 40, 5) + R(244, 54, 14, 14, 2, "kd") + P("M240 56l-38 -6M240 66l-38 14", "a") + P("M246 88v14h10v-14", "k"), "A rack being scanned"),
    // fulfillment: cartons riding a conveyor toward the door
    svg(ground() + L(40, 84, 300, 84) + L(40, 90, 300, 90) + [60, 100, 140, 180, 220, 260].map((x) => C(x, 87, 3, "kd")).join("") + L(70, 90, 70, G, "d") + L(270, 90, 270, G, "d") + carton(84, 62, 34, 22) + carton(150, 62, 34, 22, { acc: true }) + carton(216, 62, 34, 22) + motion(144, 66), "Cartons on a conveyor"),
    // temperature control: a cold room with a thermometer and frost
    svg(ground() + shed(70, 160, 86, { door: true }) + R(250, 34, 14, 56, 7) + C(257, 92, 9) + P("M257 82V48", "a") + C(257, 92, 4.5, "af") + [[110, 44], [190, 44]].map(([x, y]) => P(`M${x} ${y - 9}v18M${x - 8} ${y - 4.5}l16 9M${x - 8} ${y + 4.5}l16 -9`, "d")).join(""), "A temperature-controlled room"),
    // value-added: a carton being taped on a packing table, a label beside it
    svg(ground() + L(70, 80, 290, 80) + L(84, 80, 84, G) + L(276, 80, 276, G) + carton(140, 46, 64, 34, { tape: false }) + P("M172 46v14", "a") + P("M226 52l18 -10h22l-10 10Z", "k") + R(228, 64, 30, 16, 2) + L(233, 70, 252, 70, "d") + L(233, 75, 246, 75, "d"), "A carton being taped and labelled"),
    // distribution: a truck backed onto a dock door
    svg(ground() + shed(14, 96, 92, { door: false }) + R(66, 36, 38, 58, 1, "kd") + L(66, 94, 110, 94) + truck(118, { len: 140, brand: true }), "A truck at the dock door"),
  ],
  "e-commerce-fulfillment": [
    // order: a phone showing a new order, a notification badge
    svg(ground() + phone(150, 22, R(158, 40, 30, 22, 3, "kd") + L(158, 72, 188, 72, "d") + L(158, 80, 178, 80, "d") + R(158, 88, 30, 9, 4, "af")) + C(198, 26, 7, "af") + P("M110 84h26M224 84h26", "d") + P("M118 76h18M224 92h18", "d"), "A phone showing a new order"),
    // picking: a shelf and a tote with one item going in
    svg(ground() + rack(50, 140, 86, 3, { fill: [[0, 0], [1, 1], [2, 0], [2, 1]] }) + P("M226 78h70l-8 30h-54Z", "k") + L(232, 88, 290, 88, "d") + carton(244, 50, 26, 18, { acc: true }) + P("M257 72v4", "a"), "An item being picked into a tote"),
    // packing: a carton with tape running across it
    svg(ground() + L(60, 86, 300, 86) + L(76, 86, 76, G) + L(284, 86, 284, G) + carton(122, 40, 96, 46, { tape: false }) + P("M170 40v18", "a") + C(244, 58, 13) + C(244, 58, 6, "d") + P("M231 58h-26", "d"), "A parcel being taped"),
    // label: a printer feeding a shipping label
    svg(ground() + R(110, 56, 110, 46, 8) + L(122, 70, 208, 70, "d") + R(132, 26, 66, 38, 2) + P("M140 36h28M140 44h20", "d") + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => L(178 + i * 2.4, 46, 178 + i * 2.4, 58, "a")).join("") + C(206, 88, 3, "af") + L(110, 102, 220, 102), "A label printer feeding a shipping label"),
    // last mile: a van at a house
    svg(ground() + P("M236 112V62l38 -28l38 28v50", "k") + R(264, 80, 20, 32, 1, "kd") + R(248, 66, 14, 12, 1, "kd") + C(281, 96, 1.6, "af") + van(60) + motion(54, 74), "A van delivering to a house"),
  ],
  "b2b-transportation": [
    // pickup: a pallet lifted on the tail lift
    svg(ground() + truck(100, { len: 150, tail: true }) + load(40, 54, 1, { acc: 0 }) + P("M98 94h-50", "d"), "A pallet loaded by tail lift"),
    // scan: a scanner beam reading a pallet label
    svg(ground() + load(80, 96, 2) + R(146, 60, 22, 12, 1) + [0, 1, 2, 3, 4].map((i) => L(150 + i * 3.2, 63, 150 + i * 3.2, 69, "d")).join("") + R(250, 40, 22, 44, 5) + R(254, 46, 14, 12, 2, "kd") + P("M250 54l-80 8M250 66l-80 2", "a") + P("M256 84v18h10v-18", "k"), "A pallet label being scanned"),
    // route: a truck on the road with a route line ahead to a pin
    svg(ground() + truck(30, { len: 130 }) + P("M210 104c30 0 40 -40 70 -40s30 -20 40 -20", "a") + pin(322, 46) + motion(26, 52), "A truck on an optimized route"),
    // tracking: a phone with a map, a route and a moving dot
    svg(ground() + phone(156, 20, P("M168 92c6 -18 22 -10 22 -28s-8 -18 -6 -26", "d") + C(184, 38, 3.5, "af") + C(168, 92, 3, "kd")) + P("M96 70h36M228 70h36", "d") + P("M104 78h28M228 62h28", "d"), "A phone tracking the delivery"),
    // drop: a pallet delivered at a business door, with a check
    svg(ground() + shed(40, 150, 86, { sign: true, acc: true }) + load(214, 66, 2) + C(296, 38, 12) + check(296, 38), "A pallet delivered on schedule"),
  ],
  "retail-distribution": [
    // order: an order sheet with lines arriving
    svg(ground() + R(138, 18, 84, 94, 4) + P("M150 34h40M150 46h60M150 58h52M150 70h60M150 82h36", "d") + R(150, 92, 34, 10, 5, "af") + P("M96 46h28M100 58h20M236 70h28M236 82h20", "d"), "A store order arriving"),
    // picking: a forklift lifting a pallet
    svg(ground() + rack(214, 120, 88, 2, { fill: [[0, 0], [1, 1], [1, 0]] }) + P("M70 104V64h34l10 18v22Z", "k") + R(76, 70, 22, 16, 2, "kd") + L(120, 42, 120, 104) + L(126, 42, 126, 104, "d") + L(126, 92, 166, 92) + load(128, 46, 2, { acc: 1 }) + wheel(82, 104, 8) + wheel(108, 104, 6), "A forklift picking a pallet"),
    // wrap: a pallet in stretch wrap
    svg(ground() + load(130, 100, 2) + [0, 1, 2, 3].map((i) => P(`M128 ${50 + i * 14}l104 ${8 - (i % 2) * 4}`, i === 1 ? "a" : "d")).join("") + R(250, 40, 12, 52, 6) + L(256, 46, 256, 86, "d"), "A pallet in stretch wrap"),
    // distribution centre: a long building with dock doors and a truck
    svg(ground() + R(30, 38, 300, 58, 2) + L(26, 38, 334, 38) + [60, 120, 180, 240].map((x) => R(x, 64, 34, 32, 1, "kd")).join("") + R(126, 46, 108, 10, 2, "a") + L(30, 96, 330, 96), "A distribution centre"),
    // store: shelves stocked, one new carton in orange
    svg(ground() + P("M60 112V40h240v72", "k") + P("M52 40h256", "l") + R(70, 24, 220, 16, 2) + [62, 86].map((y) => L(72, y, 288, y)).join("") + [80, 120, 160, 200, 240].map((x, i) => carton(x, 44, 26, 16, { tape: false, acc: i === 2 }) + carton(x, 68, 26, 16, { tape: false })).join(""), "Store shelves stocked"),
  ],
  "wine-and-spirits-delivery": [
    // LCBO pickup: a van outside a store
    svg(ground() + shed(190, 140, 80, { sign: true, acc: false }) + R(212, 62, 26, 22, 1, "kd") + R(282, 62, 26, 22, 1, "kd") + van(60) + C(318, 46, 1.6, "af"), "A van collecting from the store"),
    // packaging: bottles standing in a divided case
    svg(ground() + [0, 1, 2, 3].map((i) => P(`M${126 + i * 28} 66V44c0 -6 4 -8 4 -14v-8h8v8c0 6 4 8 4 14v22`, i === 1 ? "a" : "l")).join("") + carton(112, 66, 128, 46, { tape: false }) + [144, 176, 208].map((x) => L(x, 66, x, 112, "d")).join(""), "Bottles packed in a divided case"),
    // route: a van on the road following a route line
    svg(ground() + van(40) + P("M160 104c40 0 40 -44 80 -44s30 -18 50 -18", "a") + pin(298, 46) + motion(34, 74), "A van on an optimized route"),
    // photo: a phone taking a photo of the parcel at the door
    svg(ground() + P("M60 112V34h86v78", "k") + R(84, 60, 36, 52, 1, "kd") + carton(150, 84, 34, 28) + phone(236, 24, R(242, 36, 34, 40, 3, "kd") + C(259, 56, 8, "a") + C(259, 98, 4)), "A photo of the parcel at the door"),
    // signature: a tablet with a signed line
    svg(ground() + R(116, 24, 128, 86, 8) + R(126, 34, 108, 64, 3, "kd") + P("M138 76c8 -16 14 -16 14 -4s6 4 12 -6s6 8 14 4s10 -8 14 -2", "a") + L(138, 86, 222, 86, "d") + P("M262 30l-26 44l-4 10l8 -6l26 -44Z", "k"), "A customer signing on a tablet"),
  ],
  "logistics-management-system": [
    // integration: three store tiles feeding one hub
    svg(ground() + [60, 150, 240].map((x, i) => R(x, 20, 60, 34, 6) + P(`M${x + 16} 32h28M${x + 16} 42h18`, "d") + P(`M${x + 30} 54V72H180`, i === 1 ? "a" : "d")).join("") + R(150, 72, 60, 34, 6) + C(180, 89, 7, "af"), "Stores syncing into one system"),
    // inventory: live stock bars, one moving
    svg(ground() + [70, 120, 170, 220, 270].map((x, i) => { const h = [44, 66, 34, 76, 54][i]; return R(x, G - h, 30, h, 3, i === 3 ? "a" : "k"); }).join("") + P("M64 30h40M64 40h24", "d"), "Live stock levels"),
    // warehouse: a floor plan with one bay lit
    svg(ground() + R(70, 18, 220, 92, 4) + [0, 1, 2, 3].map((i) => L(96 + i * 56, 32, 96 + i * 56, 96, "d")).join("") + [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => R(84 + c * 56, 30 + r * 24, 24, 14, 2, r === 1 && c === 2 ? "a" : "kd")).join("")).join(""), "A warehouse floor plan"),
    // fleet: a truck with a location pin above it
    svg(ground() + truck(70, { len: 140 }) + pin(150, 34) + P("M118 22h-24M186 22h24", "d"), "A truck located on the map"),
    // BOL: a document with a check mark
    svg(ground() + R(130, 14, 90, 98, 4) + P("M144 32h48M144 44h62M144 56h56M144 68h40", "d") + C(198, 92, 13, "k") + check(198, 92) + P("M100 60h18M242 60h18", "d"), "A digital bill of lading"),
  ],
};

// node tools/proc-art.mjs -> tools/out/proc-art.json (read by tools/make-services.py)
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
  writeFileSync(new URL("./out/proc-art.json", import.meta.url), JSON.stringify(ART));
  console.log("wrote proc-art.json", Object.values(ART).flat().length, "drawings");
}
