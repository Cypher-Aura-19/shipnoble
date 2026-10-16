// B2B transportation · Fig 1, drawn like the home page: a long side view of one shipment between two businesses.
// PICKUP (the trailer's curtain slides open, the tail lift lowers, a pallet jack rolls the shipment aboard into the last
// free slot) · SCAN (the label is scanned, the curtain closes, a seal clips on, the GPS unit starts pulsing) · ROUTE
// (the truck drives down the road, its route drawing ahead) · TRACK (the customer's tracking card pins up: the truck's
// dot moves along the route with a live ETA) · DROP (at the customer's door the shipment comes off by tail lift, and
// the card turns to Delivered). The truck only ever drives forward. The page drives the parts (assets/fig-scenes.js, "b2b").
// node tools/fig-b2b.mjs → assets/fig-b2b.svg + .json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./fig-lib.mjs";
import { helpers, truckParts, T as TR } from "./fig-story.mjs";
import { nightKit } from "./night.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
const W = 1200, H = 520;
const P = k.fitProjection([[-100, 0, -4], [260, 0, -4], [-100, 0, 70], [260, 0, 70]], W, H, { pad: 12, azimuth: 90, elevation: 10 });
const h = helpers(P);
const { at, box, L, D, seg, poly, sideM, discY, cylZ } = h;
const HI = { tone: "hi", crease: "lo" }, MID = { tone: "mid" }, LO = { tone: "lo" };
const WHITE = { tone: "hi", crease: "lo", className: "st-white" };
const o = at([0, 0, 0]);
const N = nightKit(h, "b2");
const g = (attrs, inner) => `<g ${attrs}>${inner}</g>`;
const face = (x0, x1, y, z0, z1, cls) => `<path class="${cls}" d="${poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])}"/>`;

/* ---------- dimensions (dm) ---------- */
const FL = TR.FL, TW = TR.TW;                                   // trailer deck height and half width; rear at x = 0
const SLOTS = [122, 108, 94, 80, 66, 52];                        // other customers' freight, front first
const OUR = 38;                                                 // the shipment's slot, the last one free
const PAL = { l: 12, w: 10, base: 1.4, load: 11 };
const LIFT = { x0: -21, x1: -0.4 };                              // the tail lift platform
const DOOR = -14;                                               // pallet centre in front of a door, relative to the trailer's rear
const STREET = { curb: -16, walk: -22, road1: 19 };
const DROP_DX = 820;                                            // how far the truck drives to the customer
const CUST = DROP_DX;                                           // the customer's door sits where the trailer's rear stops

/* ---------- the street: road, kerb, sidewalk, lamp posts, two businesses with their doors, trees behind ---------- */
const st = [];
st.push(box(-260, 1300, -120, 60, -0.6, 0, { tone: "hi", crease: "none", className: "st-yard" }, 0.1));
st.push(box(-260, 1300, STREET.curb, STREET.road1, 0, 0.2, { tone: "hi", crease: "none", className: "st-road" }, 0.05));
for (let x = -250; x < 1300; x += 16) st.push(box(x, x + 8, 17, 17.6, 0.2, 0.32, { tone: "hi", crease: "none", className: "st-mark" }, 0.05));
st.push(box(-260, 1300, STREET.walk, STREET.curb, 0, 0.8, { tone: "hi", crease: "lo", className: "st-walk" }, 0.2));
const lobed = (cx, cy, R, n, amp, ph) => Array.from({ length: n * 6 }, (_, i) => { const a = (i / (n * 6)) * Math.PI * 2, rr = R * (1 - amp + amp * Math.abs(Math.cos((a * n) / 2 + ph))); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
const pth = (pts) => "M" + pts.map((q) => q.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
const tree = (x, y, s = 1) => { const [cx, cy] = at([x, y, 24 * s]), R = 8 * s * h.cam.k, ph = (x * 0.3) % 3; return cylZ(x, y, 0, 18 * s, 0.7, MID, 12) + `<g class="st-tree"><path class="st-crown" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/><path class="st-crown-lit" d="${pth(lobed(cx - R * 0.15, cy - R * 0.15, R * 0.72, 7, 0.15, ph + 1))}"/><path class="iso-line" data-tone="lo" d="${pth(lobed(cx, cy, R, 8, 0.13, ph))}"/></g>`; };
const lamp = (x) => N.pool([x, -6, 0.3], 24, 18, "pool", [x, -9.2, 50.2]) + cylZ(x, -19.4, 0.8, 52, 0.55, MID, 12) + box(x - 0.5, x + 0.5, -19.8, -9, 51.4, 52.4, MID, 0.2) + box(x - 1.6, x + 1.6, -11, -7.4, 50.4, 52, HI, 0.5) + cylZ(x, -19.4, 0.8, 2.2, 1.2, MID, 12) + N.lamp([x, -9.2, 50.2], 3.6);
// a business: a white block behind the sidewalk with a loading door, windows, a parapet and a plain sign
const business = (x0, x1, doorX, hgt) => {
  const y0 = -60, y1 = STREET.walk - 0.4;
  let s = box(x0, x1, y0, y1, 0, hgt, WHITE, 0.4, 2, 0.3) + box(x0 - 0.6, x1 + 0.6, y0 - 0.6, y1 + 0.6, hgt, hgt + 1.6, HI, 0.3);
  s += N.glow([doorX, y1 + 0.2, 10], 14, 13, "warm");
  s += face(doorX - 8, doorX + 8, y1 + 0.03, 0, 24, "b2-door-open") + box(doorX - 9.2, doorX + 9.2, y1, y1 + 0.8, 24, 26.4, { tone: "mid", className: "st-drum" }, 0.3);
  s += box(doorX - 9.2, doorX - 8, y1, y1 + 0.6, 0, 24, MID, 0.1) + box(doorX + 8, doorX + 9.2, y1, y1 + 0.6, 0, 24, MID, 0.1);
  for (let x = x0 + 5; x < x1 - 8; x += 13) if (Math.abs(x + 4 - doorX) > 15) { const dim = Math.round(x * 0.37) % 4 === 0; s += (dim ? "" : N.win(x, x + 8, y1, 12, 22)) + box(x, x + 8, y1 - 0.05, y1 + 0.08, 12, 22, { tone: "mid", crease: "none", className: "st-glass nt-win" + (dim ? " nt-dim" : "") }, 0.2) + L(seg([x + 4, y1 + 0.1, 12], [x + 4, y1 + 0.1, 22]), { tone: "lo" }); }
  s += box(doorX - 14, doorX + 14, y1, y1 + 0.6, hgt - 7, hgt - 2, WHITE, 0.2) + face(doorX - 12, doorX - 8, y1 + 0.62, hgt - 6, hgt - 3, "b2-sign-mark") + face(doorX - 6, doorX + 10, y1 + 0.62, hgt - 4.9, hgt - 4.1, "b2-sign-line");
  return s;
};
st.push(tree(-120, -70), tree(-30, -72, 1.1), tree(40, -70), tree(180, -70, 1.2), tree(330, -72), tree(460, -70, 1.1), tree(600, -71), tree(700, -70, 1.2), tree(900, -70), tree(1010, -72, 1.1));
st.push(business(-110, 24, DOOR, 34));
st.push(business(CUST - 64, CUST + 60, CUST + DOOR, 30));
for (let x = 70; x < 1260; x += 110) if (Math.abs(x - CUST) > 70) st.push(lamp(x));
// mile markers on the far sidewalk: a white post with an orange cap every 200 dm
for (let x = 160; x < 1240; x += 200) st.push(box(x - 0.6, x + 0.6, -18.8, -17.6, 0.8, 7, WHITE, 0.2) + box(x - 0.7, x + 0.7, -18.9, -17.5, 7, 8, { tone: "hi", crease: "lo", className: "b2-cap" }, 0.2));
// the route along the near side of the lane, drawn ahead of the truck by the page
const route = `<path class="ls-route" data-route d="${poly([[TR.LEN + 4, 15, 0.4], [DROP_DX + TR.LEN + 4, 15, 0.4]], false)}"/>`;

/* ---------- the truck: the home page's curtain-sider, split around its load ---------- */
const parts = truckParts(h, { side: true }).sort((a, b) => h.depth(a.c) - h.depth(b.c));
const isBack = (p) => p.tag === "far" || p.tag === "inside" || (p.tag === "" && p.c[1] < 6);
const truckBack = parts.filter(isBack).map((p) => p.svg).join("");
const truckFront = parts.filter((p) => !isBack(p)).map((p) => p.svg).join("").replace("<g data-curtain ", "<g data-curtain data-layer=\"2\" ").replace("<g data-bunch ", "<g data-bunch data-layer=\"2\" ");
const C = TR.CUR, cA = at([C.x0, C.y, C.z1 + 1]), cB = at([C.x1, C.y, C.z0 - 1]);
const defs = `<defs><clipPath id="st-curtain"><rect data-curtain-rect x="${cA[0].toFixed(1)}" y="${(cA[1] - 2).toFixed(1)}" width="${(cB[0] - cA[0]).toFixed(1)}" height="${(cB[1] - cA[1] + 4).toFixed(1)}"/></clipPath></defs>`;
// the tail lift: a platform hinged at the deck edge (folds up to close the rear), two arms under it
const liftArms = box(-1.4, 0, -10, -8.6, 2, FL - 0.6, MID, 0.2) + box(-1.4, 0, 8.6, 10, 2, FL - 0.6, MID, 0.2);
const [hx, hy] = at([LIFT.x1, 0, FL]);
const platform = g(`data-lift data-layer="24" data-c="${hx.toFixed(2)} ${hy.toFixed(2)}"`, box(LIFT.x0, LIFT.x1, -10.6, 10.6, FL - 0.8, FL, { tone: "hi", crease: "lo", className: "b2-lift" }, 0.3)
  + L(seg([LIFT.x0 + 1, 10.62, FL - 0.4], [LIFT.x1 - 1, 10.62, FL - 0.4]), { tone: "faint" }) + box(LIFT.x0, LIFT.x0 + 0.5, -10.6, 10.6, FL, FL + 0.6, { tone: "hi", crease: "lo", className: "b2-cap" }, 0.1));
// the GPS unit on the trailer roof, with rings the page pulses
const GPS = { x: 112, z: TR.ROOF + 1.5 };
const [gx, gy] = at([GPS.x, 0, GPS.z + 1.4]);
const gps = cylZ(GPS.x, 0, GPS.z, GPS.z + 0.8, 2, MID, 20) + cylZ(GPS.x, 0, GPS.z + 0.8, GPS.z + 1.6, 1.4, { tone: "hi", crease: "lo", className: "b2-gps" }, 20)
  + g('data-rings data-layer="34" style="opacity:0"', [0, 1, 2].map((i) => `<circle class="b2-ring" data-ring="${i}" cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="4"/>`).join(""));
// the seal on the rear post, clipped on after loading
const [sx, sy] = at([1.1, TW + 1, 22]);
const seal = g(`data-seal transform-origin="${sx.toFixed(1)} ${sy.toFixed(1)}" style="opacity:0"`, `<path class="b2-seal-loop" d="M${(sx - 3).toFixed(1)} ${(sy - 6).toFixed(1)} q3 -5 6 0"/><rect class="b2-seal" x="${(sx - 3.4).toFixed(1)} " y="${(sy - 6).toFixed(1)}" width="6.8" height="10" rx="1.6"/>`);

/* ---------- the loads: other freight in the trailer, the shipment, the pallet jack ---------- */
const palletBase = () => box(-PAL.l / 2, PAL.l / 2, -PAL.w / 2, PAL.w / 2, 0, 0.3, MID, 0.1)
  + [-PAL.l / 2 + 0.7, 0, PAL.l / 2 - 0.7].map((x) => box(x - 0.7, x + 0.7, -PAL.w / 2, PAL.w / 2, 0.3, 1.1, MID, 0.1)).join("")
  + box(-PAL.l / 2, PAL.l / 2, -PAL.w / 2, PAL.w / 2, 1.1, PAL.base, MID, 0.1);
const load = (lit, zt = PAL.load) => {
  const lx = PAL.l / 2 - 0.3, ly = PAL.w / 2 - 0.3, top = PAL.base + zt;
  const seams = [seg([-lx, ly + 0.02, PAL.base + zt / 2], [lx, ly + 0.02, PAL.base + zt / 2]), seg([0, ly + 0.02, PAL.base], [0, ly + 0.02, top])];
  return box(-lx, lx, -ly, ly, PAL.base, top, { tone: "hi", crease: "lo", lit, className: lit ? "rt-carton" : "st-carton", inner: L(seams.join(""), { tone: "faint" }) }, 0.2);
};
const placed = (svg, x, y, z) => { const q = at([x, y, z]); return `<g transform="translate(${(q[0] - o[0]).toFixed(2)} ${(q[1] - o[1]).toFixed(2)})">${svg}</g>`; };
const cargo = SLOTS.map((x, i) => placed(palletBase() + load(false, [11, 13, 9, 12, 10, 12][i]), x, -0.6, FL)).join("");
const ourLabel = face(1.4, 4.6, PAL.w / 2 + 0.05, 5.4, 9, "b2-label") + L([6.2, 7, 7.8].map((z) => seg([2, PAL.w / 2 + 0.08, z], [4, PAL.w / 2 + 0.08, z])).join(""), { tone: "lo" });
const ours = g('data-ours style="opacity:0"', palletBase() + load(true) + ourLabel);
const scan = `<path class="st-scan" data-scan d="${poly([[0.6, PAL.w / 2 + 0.2, 0], [5.4, PAL.w / 2 + 0.2, 0]], false)}" style="opacity:0"/>`;
// the pallet jack (fork heel at the origin, forks toward +x)
const jk = [];
jk.push(box(0.2, 11, -3.4, -2, 0.3, 1.1, MID, 0.1));
jk.push(box(-5, 0.2, -3.6, 3.6, 0.6, 8.4, WHITE, 0.8, 2, 0.3) + box(-4.6, -0.4, -3, 3, 8.4, 9.2, HI, 0.4));
jk.push(`<path class="st-stripe" d="${poly([[-4.6, 3.62, 4.2], [-0.2, 3.62, 4.2], [-0.2, 3.62, 5], [-4.6, 3.62, 5]])}"/>`);
jk.push(`<path class="b2-tiller" d="${poly([[-2.6, 0, 9.2], [-7.4, 0, 16.6]], false)}"/>` + box(-8.6, -6.6, -2.4, 2.4, 16.2, 17.4, MID, 0.4));
jk.push(discY(-2.6, 3.6, 4.4, 1.3, 1.3, LO) + discY(-2.6, 4.4, 4.6, 1.3, 0.6, MID));
jk.push(box(0.2, 11, 2, 3.4, 0.3, 1.1, MID, 0.1) + discY(9.8, 3.4, 3.8, 0.5, 0.5, LO));
const jack = g('data-jack style="opacity:0"', jk.join(""));

/* ---------- the tracking card: pinned to the view by the page (drawn in screen px) ---------- */
const card = g('data-card style="opacity:0"', g('data-card-in', `<rect class="ls-card" x="0" y="0" width="236" height="118" rx="12"/>
<circle class="ls-tag-dot" cx="18" cy="22" r="4"/><text class="b2-card-id" x="30" y="26">SN-24083</text>
<g data-chip><rect class="b2-chip" x="148" y="11" width="74" height="22" rx="11"/><text class="b2-chip-text" data-status x="185" y="26" text-anchor="middle">In transit</text></g>
<path class="b2-track" d="M22 62 H214"/><path class="b2-track-done" data-done d="M22 62 H214"/>
<circle class="b2-end" cx="22" cy="62" r="4"/><circle class="b2-end b2-end--to" cx="214" cy="62" r="5"/>
<g data-dot><circle class="b2-dot-glow" cx="22" cy="62" r="9"/><circle class="b2-dot" cx="22" cy="62" r="5"/></g>
<text class="b2-card-k" x="18" y="98">ETA</text><text class="b2-card-v" data-eta x="48" y="98">2:40 PM</text><text class="b2-card-k" x="148" y="98">On time</text>
<g data-check style="opacity:0"><circle class="ls-check-bg" cx="212" cy="96" r="10"/><path class="ls-check" d="M207 96 L211 100 L218 92"/></g>`));

/* ---------- assemble, back to front ---------- */
const body = [
  N.defs, defs,
  st.join(""), route,
  g('data-jack-far', ""),
  g('data-truck', `<g data-truck-back>${truckBack}</g>` + liftArms + platform + cargo),
  ours, scan, jack,
  g('data-truck-front', truckFront + gps + seal + N.headlights(TR.LEN + 0.6, TR.CW - 2, 8.9) + N.tail([0.3, TW + 0.2, 7.5], 1.8) + N.tail([0.3, TW + 0.2, 38.5], 1.1)),
  card,
];
const svg = k.figureSvg({ width: W, height: H, className: "iso-svg fp-svg st-svg ls-svg rt-svg wh-svg b2-svg", label: "A ShipNoble curtain-sided truck collects one pallet from a business by tail lift, is sealed and tracked, drives down the road while the customer follows it on a tracking card, and delivers the pallet to the customer's door.", body });
const data = {
  scene: "b2b", xs: [0, 1, 2, 3, 4], locs: ["PICKUP", "SCAN", "ROUTE", "TRACK", "DROP"], ax: [0, 0], vb: [W, H], o: o.map((v) => +v.toFixed(2)),
  kx: +h.cam.k.toFixed(5), kz: +(-h.cam.k * h.cam.cosE).toFixed(5), ky: +(h.cam.k * h.cam.sinE).toFixed(5),
  FL, TW, OUR, PAL, LIFT, DOOR, DROP_DX, LEN: TR.LEN, cur: C, wheels: TR.wheels, GPS,
};
writeFileSync(join(OUT, "fig-b2b.svg"), svg);
writeFileSync(join(OUT, "fig-b2b.json"), JSON.stringify(data));
writeFileSync(join(HERE, "out", "fig-b2b.html"), k.pageHtml({ title: "b2b", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><link rel="stylesheet" href="../../assets/fx.css"><div class="iso-stage">${svg.replaceAll('href="assets/', 'href="../../assets/')}</div>`, width: 1200 }));
console.log("wrote fig-b2b", (svg.length / 1024).toFixed(0) + " KB");
