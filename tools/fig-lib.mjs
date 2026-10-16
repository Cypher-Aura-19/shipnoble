// Shared scene helpers for the service figures (anatomy kit).
// Every figure follows one idea: a straight line along x, stations behind it,
// one lit mover (.fp-cart) built at x = 0 that the page slides between stops.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import os from "node:os";

const SKILL = join(os.homedir(), ".claude/skills/anatomy");
export const k = await import(pathToFileURL(join(SKILL, "kit/iso-kit.mjs")).href);
export const G = await import(pathToFileURL(join(SKILL, "kit/lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts/inline-kit.mjs")).href);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "assets");
mkdirSync(join(HERE, "out"), { recursive: true });

export function scene({ plate, fit = [], width = 820, height = 400, azimuth = 72, elevation = 30 }) {
  const PLATE_H = 10, FOOT_H = 5;
  const P = k.fitProjection([...k.boxCorners(plate, -PLATE_H - FOOT_H, 0), ...fit], width, height, { pad: 22, azimuth, elevation });
  const at = (p) => k.iso(p, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (pts, style) => k.dotsSvg(pts, style);
  const seg = (a, b) => k.segment(a, b, P);
  const depth = (x, y, z = 0) => k.depthOf([x, y, z], P);
  const byDepth = (pts) => [...pts].sort((a, b) => depth(a[0], a[1]) - depth(b[0], b[1]));
  const target = (loc, svg) => `<g data-target="${loc}">${svg}</g>`;
  const halo = (plan, z = 0, h = 2) => `<path class="iso-halo" d="${k.haloOf(plan, z, h, P)}"/>`;
  const slab = (plan, z, h, style = {}, steps = 2, bevel = 0) => S(k.slabOf({ r: 0.4, ...plan }, z, h, P, steps, bevel), style);
  const post = (x, y, z, h, s = 3, style = { tone: "mid", crease: "none" }) => slab({ x: x - s / 2, y: y - s / 2, w: s, d: s, r: 0.3 }, z, h, style);
  const cyl = (x, y, r, z, h, style = { tone: "mid" }, steps = 20) => S(k.cylinder(x, y, r, z, h, P, steps), style);

  function base() {
    // a clean white plate resting on a soft shadow (no feet, no screws): the stations stand on it
    const out = [halo(plate, -PLATE_H, PLATE_H)];
    out.push(S(k.slabOf(plate, -PLATE_H, PLATE_H, P, 8, 1.4), { tone: "mid", className: "fp-plate" }));
    out.push(L(k.planOutline(k.insetPlan(plate, 6), 0, P), { tone: "faint" }));
    return out.join("");
  }

  // a table on four legs with a lower shelf
  function table(plan, h = 28) {
    const out = [halo(plan)];
    for (const [x, y] of byDepth(k.corners(plan, 4))) out.push(post(x, y, 0, h - 3));
    out.push(slab(k.insetPlan(plan, 4), 9, 1.4, { tone: "lo" }));
    out.push(S(k.slabOf(plan, h - 3, 3, P, 3, 0.5), { tone: "mid" }));
    return out.join("");
  }

  // a box building: front face (y max) seams, roof outline
  function building(plan, h, { tone = "hi", seams = 12, skip = [], inner = "" } = {}) {
    const fy = plan.y + plan.d, fx = plan.x + plan.w, s = [];
    for (let x = plan.x + seams; x < fx - 4; x += seams) if (!skip.some(([a, b]) => x > a - 3 && x < b + 3)) s.push(seg([x, fy, 0], [x, fy, h]));
    return halo(plan) + S(k.slabOf(plan, 0, h, P, 3, 0.8), { tone, crease: "lo", inner: L(s.join(""), { tone: "faint" }) + inner })
      + L(k.planOutline(k.insetPlan(plan, 3), h, P, 3), { tone: "faint" });
  }

  // a flat panel standing on the front face of a building (door, window, sign)
  const facePanel = (x0, x1, y, z0, z1, style = { tone: "lo", crease: "none" }) => slab({ x: x0, y, w: x1 - x0, d: 0.8, r: 0.2 }, z0, z1 - z0, style);

  function write(name, { body, label, stops, theme = "light" }) {
    const svg = k.figureSvg({ width, height, className: "fp-svg", label, body });
    const o0 = at([0, 0, 0]), ux = at([1, 0, 0]);
    const data = { ax: [+(ux[0] - o0[0]).toFixed(5), +(ux[1] - o0[1]).toFixed(5)], xs: stops.map((s) => s.x), locs: stops.map((s) => s.loc) };
    writeFileSync(join(OUT, `fig-${name}.svg`), svg);
    writeFileSync(join(OUT, `fig-${name}.json`), JSON.stringify(data));
    const plateHtml = k.plateHtml({ fig: "Fig 1", title: name, hint: "", readout: "", caption: label, body: `<div class="iso-stage">${svg}</div>` });
    writeFileSync(join(HERE, "out", `fig-${name}.html`), k.pageHtml({ title: name, theme, body: plateHtml, script: kitScript(), width: 900 }));
    console.log("wrote fig-" + name, (svg.length / 1024).toFixed(0) + " KB");
  }


  /* ---------- paths: a route with rounded corners, a flat band along it ---------- */
  function rounded(poly, R = 18, seg = 10) {
    const out = [poly[0]];
    for (let i = 1; i < poly.length - 1; i++) {
      const a = poly[i - 1], b = poly[i], c = poly[i + 1];
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const r = Math.min(R, l1 / 2, l2 / 2);
      const p1 = [b[0] + (a[0] - b[0]) / l1 * r, b[1] + (a[1] - b[1]) / l1 * r];
      const p2 = [b[0] + (c[0] - b[0]) / l2 * r, b[1] + (c[1] - b[1]) / l2 * r];
      for (let t = 0; t <= 1.0001; t += 1 / seg) { const u = 1 - t; out.push([u * u * p1[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p1[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
    }
    out.push(poly[poly.length - 1]);
    return out;
  }
  // resample a polyline to ~step spacing so motion and offsets stay smooth
  function resample(pts, step = 3) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(l / step));
      for (let j = 1; j <= n; j++) out.push([a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n]);
    }
    return out;
  }
  const normalAt = (pts, i, closed) => {
    const n = pts.length, a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], c = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const tx = c[0] - a[0], ty = c[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return [-ty / l, tx / l];
  };
  const offset = (pts, o, closed = false) => pts.map((p, i) => { const nn = normalAt(pts, i, closed); return [p[0] + nn[0] * o, p[1] + nn[1] * o]; });
  // a flat band (road, lane, trace) along a path, as one concave solid
  function band(pts, half, z, h, style, closed = false) {
    if (closed) {
      const outer = offset(pts, half, true), inner = offset(pts, -half, true);
      return S(k.extrude(outer, z, h, P, { convex: false }), style) ;
    }
    const ring = [...offset(pts, half), ...offset(pts, -half).reverse()];
    return S(k.extrude(ring, z, h, P, { convex: false }), style);
  }
  const lineAlong = (pts, z, closed = false) => pts.map((p, i) => (i ? "L" : "M") + at([p[0], p[1], z]).map((v) => v.toFixed(1)).join(" ")).join("") + (closed ? "Z" : "");

  /* ---------- a mover that can face any way: built once per heading ---------- */
  // parts are boxes in the mover's own frame (forward = +x), drawn per heading in painter's order
  function movers(build, n = 16, path = null) {
    // only draw the headings the route actually uses (plus a neighbour each side)
    let need = null;
    if (path) {
      need = new Set();
      const pts = resample(path, 2);
      for (let i = 1; i < pts.length; i++) {
        const th = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
        const v = ((Math.round(th / (Math.PI * 2) * n) % n) + n) % n;
        need.add(v); need.add((v + 1) % n); need.add((v + n - 1) % n);
      }
    }
    const V = G.viewOf(P);
    const out = [];
    for (let v = 0; v < n; v++) {
      if (need && !need.has(v)) { out.push(`<g data-v="${v}" style="display:none"></g>`); continue; }
      const th = (v / n) * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th);
      const rot = ([x, y]) => [x * cs - y * sn, x * sn + y * cs];
      const parts = [];
      const near = (ly) => { const [dx, dy] = rot([0, ly]); return dx * V[0] + dy * V[1] > 0; };
      const box = (lx, ly, w, d, z, h, style, { layer = 0, r = 0.6, round = false, wrap = null } = {}) => {
        const ring = (round ? k.circleRing(lx, ly, w / 2, 24) : k.roundedPlan({ x: lx - w / 2, y: ly - d / 2, w, d, r }, 3)).map(rot);
        const [cx, cy] = rot([lx, ly]);
        const svg = S(k.extrude(ring, z, h, P), style);
        parts.push({ key: layer * 1e4 + depth(cx, cy, z + h / 2), svg: wrap ? wrap(svg) : svg });
      };
      // a wheel: a tyre and a hub, turned about the vehicle's own y axis; far wheels first, near ones last
      const wheel = (lx, ly, r, w, z, { tone = "lo" } = {}) => {
        const [cx, cy] = rot([lx, ly]), axis = rot([0, Math.sign(ly) || 1]), F = G.frameAlong([cx, cy, z], [axis[0], axis[1], 0]);
        const svg = S(G.disc(-w / 2, w / 2, r, F, P), { tone }) + S(G.disc(w / 2, w / 2 + 0.4, r * 0.48, F, P), { tone: "mid" }) + D([at(G.pointOf(F, w / 2 + 0.4, 0, 0))], { size: 0.45 });
        parts.push({ key: (near(ly) ? 9 : -1) * 1e4 + depth(cx, cy, z), svg });
      };
      build(box, wheel, { rot, near });
      parts.sort((a, b) => a.key - b.key);
      out.push(`<g data-v="${v}"${v ? ' style="display:none"' : ""}>${parts.map((p) => p.svg).join("")}</g>`);
    }
    return { svg: out.join(""), n };
  }

  // assemble a path figure: base layer, depth-sorted items with the mover slotted in by the page
  function writePath(name, { base: baseSvg, items, mover, path, stops, label, fx = "" }) {
    const pts = resample(path, 2.5);
    const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const sAt = (p) => { let bi = 0, bd = 1e9; pts.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; bi = i; } }); return acc[bi]; };
    items.sort((a, b) => a.d - b.d);
    // the mover starts at the first stop, in its depth slot, so the static drawing is already right
    const p0 = pts[0], s0 = at([p0[0], p0[1], 0]), o = at([0, 0, 0]), d0 = depth(p0[0], p0[1]);
    const cart = `<g class="fp-cart" data-part="cart" transform="translate(${(s0[0] - o[0]).toFixed(2)} ${(s0[1] - o[1]).toFixed(2)})">${mover.svg}</g>`;
    const slot = items.findIndex((it) => it.d > d0);
    const rows = items.map((it) => `<g class="fp-item" data-d="${it.d.toFixed(2)}">${it.svg}</g>`);
    rows.splice(slot < 0 ? rows.length : slot, 0, cart);
    const body = [baseSvg, `<g class="fp-items">${rows.join("")}</g>`, `<g class="fp-fx">${fx}</g>`];
    const svg = k.figureSvg({ width, height, className: "fp-svg", label, body });
    const o0 = at([0, 0, 0]), ux = at([1, 0, 0]), uy = at([0, 1, 0]);
    const data = {
      ax: [+(ux[0] - o0[0]).toFixed(5), +(ux[1] - o0[1]).toFixed(5)], ay: [+(uy[0] - o0[0]).toFixed(5), +(uy[1] - o0[1]).toFixed(5)],
      o: o0.map((v) => +v.toFixed(2)), vb: [width, height], dw: [+(depth(1, 0) - depth(0, 0)).toFixed(5), +(depth(0, 1) - depth(0, 0)).toFixed(5)], nv: mover.n,
      path: pts.map((p) => p.map((v) => +v.toFixed(2))), acc: acc.map((v) => +v.toFixed(2)), stops: stops.map((s) => +sAt(s.at).toFixed(2)), locs: stops.map((s) => s.loc),
    };
    writeFileSync(join(OUT, `fig-${name}.svg`), svg);
    writeFileSync(join(OUT, `fig-${name}.json`), JSON.stringify(data));
    const plateHtml = k.plateHtml({ fig: "Fig 1", title: name, hint: "", readout: "", caption: label, body: `<div class="iso-stage">${svg}</div>` });
    writeFileSync(join(HERE, "out", `fig-${name}.html`), k.pageHtml({ title: name, theme: "light", body: plateHtml, script: kitScript(), width: 900 }));
    console.log("wrote fig-" + name, (svg.length / 1024).toFixed(0) + " KB", items.length, "items");
  }

  /* ---------- actions: things that happen while the mover waits at a stop ----------
     act(i, svg, opts) wraps svg so the page plays it during stop i's hold (u runs 0 → 1).
     path: [[u, [x, y, z], arc?], ...] world keyframes, the first is where the svg is drawn;
     op: [[u, opacity], ...]; flash, dash, ring: simple shapes of u; rep: repeat count; ease: lin|inout|out|drop|back */
  function act(i, svg, { t = [0, 1], path, op, dash, ring, rep, ease = "inout" } = {}) {
    const a = [`data-act="${i}"`, `data-t="${t[0]} ${t[1]}"`, `data-ease="${ease}"`];
    if (path) {
      const o = at(path[0][1]);
      a.push(`data-path="${path.map(([u, p, arc = 0]) => { const q = at(p); return `${u}:${(q[0] - o[0]).toFixed(2)},${(q[1] - o[1]).toFixed(2)},${arc}`; }).join(";")}"`);
    }
    if (op) a.push(`data-op="${op.map(([u, v]) => `${u}:${v}`).join(";")}"`);
    if (dash) a.push(`data-dash="${dash === true ? "" : dash.map(([u, v]) => `${u}:${v}`).join(";")}"`);
    if (ring) a.push(`data-ring="${ring.join(" ")}"`);
    if (rep) a.push(`data-rep="${rep}"`);
    const hidden = op && op[0][1] === 0 ? ' style="opacity:0"' : "";
    return `<g ${a.join(" ")}${hidden}>${svg}</g>`;
  }
  // where the mover sits, and which way it faces, at a point on its path
  function frameAt(path, p) {
    const pts = resample(path, 2);
    let bi = 0, bd = 1e9; pts.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; bi = i; } });
    const a = pts[Math.max(0, bi - 1)], b = pts[Math.min(pts.length - 1, bi + 1)];
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]), [x, y] = pts[bi];
    return { x, y, th, local: (lx, ly, z = 0) => [x + lx * Math.cos(th) - ly * Math.sin(th), y + lx * Math.sin(th) + ly * Math.cos(th), z] };
  }

  /* ---------- a rig: a station built in its own frame, turned to face any way ---------- */
  function rig(cx, cy, th) {
    const cs = Math.cos(th), sn = Math.sin(th);
    const W = (lx, ly, z = 0) => [cx + lx * cs - ly * sn, cy + lx * sn + ly * cs, z];
    const parts = [];
    const box = (lx, ly, w, d, z, h, style, { r = 0.6, round = false, wrap = null, layer = 0 } = {}) => {
      const ring = (round ? k.circleRing(lx, ly, w / 2, 24) : k.roundedPlan({ x: lx - w / 2, y: ly - d / 2, w, d, r }, 3)).map(([x, y]) => W(x, y).slice(0, 2));
      const c0 = W(lx, ly);
      const svg = S(k.extrude(ring, z, h, P), style);
      parts.push({ key: layer * 1e4 + depth(c0[0], c0[1], z + h / 2), svg: wrap ? wrap(svg) : svg });
    };
    const raw = (svg, lx, ly, z, layer = 0) => { const c0 = W(lx, ly); parts.push({ key: layer * 1e4 + depth(c0[0], c0[1], z), svg }); };
    const line = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + at(W(...p)).map((v) => v.toFixed(1)).join(' ')).join('');
    return { W, box, raw, line, svg: () => parts.sort((a, b) => a.key - b.key).map((p) => p.svg).join('') };
  }

  return { rig, G, act, frameAt, P, at, S, L, D, seg, depth, byDepth, target, halo, slab, post, cyl, base, table, building, facePanel, write, rounded, resample, offset, band, lineAlong, movers, writePath };
}
