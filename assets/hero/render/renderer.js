// Draws every layer through one depth camera onto a single canvas.
//
// For a point p of a layer authored as seen from the rest camera (cam.z = 0):
//   k       = z / (z - cam.z)
//   screen  = C + ((p - C) + (layerShift - camShift) / z) * k
// layerShift / camShift are in px at cab depth (z = 1), so nearer layers move more.
import { CAMERA, DRIVE_DIRECTION, FRAME, GROUND, MAX_CAB_OFFSET, WINDOW } from '../config.js?v=6';
import { EDGE_RGB, NEAR, boxed, bakeWindowDim, createDust, heroView } from './shared.js?v=6';

// Half-size copies of the ground texture, so distant rows sample a pre-filtered image
// instead of shimmering.
function buildMips(img, levels = 4) {
  const mips = [img];
  for (let i = 1; i < levels; i += 1) {
    const prev = mips[i - 1];
    const c = new OffscreenCanvas(Math.max(1, prev.width >> 1), Math.max(1, prev.height >> 1));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(prev, 0, 0, c.width, c.height);
    mips.push(c.transferToImageBitmap());
  }
  return mips;
}

export function createRenderer(canvas, layers, images) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    Object.assign(view, { dpr, w: canvas.width, h: canvas.height }, heroView(canvas.width, canvas.height, 0));
  }

  // Visible frame-space rectangle (frame coords that land on the canvas).
  function visibleFrameRect() {
    return {
      x0: -view.ox / view.scale,
      x1: (view.w - view.ox) / view.scale,
      y0: -view.oy / view.scale,
      y1: (view.h - view.oy) / view.scale,
    };
  }

  const dust = createDust();

  function drawDust(k, shiftY, t, alpha) {
    const { cx, cy } = FRAME;
    const span = WINDOW.x1 - WINDOW.x0 + 200;
    for (const m of dust) {
      const x = WINDOW.x0 - 120 + ((((m.x - (WINDOW.x0 - 120) + m.vx * t) % span) + span) % span);
      const y = m.y + m.vy * t * 0.3 + Math.sin(t * m.speed + m.phase) * 14;
      const twinkle = 0.55 + 0.45 * Math.sin(t * m.speed * 2.3 + m.phase);
      ctx.globalAlpha = m.a * twinkle * alpha;
      ctx.beginPath();
      ctx.arc(cx + (x - cx) * k, cy + (y - cy + shiftY) * k, m.r * k, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawGlass(k, shiftX, shiftY, alpha) {
    if (alpha <= 0.001) return;
    const { cx, cy } = FRAME;
    const x0 = cx + (WINDOW.x0 - cx + shiftX) * k;
    const y0 = cy + (WINDOW.y0 - cy + shiftY) * k;
    const w = (WINDOW.x1 - WINDOW.x0) * k;
    const h = (WINDOW.y1 - WINDOW.y0) * k;
    const g = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h);
    g.addColorStop(0, 'rgba(255,236,205,0)');
    g.addColorStop(0.35, 'rgba(255,236,205,0.10)');
    g.addColorStop(0.42, 'rgba(255,245,230,0.20)');
    g.addColorStop(0.5, 'rgba(255,236,205,0.06)');
    g.addColorStop(1, 'rgba(255,236,205,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, w, h);
    ctx.globalAlpha = 1;
  }

  let groundPatterns = null;
  let skyColor = '#e9d6b8';

  // Perspective ground plane: each thin horizontal band of the screen is one distance from the
  // camera, so it is filled with that row of the top-down texture, scaled for that distance.
  // Near rows sweep past fast, far rows creep — real ground parallax.
  function drawGround(state, vis) {
    if (!groundPatterns) return;
    const { focal: F, eyeHeight } = CAMERA;
    const { cx, cy } = FRAME;
    const h = eyeHeight + (state.headUp + state.camRise) / F; // camera height above the road, m
    const worldShift = (-DRIVE_DIRECTION * state.dist) / F; // m the world has slid past
    const maxEff = GROUND.fadeTo - state.camZ;
    if (maxEff <= 0.05) return;

    ctx.save();
    if (state.worldRollDeg) {
      ctx.translate(cx, cy);
      ctx.rotate((state.worldRollDeg * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    const step = GROUND.step;
    const y0 = Math.max(cy + (h * F) / maxEff, vis.y0);
    const y1 = vis.y1 + 40; // a little past the bottom so rotation never shows a gap
    const x0 = vis.x0 - 60;
    const width = vis.x1 - x0 + 120;

    for (let y = y0; y < y1; y += step) {
      const dTop = (h * F) / (y - cy) + state.camZ; // world distance at band top
      const dBot = (h * F) / (y + step - cy) + state.camZ;
      const dEff = (h * F) / (y + step / 2 - cy);
      const dWorld = dEff + state.camZ;
      if (dWorld < 0) continue;

      let alpha = 1;
      if (dWorld > GROUND.fadeFrom) alpha = 1 - (dWorld - GROUND.fadeFrom) / (GROUND.fadeTo - GROUND.fadeFrom);
      if (alpha <= 0) continue;

      // Pick a mip level from how many texels land on one screen pixel.
      const texelsPerPx = (dEff * GROUND.pxPerMeterU) / (F * view.scale);
      const level = Math.min(groundPatterns.length - 1, Math.max(0, Math.floor(Math.log2(Math.max(texelsPerPx, 1)))));
      const div = 2 ** level;
      const pu = GROUND.pxPerMeterU / div;
      const pv = GROUND.pxPerMeterV / div;

      // Texture → frame: x = cx + (u/pu + worldShift)·F/d ; rows vTop..vBot span this band.
      const a = F / (dEff * pu);
      const e = cx + (worldShift * F) / dEff;
      const vTop = dTop * pv;
      const vBot = dBot * pv;
      const b = step / (vBot - vTop);
      const f = y - vTop * b;
      const pattern = groundPatterns[level];
      pattern.setTransform(new DOMMatrix([a, 0, 0, b, e, f]));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pattern;
      ctx.fillRect(x0, y, width, step + 0.6);
    }
    ctx.restore();
  }

  // state: { camZ, camShiftY, dist, glassAlpha, rig offsets, cabRollDeg }
  function render(state) {
    Object.assign(view, heroView(view.w, view.h, state.camZ));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    const shown = boxed(view, view.w, view.h);
    if (shown) {
      // the frame is shown whole on a dark ground: the world is clipped to it
      ctx.fillStyle = `rgb(${EDGE_RGB.join(',')})`;
      ctx.fillRect(0, 0, view.w, view.h);
      ctx.beginPath();
      ctx.rect(view.ox, view.oy, FRAME.w * view.scale, FRAME.h * view.scale);
      ctx.clip();
    }
    ctx.fillStyle = skyColor; // anything above the hills photo reads as sky, never a black band
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);

    // Camera pitch (small angle): looking down shifts the whole view up uniformly.
    const lift = state.pitchPx || 0;
    ctx.translate(0, -lift);
    const vis = visibleFrameRect();
    vis.y0 += lift;
    vis.y1 += lift;
    const { cx, cy } = FRAME;

    for (const layer of layers) {
      if (layer.kind === 'ground') {
        drawGround(state, vis);
        continue;
      }
      const dz = layer.z - state.camZ;
      if (dz <= NEAR) continue;
      const k = (layer.z / dz) * (layer.bleed ?? 1);

      let alpha = 1;
      if (layer.fadeFrom && k > layer.fadeFrom) alpha = Math.max(0, 1 - (k - layer.fadeFrom) / 2);
      if (alpha <= 0) continue;

      // Vertical: rig offsets (px up → negative screen y) relative to the camera.
      let layerUp = 0;
      if (layer.rig === 'cab' || layer.kind === 'glass' || layer.kind === 'dust') layerUp = state.cabUp;
      if (layer.rig === 'hand') layerUp = state.handUp;
      const camUp = state.headUp + state.camRise;
      let shiftY = (-(layerUp - camUp)) / layer.z;
      if (layer.bleed) shiftY = Math.max(-MAX_CAB_OFFSET, Math.min(MAX_CAB_OFFSET, shiftY));

      // Horizontal: the world slides past the truck; the cab rides with the camera.
      const shiftX = layer.rig || layer.kind ? 0 : (-DRIVE_DIRECTION * state.dist) / layer.z;

      if (layer.kind === 'glass') {
        drawGlass(k, shiftX, shiftY, state.glassAlpha);
        continue;
      }
      if (layer.kind === 'dust') {
        ctx.fillStyle = 'rgb(255, 232, 196)';
        drawDust(k, shiftY, state.time, alpha);
        continue;
      }

      const img = layer.image;
      if (!img) continue;

      ctx.save();
      ctx.globalAlpha = alpha;
      // Truck pitch seen through the side window: the cab tilts relative to our head,
      // and the world tilts the other way as our head follows the cab.
      const tiltDeg = layer.rig ? state.cabRollDeg : state.worldRollDeg;
      if (tiltDeg) {
        ctx.translate(cx, cy);
        ctx.rotate((tiltDeg * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      const sc = layer.scale ?? 1;
      const destY = cy + (layer.y - cy + shiftY) * k;
      const destW = img.width * sc * k;
      const destH = img.height * sc * k;

      if (layer.tile) {
        // Frame-space x range visible for this layer at scale k.
        const fx0 = cx + (vis.x0 - cx) / k;
        const fx1 = cx + (vis.x1 - cx) / k;
        const period = layer.tile * sc;
        const origin = layer.x + shiftX;
        const n0 = Math.floor((fx0 - origin) / period) - 1;
        const n1 = Math.floor((fx1 - origin) / period) + 1;
        for (let n = n0; n <= n1; n += 1) {
          const fx = origin + n * period;
          ctx.drawImage(img, cx + (fx - cx) * k, destY, destW + 1, destH);
        }
      } else {
        ctx.drawImage(img, cx + (layer.x - cx + shiftX) * k, destY, destW, destH);
      }
      ctx.restore();
    }
    ctx.restore();
    if (shown) {
      const [r, g, b] = EDGE_RGB, ext = 0.16 * FRAME.h * (1 - view.grow) * view.scale, top = view.oy, bot = view.oy + FRAME.h * view.scale;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fade = (y0, y1) => { const gr = ctx.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, `rgba(${r},${g},${b},1)`); gr.addColorStop(0.45, `rgba(${r},${g},${b},0.6)`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`); ctx.fillStyle = gr; ctx.fillRect(0, Math.min(y0, y1), view.w, ext); };
      if (top > -1) fade(top, top + ext);
      if (bot < view.h + 1) fade(bot, bot - ext);
    }
  }

  const setImages = (imgs) => layers.forEach((l) => {
    l.image = imgs[l.id];
    if (l.dim && l.image) l.image = bakeWindowDim(l.image, l.dim);
    if (l.id === 'hills' && l.image) {
      // Average of the photo's top rows = the sky colour to fill above it.
      const c = new OffscreenCanvas(1, 1);
      const g = c.getContext('2d');
      g.drawImage(l.image, 0, 0, l.image.width, 24, 0, 0, 1, 1);
      const [r, gg, b] = g.getImageData(0, 0, 1, 1).data;
      skyColor = `rgb(${r}, ${gg}, ${b})`;
    }
    if (l.kind === 'ground' && l.image) {
      groundPatterns = buildMips(l.image).map((m) => ctx.createPattern(m, 'repeat'));
    }
  });
  setImages(images);
  resize();
  window.addEventListener('resize', resize);

  return { render, resize, view, setImages };
}
