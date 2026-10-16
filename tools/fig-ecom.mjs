// E-commerce fulfillment · Fig 1, drawn like the home page: a side-on cutaway of the fulfillment floor.
// One order, five stops: ORDER (the screen lights, a slip prints) · PICK (a robot lifts the tote off the rack)
// · PACK (the item drops into a box, the flaps close, tape runs over) · LABEL (the printer stamps a label)
// · SHIP (the parcel slides down the chute into the ShipNoble van, which drives off).
// Moving parts are groups the page drives (assets/fig-scenes.js, "ecom"); every state is a function of scroll.
// node tools/fig-ecom.mjs → assets/fig-ecom.svg + .json
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./fig-lib.mjs";
import { helpers, lockup } from "./fig-story.mjs";
import { nightKit } from "./night.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
const W = 1200, H = 520;
const P = k.fitProjection([[-6, 0, -8], [292, 0, -8], [-6, 0, 50], [292, 0, 50]], W, H, { pad: 12, azimuth: 90, elevation: 7 });
const h = helpers(P);
const { at, box, L, D, seg, poly, sideM, discY, cylZ } = h;
const HI = { tone: "hi", crease: "lo" }, MID = { tone: "mid" }, LO = { tone: "lo" };
const WHITE = { tone: "hi", crease: "lo", className: "st-white" };
const o = at([0, 0, 0]);
const N = nightKit(h, "ec");
const g = (attrs, inner) => `<g ${attrs}>${inner}</g>`;
const face = (x0, x1, y, z0, z1, cls) => `<path class="${cls}" d="${poly([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]])}"/>`;

/* ---------- dimensions (dm) ---------- */
const BELT = { x0: 80, x1: 198, z: 9 };              // belt top
const RACK = { x0: 22, x1: 56, y0: -26, y1: -14 };
const TOTE = { l: 8, w: 6, h: 4 }, ITEM = { l: 3.4, w: 3, h: 4.6 }, BOX = { l: 7, w: 6, h: 5 };
const PICK_X = 39, PICK_Z = 18, HOME_X = 70, HANDOFF_X = 76;
const PACK_X = 92, LABEL_X = 150, CHUTE = { x0: 198, x1: 216, z0: 9, z1: 6.6 };
const VAN = { x0: 212, x1: 270, floor: 6.6, ground: -6 };
const WALL = { x0: 204, x1: 207 };

/* ---------- the building: back wall, floor, roof (poché at the cut) ---------- */
const back = [];
back.push(`<path class="st-paper-fill" d="${poly([[-170, -32, 0], [WALL.x0, -32, 0], [WALL.x0, -32, 46], [-170, -32, 46]])}"/>`);
const seams = []; for (let x = -160; x < WALL.x0; x += 16) seams.push(seg([x, -32, 0], [x, -32, 44]));
back.push(L(seams.join(""), { tone: "faint" }));
back.push(box(-170, WALL.x1, -32, 14, -0.3, 0, { tone: "hi", crease: "none", className: "st-wall" }, 0.05));   // the floor surface
// the order screen on the wall, the order desk with its printer
back.push(box(2, 20, -31.6, -30.8, 22, 33, { tone: "mid", crease: "lo" }, 0.3) + face(3, 19, -30.75, 23, 32, "ec-screen"));
const ui = [];
ui.push(face(4, 18, -30.7, 30, 31.3, "ec-ui-bar"));
for (const [z, w] of [[28, 11], [26.4, 8], [24.8, 9.5]]) ui.push(face(4.2, 4.2 + w, -30.7, z, z + 0.7, "ec-ui-line"));
back.push(g('class="ec-ui"', ui.join("")) + g('data-screen-glow class="ec-glow" style="opacity:0"', face(3, 19, -30.7, 23, 32, "ec-glow-fill")) + `<circle data-screen-dot class="ec-dot" cx="${at([17, -30.7, 25.1])[0].toFixed(1)}" cy="${at([17, -30.7, 25.1])[1].toFixed(1)}" r="${(h.cam.k * 0.6).toFixed(2)}" style="opacity:0"/>`);
back.push(box(10.6, 11.4, -31, -30, 0, 22, MID, 0.1));
const desk = [box(0, 1, -16, -15, 0, 8.4, MID, 0.1), box(19, 20, -16, -15, 0, 8.4, MID, 0.1), box(0, 20, -17, -9, 8.4, 9.4, HI, 0.3)];
const slip = g('data-slip', box(8.5, 14.2, -13.4, -10.6, 12.2, 12.5, WHITE, 0.05) + L(seg([9.6, -10.6, 12.5], [13.4, -10.6, 12.5]), { tone: "lo" }));
const printer = box(6, 14.4, -15, -10, 9.4, 13.6, WHITE, 0.6, 2, 0.3) + box(7, 13.4, -10.05, -9.95, 11.9, 12.8, { tone: "lo", crease: "none" }, 0.05);

/* ---------- the rack, with totes ---------- */
const rack = [];
for (const x of [RACK.x0, (RACK.x0 + RACK.x1) / 2, RACK.x1 - 1]) rack.push(box(x, x + 1, RACK.y0, RACK.y1, 0, 36, MID, 0.1));
for (const z of [9, 18, 27]) rack.push(box(RACK.x0, RACK.x1, RACK.y0, RACK.y1, z - 0.8, z, HI, 0.1));
const tote = (cx, z, cls = "") => box(cx - TOTE.l / 2, cx + TOTE.l / 2, -23, -17, z, z + TOTE.h, { tone: "hi", crease: "lo", className: "ec-tote " + cls }, 0.5, 2, 0.3)
  + L(seg([cx - TOTE.l / 2 + 0.6, -17, z + TOTE.h - 0.8], [cx + TOTE.l / 2 - 0.6, -17, z + TOTE.h - 0.8]), { tone: "faint" })
  + box(cx - 1.4, cx + 1.4, -17.04, -16.96, z + TOTE.h - 1.9, z + TOTE.h - 1.2, { tone: "lo", crease: "none" }, 0.3);
for (const [x, z] of [[28, 9], [48, 9], [28, 18], [48, 27], [28, 27], [39, 27]]) rack.push(tote(x, z));
rack.push(tote(39, 0.2));

/* ---------- the picker robot (local: centre at x 0, on the floor; the lift and tote are driven by the page) ---------- */
const robotBase = [
  discY(-3.4, -11.6, -10.6, 1.4, 1.4, LO), discY(3.4, -11.6, -10.6, 1.4, 1.4, LO),
  box(-5, 5, -11, -5, 1.4, 5.6, { tone: "hi", crease: "lo", className: "st-white" }, 1, 3, 0.4),
  box(-4, -2.6, -10.2, -5.8, 5.6, 28, MID, 0.2), box(-4, -2.6, -10.2, -5.8, 27, 28.4, MID, 0.2),
  box(1.6, 4, -5.04, -4.96, 3, 4.2, { tone: "lo", crease: "none", className: "ec-led" }, 0.2),
  discY(-3.4, -5.4, -4.6, 1.4, 1.4, LO), discY(3.4, -5.4, -4.6, 1.4, 1.4, LO),
].join("");
const robotLift = box(-3.6, 4.6, -10.4, -5.6, 0, 0.8, HI, 0.3) + box(-3.6, -2.4, -10.4, -5.6, 0.8, 2.2, MID, 0.1);   // at z = 0, raised by the page

/* ---------- the belt, the label printer, the chute ---------- */
const belt = [];
for (let x = BELT.x0 + 4; x < BELT.x1; x += 22) belt.push(box(x, x + 1.2, -3, -2, 0, BELT.z - 1.2, MID, 0.1));
belt.push(box(BELT.x0, BELT.x1, -4, 4, BELT.z - 1.6, BELT.z - 0.4, HI, 0.4));
belt.push(box(BELT.x0 + 1, BELT.x1 - 1, -3.4, 3.4, BELT.z - 0.4, BELT.z, { tone: "hi", crease: "none", className: "fp-road" }, 0.2));
const rollerSegs = []; for (let x = BELT.x0 + 2; x < BELT.x1 - 1; x += 2.4) rollerSegs.push(seg([x, 3.4, BELT.z - 0.2], [x, 3.4, BELT.z - 1.4]));
const beltRoll = `<path class="ec-roll" data-belt-roll d="${poly([[BELT.x0 + 1, 4.05, BELT.z - 0.9], [BELT.x1 - 1, 4.05, BELT.z - 0.9]], false)}"/>`;
const gantryBack = box(LABEL_X - 5, LABEL_X - 3.8, -6, -5, BELT.z, 26, MID, 0.1) + box(LABEL_X + 3.8, LABEL_X + 5, -6, -5, BELT.z, 26, MID, 0.1) + box(LABEL_X - 5, LABEL_X + 5, -6, 6, 25, 26.4, HI, 0.2);
const head = box(LABEL_X - 3.2, LABEL_X + 3.2, -3.2, 3.2, 0, 4.2, WHITE, 0.6, 2, 0.3) + box(LABEL_X - 2.2, LABEL_X + 2.2, -2.2, 2.2, -0.5, 0, { tone: "lo", crease: "none" }, 0.2)
  + box(LABEL_X - 0.4, LABEL_X + 0.4, -0.4, 0.4, 4.2, 9, MID, 0.1);                                                  // at z = 0, lowered by the page
const gantryFront = box(LABEL_X - 5, LABEL_X - 3.8, 5, 6, BELT.z, 26, MID, 0.1) + box(LABEL_X + 3.8, LABEL_X + 5, 5, 6, BELT.z, 26, MID, 0.1);
const chute = [h.prism([[CHUTE.x0, CHUTE.z0 - 1.2], [CHUTE.x1, CHUTE.z1 - 1.2], [CHUTE.x1, CHUTE.z1 - 0.2], [CHUTE.x0, CHUTE.z0 - 0.2]], -3.6, 3.6, { tone: "hi", crease: "lo" })];
for (const x of [CHUTE.x0 + 3, CHUTE.x1 - 3]) chute.push(box(x, x + 1, -3, -2, 0, CHUTE.z0 - 1.4 - (x - CHUTE.x0) * (CHUTE.z0 - CHUTE.z1) / (CHUTE.x1 - CHUTE.x0), MID, 0.1));

/* ---------- the parcel: the item, the box with its flaps, tape and label (local: box centre at x 0, on z 0) ---------- */
const item = box(-ITEM.l / 2, ITEM.l / 2, -ITEM.w / 2, ITEM.w / 2, 0, ITEM.h, { tone: "hi", crease: "lo", lit: true, className: "ec-item" }, 0.3, 2, 0.2);
const bx = BOX.l / 2, by = BOX.w / 2;
const boxBody = box(-bx, bx, -by, by, 0, BOX.h, { tone: "hi", crease: "lo", lit: true, className: "ec-box" }, 0.3, 2, 0.2);
const flap = (sx) => box(-0.15, 0.15, -by + 0.2, by - 0.2, 0, bx - 0.2, { tone: "hi", crease: "lo", lit: true, className: "ec-box" }, 0.05);
const [hlx, hly] = at([-bx, by, BOX.h]), [hrx, hry] = at([bx, by, BOX.h]);
const flaps = g(`data-flap="l" data-c="${o[0].toFixed(2)} ${o[1].toFixed(2)}" transform="translate(${(-bx * h.cam.k).toFixed(2)} ${(-BOX.h * h.cam.k * h.cam.cosE).toFixed(2)})"`, flap())
  + g(`data-flap="r" data-c="${o[0].toFixed(2)} ${o[1].toFixed(2)}" transform="translate(${(bx * h.cam.k).toFixed(2)} ${(-BOX.h * h.cam.k * h.cam.cosE).toFixed(2)})"`, flap());
const tape = `<path class="ec-tape" data-tape d="${poly([[-bx - 0.2, by + 0.02, BOX.h - 1.4], [-bx - 0.2, by + 0.02, BOX.h + 0.02], [bx + 0.2, by + 0.02, BOX.h + 0.02], [bx + 0.2, by + 0.02, BOX.h - 1.4]], false)}"/>`;
const label = g('data-label style="opacity:0"', `<path class="ec-label" d="${poly([[-2.6, by + 0.06, 1], [2.6, by + 0.06, 1], [2.6, by + 0.06, 3.6], [-2.6, by + 0.06, 3.6]])}"/>`
  + `<path class="ec-label-stripe" d="${poly([[-2.6, by + 0.08, 3], [2.6, by + 0.08, 3], [2.6, by + 0.08, 3.6], [-2.6, by + 0.08, 3.6]])}"/>`
  + L([-2, -1.4, -1, -0.2, 0.4, 0.8, 1.4, 2].map((x) => seg([x, by + 0.08, 1.3], [x, by + 0.08, 2.5])).join(""), { tone: "hi" }));
const parcel = boxBody + tape + label;

/* ---------- the van: cargo body, cab, wheels; the parcel goes in at the open rear ---------- */
const van = [];
const VB = { x0: VAN.x0, x1: 252 };
van.push(discY(220, -9.6, -6.8, VAN.ground + 3.6, 3.6, LO), discY(260, -9.6, -6.8, VAN.ground + 3.6, 3.6, LO));
van.push(box(VB.x0, 266, -9.6, 9.6, VAN.ground + 4, VAN.floor, MID, 0.4));
van.push(box(VB.x0, VB.x1, -9.6, 9.6, VAN.floor, 30, WHITE, 0.8, 2, 0.5));
van.push(h.prism([[VB.x1, VAN.ground + 4], [270, VAN.ground + 4], [270, 13], [268.4, 20], [262, 25.4], [VB.x1, 25.4]], -9.4, 9.4, WHITE));
van.push(`<path class="st-glass-fill" d="${poly([[256, 9.45, 15], [267, 9.45, 15], [265.6, 9.45, 20], [261.6, 9.45, 23.6], [256, 9.45, 23.6]])}"/>`);
van.push(L(poly([[254.5, 9.45, 4.6], [268.6, 9.45, 4.6], [268.6, 9.45, 13], [267.2, 9.45, 19.6], [261.6, 9.45, 24.6], [254.5, 9.45, 24.6]]), { tone: "lo" }));
van.push(`<path class="st-stripe" d="${poly([[VB.x0 + 1, 9.65, 9], [VB.x1 - 1, 9.65, 9], [VB.x1 - 1, 9.65, 10.4], [VB.x0 + 1, 9.65, 10.4]])}"/>`);
van.push(`<g transform="${sideM((VB.x0 + VB.x1) / 2, 9.66, 19.5)}">${lockup(2.3)}</g>`);
van.push(box(266.4, 270.4, 6, 9.4, 6.4, 8.4, { tone: "hi", crease: "lo", className: "st-lamp" }, 0.4) + box(VB.x0 - 0.6, VB.x0 + 0.4, 6.4, 9.6, 8, 11, LO, 0.2));
const spin = (x) => { const c = at([x, 9.6, VAN.ground + 3.6]); const F = (r) => `<circle class="ec-hub" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="${(h.cam.k * r).toFixed(2)}"/>`;
  const bolts = [0, 1, 2, 3, 4].map((n) => { const a = n / 5 * Math.PI * 2; return `<circle class="ec-bolt" cx="${(c[0] + Math.cos(a) * h.cam.k * 0.9).toFixed(1)}" cy="${(c[1] + Math.sin(a) * h.cam.k * 0.9).toFixed(1)}" r="${(h.cam.k * 0.22).toFixed(2)}"/>`; }).join("");
  return discY(x, 6.8, 9.6, VAN.ground + 3.6, 3.6, LO) + `<g data-spin data-c="${c[0].toFixed(2)} ${c[1].toFixed(2)}">${F(1.9)}${bolts}</g>`; };
const vanNear = spin(220) + spin(260);

/* ---------- the cut: floor slab and dock edge, the roof, the wall over the door ---------- */
const CUTY = 14;
const cut = (x0, x1, z0, z1) => `<g class="st-cut"><path class="st-face" d="${poly([[x0, CUTY, z0], [x1, CUTY, z0], [x1, CUTY, z1], [x0, CUTY, z1]])}"/></g>`;
const poche = cut(-170, WALL.x1, -2.4, 0);
const earth = `<path class="ec-earth" d="${poly([[-170, CUTY, VAN.ground], [WALL.x1, CUTY, VAN.ground], [WALL.x1, CUTY, -2.4], [-170, CUTY, -2.4]])}"/>`;
const ground = box(WALL.x1, 420, -14, CUTY, VAN.ground - 1.2, VAN.ground, { tone: "hi", crease: "none", className: "st-yard" }, 0.1);

const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- the detail pass: the real parts that hold the parts ---------- */
// the wall: a kick plate, a band of high windows, floor joints
back.push(box(-170, WALL.x0, -31.9, -31.4, 0, 1.4, MID, 0.1));
for (let x = -160; x < WALL.x0 - 20; x += 26) back.push(box(x, x + 20, -31.95, -31.6, 36, 40.4, { tone: "mid", crease: "lo", className: "st-glass" }, 0.2) + L(seg([x + 10, -31.58, 36], [x + 10, -31.58, 40.4]), { tone: "lo" }));
const joints = []; for (let x = -160; x < WALL.x0; x += 24) joints.push(seg([x, -32, 0], [x, 14, 0]));
back.push(L(joints.join(""), { tone: "faint" }));
// the screen: a bracket on the wall, a foot plate under the pole
back.push(box(9.8, 12.2, -31.2, -30.8, 20.6, 22.4, MID, 0.1) + box(7.6, 14.4, -32, -29, 0, 0.5, MID, 0.4));
// the desk: a drawer pedestal with handles, the printer's tray slot and status lamp
desk.push(box(12.6, 18.6, -16.6, -10, 0.6, 8.4, { tone: "hi", crease: "lo", className: "st-white", inner: L([3.2, 5.8].map((z) => seg([12.6, -10, z], [18.6, -10, z])).join(""), { tone: "lo" }) }, 0.3));
for (const z of [2, 4.6, 7.2]) desk.push(box(14.6, 16.6, -10.05, -9.9, z, z + 0.4, MID, 0.1));
// the rack: base plates, perforated uprights, beam clips
for (const x of [RACK.x0, (RACK.x0 + RACK.x1) / 2, RACK.x1 - 1]) {
  rack.push(box(x - 0.6, x + 1.6, RACK.y0 - 1, RACK.y1 + 1, 0, 0.4, MID, 0.2));
  const holes = []; for (let z = 1.6; z < 35; z += 1.8) holes.push(at([x + 0.5, RACK.y1 + 0.02, z]));
  rack.push(D(holes, { size: 0.32, tone: "lo" }));
  for (const z of [9, 18, 27]) rack.push(box(x + (x === RACK.x0 ? 1 : -1), x + (x === RACK.x0 ? 2 : 0), RACK.y1, RACK.y1 + 0.1, z - 0.9, z + 0.1, LO, 0.05));
}
// the belt: a side guard, roller ends along the frame, leg feet, the drive motor, a photo-eye at the label station
belt.push(box(BELT.x0, BELT.x1, 3.4, 4, BELT.z - 1.6, BELT.z + 0.9, HI, 0.2));
const ends = []; for (let x = BELT.x0 + 2; x < BELT.x1 - 1; x += 2.4) ends.push(at([x, 4.02, BELT.z - 0.4]));
belt.push(D(ends, { size: 0.34, tone: "lo" }));
for (let x = BELT.x0 + 4; x < BELT.x1; x += 22) belt.push(box(x - 0.6, x + 1.8, -3.8, -1.2, 0, 0.4, MID, 0.2));
belt.push(box(117, 127, -2.8, 2.8, 2, 6.6, { tone: "hi", crease: "lo", className: "st-white" }, 0.6, 2, 0.3) + discY(122, 2.8, 3.6, 4.3, 1.7, MID) + L(seg([118.4, 2.82, 3.4], [125.6, 2.82, 3.4]) + seg([118.4, 2.82, 5.2], [125.6, 2.82, 5.2]), { tone: "faint" }));
for (const y of [-4.6, 4.2]) belt.push(box(LABEL_X - 9.4, LABEL_X - 8.6, y, y + 0.6, BELT.z + 0.9, BELT.z + 3.6, MID, 0.1) + box(LABEL_X - 9.6, LABEL_X - 8.4, y - 0.1, y + 0.7, BELT.z + 3.6, BELT.z + 4.4, LO, 0.2));
// the label printer: post feet and a beacon on the beam
const gantryTop = box(LABEL_X - 5.6, LABEL_X - 3.2, -6.6, -4.4, BELT.z, BELT.z + 0.4, MID, 0.2) + cylZ(LABEL_X, 0, 26.4, 27.8, 0.9, HI, 18) + cylZ(LABEL_X, 0, 27.8, 28.4, 0.6, MID, 14);
// the chute: its rollers
const croll = []; for (let t = 0.1; t < 1; t += 0.14) croll.push(at([lerp(CHUTE.x0, CHUTE.x1, t), 3.62, lerp(CHUTE.z0, CHUTE.z1, t) - 0.7]));
chute.push(D(croll, { size: 0.36, tone: "lo" }));
// the van: wheel arches, bumper, step, door handle, mirror, rear door seam, roof line, marker lamps
const arch = (x) => { const pts = []; for (let a = 0; a <= 180; a += 12) { const r = (a * Math.PI) / 180; pts.push([x + Math.cos(r) * 4.6, 9.62, VAN.ground + 3.6 + Math.sin(r) * 4.6]); } return `<path class="ec-arch" d="${poly(pts, false)}"/>`; };
van.push(arch(220) + arch(260));
van.push(box(266.6, 271.2, -9.2, 9.2, VAN.ground + 2.8, VAN.ground + 5.4, MID, 0.6) + box(254.6, 261.8, 8.4, 9.9, VAN.ground + 4.8, VAN.ground + 5.6, MID, 0.2));
van.push(box(256.4, 258.4, 9.45, 9.75, 13.4, 14.1, MID, 0.2) + box(267, 268.4, 9.2, 10.6, 21.4, 22, MID, 0.1) + box(268.2, 270.2, 10.4, 12, 18.2, 22.6, HI, 0.5));
van.push(L(seg([VB.x0 + 1.2, 9.65, VAN.floor + 0.6], [VB.x0 + 1.2, 9.65, 29.2]) + seg([VB.x0 + 1, 9.65, 28.6], [VB.x1 - 0.6, 9.65, 28.6]), { tone: "faint" }));
for (const x of [VB.x0 + 2, 238, VB.x1 - 2]) van.push(box(x - 0.7, x + 0.7, 9.6, 9.9, 6.8, 7.6, LO, 0.2));
// the robot: a bumper band, a status screen, the lidar puck on its mast
const robotExtra = box(-5.3, 5.3, -11.3, -4.7, 1.6, 2.6, LO, 0.4) + box(-1.2, 1.4, -4.72, -4.66, 3.6, 4.9, { tone: "lo", crease: "none", className: "ec-screen" }, 0.1)
  + cylZ(-3.3, -8, 28.4, 29.6, 0.95, MID, 16) + cylZ(-3.3, -8, 29.6, 30.1, 1.05, HI, 16);

/* ---------- assemble, back to front ---------- */
const P0 = (x, z) => { const q = at([x, 0, z]); return `translate(${(q[0] - o[0]).toFixed(2)} ${(q[1] - o[1]).toFixed(2)})`; };
// at night: lamps over the floor with pools beneath, the order screen glows, the van drives out on its headlights
const nightFloor = [-120, -50, 30, 100, 170].map((x) => N.pool([x, -8, 0.1], 22, 14, "pool", [x, -8, 40.4]) + L(seg([x, -10, 46], [x, -10, 41.8]), { tone: "lo" }) + box(x - 1.8, x + 1.8, -12, -8, 40.6, 41.8, HI, 0.6) + N.lamp([x, -8, 40.4], 3.8)).join("") + N.glow([11, -30, 27.5], 15, 10, "cool");
const body = [
  N.defs,
  `<g data-fit>`,
  ground, back.join(""), nightFloor, g('class="ec-desk"', desk.join("") + slip + printer), rack.join(""),
  g(`data-robot transform="${P0(HOME_X, 0)}"`, robotBase + robotExtra + g('data-lift', robotLift)),
  g(`data-tote`, tote(0, 0, "is-target")),
  g(`data-item`, item),
  belt.join("") + L(rollerSegs.join(""), { tone: "faint" }) + beltRoll, gantryBack + gantryTop,
  g(`data-parcel transform="${P0(PACK_X, BELT.z)}" style="opacity:0"`, parcel + flaps),
  g(`data-head transform="${P0(0, 19)}"`, head), gantryFront, chute.join(""),
  g('data-van', van.join("") + vanNear + N.headlights(VAN.x1 + 0.8, 7.6, 7.4, { ground: VAN.ground + 0.3 }) + N.tail([VB.x0 - 0.4, 9.6, 9.5], 1.6)),
  earth, poche,
  `</g>`,
];
const svg = k.figureSvg({ width: W, height: H, className: "iso-svg fp-svg st-svg ec-svg", label: "A fulfillment floor cut open from the side. An order shows on the screen and prints, a robot lifts the tote off the rack, the item is packed into a box, labelled under the printer, and slid down the chute into a ShipNoble van that drives off.", body });
// the item rides at the tote's depth; the parcel at the belt's: the page moves both in world (x, z)
const data = {
  scene: "ecom", xs: [0, 1, 2, 3, 4], o: o.map((v) => +v.toFixed(2)), locs: ["ORDER", "PICK", "PACK", "LABEL", "SHIP"], ax: [0, 0], vb: [W, H],
  kx: +h.cam.k.toFixed(5), kz: +(-h.cam.k * h.cam.cosE).toFixed(5), ky: +(h.cam.k * h.cam.sinE).toFixed(5),
  PICK_X, PICK_Z, HOME_X, HANDOFF_X, PACK_X, LABEL_X, BELT_Z: BELT.z, CHUTE, VAN, BOX, TOTE, ITEM,
};
writeFileSync(join(OUT, "fig-ecom.svg"), svg);
writeFileSync(join(OUT, "fig-ecom.json"), JSON.stringify(data));
writeFileSync(join(HERE, "out", "fig-ecom.html"), k.pageHtml({ title: "ecom", theme: "light", body: `<link rel="stylesheet" href="../../assets/story.css"><link rel="stylesheet" href="../../assets/fx.css"><div class="iso-stage">${svg.replaceAll('href="assets/', 'href="../../assets/')}</div>`, width: 1200 }));
console.log("wrote fig-ecom", (svg.length / 1024).toFixed(0) + " KB");
