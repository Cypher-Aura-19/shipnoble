// Maths and one-time asset preparation shared by the WebGL and Canvas2D renderers.
//
// Depth camera. For a point p of a layer authored as seen from the rest camera (cam.z = 0):
//   k       = z / (z − cam.z)
//   screen  = C + ((p − C) + shift / z) · k
// Shifts are in "focal px" (px at 1 m), so nearer layers move more.
import { CAMERA, DRIVE_DIRECTION, DUST, FOCUS, FRAME, MAX_CAB_OFFSET, WINDOW } from '../config.js?v=6';

export const NEAR = 0.04;

// Where a flat layer lands this frame, in frame coordinates (before tilt/pitch).
// Returns null when the camera has passed the layer.
export function projectLayer(layer, state) {
  const dz = layer.z - state.camZ;
  if (dz <= NEAR) return null;
  const k = (layer.z / dz) * (layer.bleed ?? 1);

  let alpha = 1;
  if (layer.fadeFrom && k > layer.fadeFrom) alpha = Math.max(0, 1 - (k - layer.fadeFrom) / 2);
  if (alpha <= 0) return null;

  let layerUp = 0;
  if (layer.rig === 'cab' || layer.kind === 'glass' || layer.kind === 'dust') layerUp = state.cabUp;
  if (layer.rig === 'hand') layerUp = state.handUp;
  const camUp = state.headUp + state.camRise;
  let shiftY = -(layerUp - camUp) / layer.z;
  if (layer.bleed) shiftY = Math.max(-MAX_CAB_OFFSET, Math.min(MAX_CAB_OFFSET, shiftY));
  const shiftX = layer.rig || layer.kind ? 0 : (-DRIVE_DIRECTION * state.dist) / layer.z;
  const tiltDeg = layer.rig || layer.kind === 'glass' || layer.kind === 'dust' ? state.cabRollDeg : state.worldRollDeg;

  return { k, alpha, shiftX, shiftY, tiltDeg };
}

// Ground plane parameters for this frame.
export function groundParams(state) {
  const { focal: F, eyeHeight } = CAMERA;
  return {
    F,
    h: eyeHeight + (state.headUp + state.camRise) / F, // camera height above the road, m
    worldShift: (-DRIVE_DIRECTION * state.dist) / F, // m the world has slid past
  };
}

// Motes hang in the light in front of the window; each drifts and twinkles on its own clock.
export function createDust() {
  const rand = (a, b) => a + Math.random() * (b - a);
  return Array.from({ length: DUST.count }, () => ({
    x: rand(WINDOW.x0 - 120, WINDOW.x1 + 80),
    y: rand(WINDOW.y0 - 60, WINDOW.y1 + 40),
    r: rand(1.2, 3.6),
    a: rand(0.08, 0.32),
    vx: rand(-6, 6),
    vy: rand(-4, 3),
    phase: rand(0, Math.PI * 2),
    speed: rand(0.3, 0.9),
  }));
}

// Frame-space position, radius and opacity of a mote at time t.
export function dustAt(m, t) {
  const span = WINDOW.x1 - WINDOW.x0 + 200;
  const left = WINDOW.x0 - 120;
  return {
    x: left + ((((m.x - left + m.vx * t) % span) + span) % span),
    y: m.y + m.vy * t * 0.3 + Math.sin(t * m.speed + m.phase) * 14,
    r: m.r,
    a: m.a * (0.55 + 0.45 * Math.sin(t * m.speed * 2.3 + m.phase)),
  };
}

// Edge-dimmed copy of a layer so the window reads as the focal point (Jesko's focal window).
// source-atop keeps the transparent window hole untouched. Returns an OffscreenCanvas.
export function bakeWindowDim(img, dim) {
  const c = new OffscreenCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);

  const wx = (WINDOW.x0 + WINDOW.x1) / 2;
  const wy = (WINDOW.y0 + WINDOW.y1) / 2;
  const rx = (WINDOW.x1 - WINDOW.x0) / 2;
  const ry = (WINDOW.y1 - WINDOW.y0) / 2;
  g.globalCompositeOperation = 'source-atop';
  g.translate(wx, wy);
  g.scale(rx / ry, 1); // circle → ellipse matching the window
  const grad = g.createRadialGradient(0, 0, ry * FOCUS.innerScale, 0, 0, ry * FOCUS.outerScale);
  grad.addColorStop(0, 'rgba(6,5,4,0)');
  grad.addColorStop(1, `rgba(6,5,4,${dim})`);
  g.fillStyle = grad;
  g.fillRect(-wx * (ry / rx) - 10, -wy - 10, (img.width * ry) / rx + 20, img.height + 20);
  return c;
}

// Average colour of an image's top rows (the sky colour to fill above the hills photo).
export function topColor(img) {
  const c = new OffscreenCanvas(1, 1);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, img.width, 24, 0, 0, 1, 1);
  const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
  return [r / 255, gg / 255, b / 255];
}

export function coverView(canvasW, canvasH) {
  const scale = Math.max(canvasW / FRAME.w, canvasH / FRAME.h);
  return { scale, ox: (canvasW - FRAME.w * scale) / 2, oy: (canvasH - FRAME.h * scale) / 2 };
}

// Portrait screens: the frame is the portrait cab (config.js). Its window is fitted to the screen width with the frame hung from
// just under the nav bar; whatever the frame does not reach (the lower door, on a tall phone) is the dark the copy sits on.
// `grow` is 0 at rest and eases to 1 (the plain cover fit) as the camera nears the glass, so the move out through the window
// still fills the screen.
export const EDGE_RGB = [14, 15, 17];
export function heroView(cw, ch, camZ = 0) {
  const cover = coverView(cw, ch);
  if (cw >= ch) return { ...cover, grow: 1 };
  const winW = WINDOW.x1 - WINDOW.x0, wcx = (WINDOW.x0 + WINDOW.x1) / 2;
  const fit = cw / (winW + 100);
  const end = Math.max(fit, cover.scale);
  const t = Math.min(1, Math.max(0, camZ / 0.2)), grow = t * t * (3 - 2 * t);
  const fox = cw / 2 - wcx * fit, foy = Math.min(0, ch * 0.14 - WINDOW.y0 * fit);
  const eox = (cw - FRAME.w * end) / 2, eoy = (ch - FRAME.h * end) / 2;
  return { scale: fit + (end - fit) * grow, ox: fox + (eox - fox) * grow, oy: foy + (eoy - foy) * grow, grow };
}
// is any part of the screen outside the frame (the frame is shown whole)?
export const boxed = (v, cw, ch) => v.ox > 0.5 || v.oy > 0.5 || v.ox + FRAME.w * v.scale < cw - 0.5 || v.oy + FRAME.h * v.scale < ch - 0.5;
