// Night lights for the figures: lamp heads, pools of light on the ground, lit windows, headlight beams and tail
// lights. Everything is drawn with soft gradients (no blur filters, so it costs nothing to scroll) and carries the
// class "nt", which the stylesheets hide in daylight and show in the dark theme.
//   const N = nightKit(h, "wh");   body: N.defs + ... + N.lamp([x, y, z], 3) + N.pool([x, y, 0], 12) ...
let uid = 0;
export function nightKit(h, id) {
  const { at, poly } = h, k = h.cam.k, sinE = Math.max(0.12, h.cam.sinE);
  const P = (p) => at(p).map((v) => +v.toFixed(1));
  const defs = `<defs>
<radialGradient id="${id}-lamp"><stop offset="0" stop-color="#fff4dc" stop-opacity=".95"/><stop offset=".22" stop-color="#ffd9a0" stop-opacity=".42"/><stop offset=".6" stop-color="#ffb866" stop-opacity=".12"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-pool"><stop offset="0" stop-color="#ffd9a2" stop-opacity=".5"/><stop offset=".5" stop-color="#ffc27e" stop-opacity=".18"/><stop offset="1" stop-color="#ffb060" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-warm"><stop offset="0" stop-color="#ffb866" stop-opacity=".42"/><stop offset=".5" stop-color="#ff9a4a" stop-opacity=".14"/><stop offset="1" stop-color="#ff8a3a" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-cool"><stop offset="0" stop-color="#cfe4ff" stop-opacity=".4"/><stop offset=".55" stop-color="#9cc4ff" stop-opacity=".12"/><stop offset="1" stop-color="#8ab8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-haze"><stop offset="0" stop-color="#fff6e4" stop-opacity=".32"/><stop offset=".5" stop-color="#ffe8c2" stop-opacity=".08"/><stop offset="1" stop-color="#ffe0b0" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-hl"><stop offset="0" stop-color="#fff3dc" stop-opacity=".42"/><stop offset=".45" stop-color="#ffe2b4" stop-opacity=".16"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>
<filter id="${id}-soft" x="-25%" y="-150%" width="150%" height="400%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${(1.6 * k).toFixed(2)}"/></filter>
<radialGradient id="${id}-hlg" cx=".5" cy=".5" r=".5" fx=".34" fy=".5"><stop offset="0" stop-color="#ffe6bc" stop-opacity=".36"/><stop offset=".3" stop-color="#ffd69e" stop-opacity=".22"/><stop offset=".62" stop-color="#ffc67e" stop-opacity=".08"/><stop offset="1" stop-color="#ffc67e" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-vol"><stop offset="0" stop-color="#ffecc8" stop-opacity="1"/><stop offset=".3" stop-color="#ffdca6" stop-opacity=".55"/><stop offset=".62" stop-color="#ffcb86" stop-opacity=".16"/><stop offset="1" stop-color="#ffc277" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-red"><stop offset="0" stop-color="#ff6a55" stop-opacity=".95"/><stop offset=".3" stop-color="#ff3b30" stop-opacity=".3"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
</defs>`;
  const ell = (c, rx, ry, g, op = 1) => `<ellipse class="nt" cx="${c[0]}" cy="${c[1]}" rx="${Math.max(0.5, rx).toFixed(1)}" ry="${Math.max(0.5, ry).toFixed(1)}" fill="url(#${id}-${g})"${op < 1 ? ` opacity="${op}"` : ""}/>`;
  const f2 = (v) => +v.toFixed(2);
  const disc = (o, ex, ey, g, op = 1) => `<ellipse class="nt" rx="1" ry="1" transform="matrix(${f2(ex[0])} ${f2(ex[1])} ${f2(ey[0])} ${f2(ey[1])} ${f2(o[0])} ${f2(o[1])})" fill="url(#${id}-${g})"${op < 1 ? ` opacity="${op}"` : ""}/>`;
  // a disc lying in the world: centre c, half axes u and v as world vectors, projected exactly by the camera
  const oval = (c, u, v, g, op) => { const o = at(c), a = at([c[0] + u[0], c[1] + u[1], c[2] + u[2]]), b = at([c[0] + v[0], c[1] + v[1], c[2] + v[2]]); return disc(o, [a[0] - o[0], a[1] - o[1]], [b[0] - o[0], b[1] - o[1]], g, op); };
  const o0 = at([0, 0, 0]), J = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => { const q = at(e); return [q[0] - o0[0], q[1] - o0[1]]; });
  const blob = (c, axes, op) => {
    // screen covariance of the ellipsoid with semi-axis vectors axes: sum of (J·a)(J·a)^T, then its Cholesky factor
    let c00 = 0, c01 = 0, c11 = 0;
    for (const a of axes) { const sx = J[0][0] * a[0] + J[1][0] * a[1] + J[2][0] * a[2], sy = J[0][1] * a[0] + J[1][1] * a[1] + J[2][1] * a[2]; c00 += sx * sx; c01 += sx * sy; c11 += sy * sy; }
    const l11 = Math.sqrt(Math.max(c00, 0.09)), l21 = c01 / l11, l22 = Math.sqrt(Math.max(c11 - l21 * l21, 0.09));
    return disc(at(c), [l11, l21], [0, l22], "vol", +op.toFixed(3));
  };
  // a beam of light in the air: from A toward B, its cross-section growing from r0 to r1 along two unit directions u (wide)
  // and v (narrow); brightest at the source, thinning out with distance. n overlapping blobs read as one soft volume.
  const cone = (A, B, u, v, [ru0, ru1], [rv0, rv1], peak, n = 16) => {
    const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...d), t1 = d.map((x) => x / L);
    let out = "";
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, c = A.map((x, j) => x + d[j] * t), ru = ru0 + (ru1 - ru0) * t, rv = rv0 + (rv1 - rv0) * t;
      const op = peak * Math.pow(1 - t, 1.35) * Math.min(1, 0.35 + t * 6);
      out += blob(c, [t1.map((x) => x * (L / n) * 1.6), u.map((x) => x * ru), v.map((x) => x * rv)], op);
    }
    return out;
  };
  const linear = (a, b, stops) => {
    const gid = `${id}-b${++uid}`, A = P(a), B = P(b);
    return [gid, `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}">${stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join("")}</linearGradient>`];
  };
  return {
    defs,
    // a lamp seen head-on: a bright core with a soft halo (r in world units)
    lamp: (p, r = 3, g = "lamp") => ell(P(p), r * k, r * k, g),
    // a soft glow of any colour around a point (rx, ry in world units, as seen on screen)
    glow: (p, rx, ry = rx, g = "warm") => ell(P(p), rx * k, ry * k, g),
    // a pool of light on the ground, flattened by the camera's tilt
    pool: (p, rx, ry = rx, g = "pool", head) => {
      let out = ell(P(p), rx * k, ry * k * sinE, g);
      // the light between head and road: a cone opening downward from the lamp to the pool
      if (head) out = cone([head[0], head[1], head[2] - 0.6], p, [1, 0, 0], [0, 1, 0], [1.2, rx * 0.72], [1.2, ry * 0.72], 0.11, 12) + out;
      return out;
    },
    // a tail light
    tail: (p, r = 1.6) => ell(P(p), r * k, r * k, "red"),
    // a lit window: a warm glow on the wall around it
    win: (x0, x1, y, z0, z1) => ell(P([(x0 + x1) / 2, y + 0.2, (z0 + z1) / 2]), (x1 - x0) * 1.05 * k, (z1 - z0) * 0.95 * k, "warm"),
    // headlights: one model in world space, so the side view, the camera swing and the top view all see the same light.
    // Each low beam is a volume of light leaving the lens, aimed a touch below the horizon: it widens sideways much more
    // than it grows in height, thins out with distance, and lands on the road ahead as a soft warm patch (brightest a
    // third of the way out). The lens itself is a small hot core with a bloom. Nothing in it has an edge.
    headlights: (x, w, z, { dir = 1, reach = 180, ground = 0 } = {}) => {
      const g = ground + 0.1, n = 18, spread = reach * 0.3, land = 0.32, step = reach / n;
      const ease = (t) => t * t * (3 - 2 * t);
      let beams = "";
      for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        // the lower edge dips from the lens to the road by about a third of the throw; the upper edge (the cutoff)
        // stays near lamp height, rising only a little as the beam spreads
        const lo = z - 0.5 - (z - 0.5 - g) * ease(Math.min(1, t / land)), hi = z + 0.4 + (z * 0.18) * t;
        const cx = x + dir * (0.4 + reach * t), cy = sd * (w + reach * 0.05 * t), ru = 1.6 + spread * t;
        const op = 0.16 * Math.pow(1 - t, 1.4) * Math.min(1, 0.12 + t * 3.2);
        beams += blob([cx, cy, (lo + hi) / 2], [[dir * step * 1.6, 0, 0], [0, ru, 0], [0, 0, (hi - lo) / 2 + 1.2]], op);
      }
      // where the light lands: a soft patch on the road, starting where the beam meets it
      const road = oval([x + dir * reach * 0.56, 0, g], [dir * reach * 0.42, 0, 0], [0, w + reach * 0.22, 0], "hlg", 0.8);
      const lens = [-1, 1].map((sd) => ell(P([x + dir * 0.3, sd * w, z]), 4.5 * k, 4.5 * k, "lamp", 0.4) + ell(P([x + dir * 0.3, sd * w, z]), 1.6 * k, 1.6 * k, "lamp")).join("");
      return `<g class="nt">${road}${beams}${lens}</g>`;
    },
  };
}
