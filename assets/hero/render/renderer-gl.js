// WebGL2 renderer: every layer is one textured quad on the GPU, repeating layers use texture
// wrapping (one draw however wide), and the ground plane is computed per pixel in a shader
// with hardware mipmaps + anisotropic filtering. Same projection maths as the Canvas2D fallback.
import { FRAME, GROUND, WINDOW } from '../config.js?v=4';
import { EDGE_RGB, bakeWindowDim, coverView, createDust, dustAt, groundParams, heroView, projectLayer, topColor } from './shared.js?v=4';

const QUAD_VS = `#version 300 es
in vec2 aPos;
uniform vec4 uRect;      // frame-space x0, y0, x1, y1
uniform vec4 uUV;        // u0, v0, u1, v1
uniform float uTilt;     // radians, around the frame centre
uniform vec2 uCenter;
uniform float uLift;     // camera pitch: whole view shifts up
uniform vec3 uView;      // scale, ox, oy (frame → device px)
uniform vec2 uRes;       // device px
out vec2 vUV;
out vec2 vFrame;
void main() {
  vec2 p = mix(uRect.xy, uRect.zw, aPos);
  vFrame = p;
  vUV = mix(uUV.xy, uUV.zw, aPos);
  vec2 d = p - uCenter;
  float c = cos(uTilt), s = sin(uTilt);
  p = uCenter + vec2(c * d.x - s * d.y, s * d.x + c * d.y);
  p.y -= uLift;
  vec2 px = p * uView.x + uView.yz;
  vec2 clip = px / uRes * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const QUAD_FS = `#version 300 es
precision highp float;
in vec2 vUV;
uniform sampler2D uTex;
uniform vec4 uTint;      // premultiplied multiplier (rgb · a, a)
out vec4 outColor;
void main() { outColor = texture(uTex, vUV) * uTint; }`;

// Ground: vFrame is the un-tilted, un-pitched frame position, so the plane maths is exact.
const GROUND_FS = `#version 300 es
precision highp float;
in vec2 vFrame;
uniform sampler2D uTex;
uniform vec2 uCenter;
uniform float uF, uH, uCamZ, uShift;
uniform vec2 uPxm;       // texture px per metre (u along road, v sideways)
uniform vec2 uTexSize;
uniform vec2 uFade;      // metres: fade from, fade to
out vec4 outColor;
void main() {
  float dy = vFrame.y - uCenter.y;
  if (dy <= 0.5) discard;
  float dEff = uH * uF / dy;
  float dWorld = dEff + uCamZ;
  float alpha = 1.0 - clamp((dWorld - uFade.x) / (uFade.y - uFade.x), 0.0, 1.0);
  if (alpha <= 0.0 || dWorld < 0.0) discard;
  float along = (vFrame.x - uCenter.x) * dEff / uF - uShift;
  vec2 uv = vec2(along * uPxm.x, dWorld * uPxm.y) / uTexSize;
  outColor = texture(uTex, uv) * alpha;
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
  return sh;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i += 1) {
    const { name } = gl.getActiveUniform(p, i);
    u[name] = gl.getUniformLocation(p, name);
  }
  return { p, u };
}

// Canvas sources are uploaded premultiplied → no dark fringes on cut-out edges.
function upload(gl, source, { repeat = false, repeatY = false, mips = false, aniso = null } = {}) {
  let src = source;
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    src = new OffscreenCanvas(source.width, source.height);
    src.getContext('2d').drawImage(source, 0, 0);
  }
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, repeatY ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  if (mips) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  if (aniso) {
    const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
  }
  return { tex: t, w: source.width, h: source.height };
}

function makeDustSprite() {
  const c = new OffscreenCanvas(64, 64);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

function makeVignette() {
  const c = new OffscreenCanvas(256, 256);
  const g = c.getContext('2d');
  g.translate(128, 128);
  g.scale(1, 0.92);
  const grad = g.createRadialGradient(0, -10, 70, 0, -10, 182);
  grad.addColorStop(0, 'rgba(8,6,4,0)');
  grad.addColorStop(1, 'rgba(8,6,4,0.24)');
  g.fillStyle = grad;
  g.fillRect(-140, -150, 280, 300);
  return c;
}

// the cab fades into the dark at the top and bottom edge of the frame when it is shown whole (portrait screens)
function makeEdgeFade() {
  const c = new OffscreenCanvas(4, 256);
  const g = c.getContext('2d');
  const [r, gg, b] = EDGE_RGB;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(0.45, `rgba(${r},${gg},${b},0.6)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  return c;
}

function makeGlassSheen() {
  const c = new OffscreenCanvas(256, 256);
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, 'rgba(255,236,205,0)');
  grad.addColorStop(0.35, 'rgba(255,236,205,0.10)');
  grad.addColorStop(0.42, 'rgba(255,245,230,0.20)');
  grad.addColorStop(0.5, 'rgba(255,236,205,0.06)');
  grad.addColorStop(1, 'rgba(255,236,205,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return c;
}

export function createGLRenderer(canvas, layers, images) {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if (layers.some((l) => images[l.id] && Math.max(images[l.id].width, images[l.id].height) > maxTex)) return null;

  const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
  const quad = program(gl, QUAD_VS, QUAD_FS);
  const ground = program(gl, QUAD_VS, GROUND_FS);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const tex = {};
  let sky = [0.9, 0.84, 0.72];
  // (re)upload every layer's texture; used again when the theme swaps the day and night photographs
  function setImages(imgs) {
  for (const l of layers) {
    const img = imgs[l.id];
    if (!img) continue;
    if (l.id === 'hills') sky = topColor(img);
    const source = l.dim ? bakeWindowDim(img, l.dim) : img;
    if (tex[l.id]) gl.deleteTexture(tex[l.id].tex);
    tex[l.id] = upload(gl, source, {
      repeat: Boolean(l.tile) || l.kind === 'ground',
      repeatY: l.kind === 'ground',
      mips: true, // layers are shown below 1:1 most of the time; mips stop shimmer during bumps
      aniso: l.kind === 'ground' ? aniso : null,
    });
  }
  }
  setImages(images);
  const dustTex = upload(gl, makeDustSprite());
  const glassTex = upload(gl, makeGlassSheen());
  const vignetteTex = upload(gl, makeVignette());
  const edgeTex = upload(gl, makeEdgeFade());
  const dust = createDust();

  const view = { scale: 1, ox: 0, oy: 0, dpr: 1, w: 0, h: 0, quality: 1, grow: 1 };
  let camZ0 = 0;

  function resize() {
    const base = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.5 : 2);
    const dpr = base * view.quality;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    Object.assign(view, { dpr, w: canvas.width, h: canvas.height }, heroView(canvas.width, canvas.height, camZ0));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  // Drop resolution when the GPU can't keep up (frame time is measured by the caller).
  function setQuality(q) {
    if (Math.abs(q - view.quality) < 0.01) return;
    view.quality = q;
    resize();
  }

  function setCommon(prog, lift) {
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u.uCenter, FRAME.cx, FRAME.cy);
    gl.uniform1f(prog.u.uLift, lift);
    gl.uniform3f(prog.u.uView, view.scale, view.ox, view.oy);
    gl.uniform2f(prog.u.uRes, view.w, view.h);
  }

  function drawQuad(t, rect, uv, tilt, tint) {
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform4f(quad.u.uRect, rect[0], rect[1], rect[2], rect[3]);
    gl.uniform4f(quad.u.uUV, uv[0], uv[1], uv[2], uv[3]);
    gl.uniform1f(quad.u.uTilt, tilt);
    gl.uniform4f(quad.u.uTint, tint[0], tint[1], tint[2], tint[3]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function render(state) {
    const lift = state.pitchPx || 0;
    camZ0 = state.camZ;
    Object.assign(view, heroView(view.w, view.h, state.camZ));
    // a portrait screen shows the whole frame on a dark ground: the world is clipped to the frame until it grows to fill the screen
    const bg = view.grow < 0.999 ? EDGE_RGB.map((v) => v / 255) : sky;
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(bg[0], bg[1], bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (view.grow < 0.999) {
      const x0 = Math.max(0, Math.floor(view.ox)), x1 = Math.min(view.w, Math.ceil(view.ox + FRAME.w * view.scale));
      const y0 = Math.max(0, Math.floor(view.oy)), y1 = Math.min(view.h, Math.ceil(view.oy + FRAME.h * view.scale));
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(x0, view.h - y1, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    }

    // Visible frame rect (+ margin so tilted quads never show an edge).
    const m = 220;
    const vis = {
      x0: -view.ox / view.scale - m,
      x1: (view.w - view.ox) / view.scale + m,
      y0: -view.oy / view.scale + lift - m,
      y1: (view.h - view.oy) / view.scale + lift + m,
    };
    const { cx, cy } = FRAME;

    for (const layer of layers) {
      if (layer.kind === 'ground') {
        const t = tex[layer.id];
        if (!t) continue;
        const g = groundParams(state);
        if (GROUND.fadeTo - state.camZ <= 0.05) continue;
        setCommon(ground, lift);
        gl.bindTexture(gl.TEXTURE_2D, t.tex);
        gl.uniform4f(ground.u.uRect, vis.x0, cy, vis.x1, vis.y1);
        gl.uniform4f(ground.u.uUV, 0, 0, 1, 1);
        gl.uniform1f(ground.u.uTilt, (state.worldRollDeg * Math.PI) / 180);
        gl.uniform1f(ground.u.uF, g.F);
        gl.uniform1f(ground.u.uH, g.h);
        gl.uniform1f(ground.u.uCamZ, state.camZ);
        gl.uniform1f(ground.u.uShift, g.worldShift);
        gl.uniform2f(ground.u.uPxm, GROUND.pxPerMeterU, GROUND.pxPerMeterV);
        gl.uniform2f(ground.u.uTexSize, t.w, t.h);
        gl.uniform2f(ground.u.uFade, GROUND.fadeFrom, GROUND.fadeTo);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        continue;
      }

      const pl = projectLayer(layer, state);
      if (!pl) continue;
      const { k, alpha, shiftX, shiftY } = pl;
      const tilt = (pl.tiltDeg * Math.PI) / 180;
      setCommon(quad, lift);

      if (layer.kind === 'glass') {
        if (state.glassAlpha <= 0.001) continue;
        const a = state.glassAlpha * alpha;
        const rect = [
          cx + (WINDOW.x0 - cx + shiftX) * k, cy + (WINDOW.y0 - cy + shiftY) * k,
          cx + (WINDOW.x1 - cx + shiftX) * k, cy + (WINDOW.y1 - cy + shiftY) * k,
        ];
        drawQuad(glassTex, rect, [0, 0, 1, 1], tilt, [a, a, a, a]);
        continue;
      }

      if (layer.kind === 'dust') {
        for (const mote of dust) {
          const d = dustAt(mote, state.time);
          const a = d.a * alpha;
          const x = cx + (d.x - cx) * k;
          const y = cy + (d.y - cy + shiftY) * k;
          const r = d.r * k * 2.2;
          drawQuad(dustTex, [x - r, y - r, x + r, y + r], [0, 0, 1, 1], tilt, [a, (a * 232) / 255, (a * 196) / 255, a]);
        }
        continue;
      }

      const t = tex[layer.id];
      if (!t) continue;
      const sc = layer.scale ?? 1;
      const top = cy + (layer.y - cy + shiftY) * k;
      const bottom = top + t.h * sc * k;
      const tint = [alpha, alpha, alpha, alpha];

      if (layer.tile) {
        // One quad across the whole visible width; the texture repeats via REPEAT wrapping.
        const toU = (x) => ((x - cx) / k + cx - (layer.x + shiftX)) / sc / t.w;
        drawQuad(t, [vis.x0, top, vis.x1, bottom], [toU(vis.x0), 0, toU(vis.x1), 1], tilt, tint);
      } else {
        const left = cx + (layer.x - cx + shiftX) * k;
        drawQuad(t, [left, top, left + t.w * sc * k, bottom], [0, 0, 1, 1], tilt, tint);
      }
    }

    // Cinematic vignette over the visible screen (no tilt, no pitch).
    setCommon(quad, 0);
    const sx0 = -view.ox / view.scale;
    const sy0 = -view.oy / view.scale;
    drawQuad(vignetteTex, [sx0, sy0, sx0 + view.w / view.scale, sy0 + view.h / view.scale], [0, 0, 1, 1], 0, [1, 1, 1, 1]);
    if (view.grow < 0.999) {
      const ext = 0.3 * (1 - view.grow) * FRAME.h;
      drawQuad(edgeTex, [sx0, 0, sx0 + view.w / view.scale, ext], [0, 0, 1, 1], 0, [1, 1, 1, 1]);
      drawQuad(edgeTex, [sx0, FRAME.h - ext, sx0 + view.w / view.scale, FRAME.h], [0, 1, 1, 0], 0, [1, 1, 1, 1]);
    }
    gl.disable(gl.SCISSOR_TEST);
  }

  resize();
  window.addEventListener('resize', resize);
  return { render, resize, view, setQuality, setImages, kind: 'webgl2' };
}
