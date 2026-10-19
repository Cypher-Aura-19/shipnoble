// Single source of truth for the hero scene. All positions are in the 2560 × 1440 master frame.

export const BRAND = 'SHIPNOBLE';

export const FRAME = { w: 2560, h: 1440, cx: 1280, cy: 720 };

// +1 = the truck drives toward screen-right (the cab image has its dashboard on the right),
// so the world outside slides right → left.
export const DRIVE_DIRECTION = 1;

// Camera model (all depths in metres). FOCAL is in frame px: a 1 m object 1 m away is 880 px wide.
// The eye sits 2.4 m above the road (truck cab), looking level, so the horizon is the frame centre.
export const CAMERA = { focal: 880, eyeHeight: 2.4 };

// Perspective ground plane drawn from a top-down texture (see tools/build_ground_texture.py).
// u = along the road, v = sideways distance from the truck.
export const GROUND = {
  src: 'assets/hero/img/ground.webp',
  pxPerMeterU: 256,
  pxPerMeterV: 64,
  // The drawn ground is only the road edge + gravel under the guardrail; behind it the sharp
  // hills photo takes over (the stretched grass texture looked blurry).
  fadeFrom: 5.35, // metres: gravel starts blending into the hills photo
  fadeTo: 5.75,
  step: 2, // frame px per drawn band
};

// Cab overscan and the largest on-screen offset the ride may give it (frame px). With an 8% bleed the
// cab has ≥ 57 px of spare image on every side, so 34 px of travel (+ ~13 px from a 0.6° tilt at the corners) never shows an edge.
const CAB_BLEED = 1.08;
export const MAX_CAB_OFFSET = 34;

// Layers are drawn back to front. z = depth in metres from the eye at rest.
// tile = horizontal repeat period in image px; scale = image px → frame px at rest.
// x/y = where the image's top-left sits in the frame.
export const LAYERS = [
  { id: 'hills', src: 'assets/hero/img/hills.webp', z: 40, tile: 5120, x: -1280, y: 0 },
  { id: 'ground', kind: 'ground', src: GROUND.src, z: 0 },
  // Guardrail 4.9 m out, posts standing on the asphalt edge. Drawn 1.3× true scale so it reads taller;
  // feet stay on the ground line: y = 1151 − 1246 × scale.
  { id: 'guardrail', src: 'assets/hero/img/guardrail.webp', z: 4.9, tile: 2560, scale: 0.6091, x: 0, y: 392, fadeFrom: 2.6 },
  // bleed: drawn a little larger than the frame (around the window centre) so bumps and tilt
  // never pull the cab's edge into view.
  { id: 'glass', kind: 'glass', z: 0.6, bleed: CAB_BLEED },
  { id: 'cab', src: 'assets/hero/img/cab-interior.webp', z: 0.6, x: 0, y: 0, rig: 'cab', bleed: CAB_BLEED }, // window falloff is baked into the image (Codex FIX 1)
  { id: 'dust', kind: 'dust', z: 0.5, fadeFrom: 1.3, bleed: CAB_BLEED },
  // No driver hand: the camera sits in the passenger seat looking out of the passenger window, so the
  // steering wheel (driver side, behind our shoulder) is physically out of view.
  // { id: 'hand', src: 'assets/hero/img/driver-hand.webp', z: 0.45, x: 0, y: 0, rig: 'hand' },
];

// Jesko's focal window: layers with `dim` darken away from the window (pre-baked once).
// The dim is an ellipse around the window: clear just outside the glass, darkest at the frame edges.
export const FOCUS = { innerScale: 1.08, outerScale: 2.1 };

// Measured transparent window hole in cab-interior (see assets/qa).
export const WINDOW = { x0: 550, y0: 263, x1: 2011, y1: 1178 };

// Scroll choreography, as fractions of the pinned journey.
export const TIMELINE = {
  driveStart: 0.02,
  // Seven bumps spread over the long drive: three small ones to set the mood,
  // then the road gets rough, ending on the hardest hit.
  bumps: [
    { at: 0.06, strength: 0.3 },
    { at: 0.12, strength: 0.4 },
    { at: 0.18, strength: 0.5 },
    { at: 0.26, strength: 1.0 },
    { at: 0.33, strength: 1.15 },
    { at: 0.4, strength: 0.95 },
    { at: 0.48, strength: 1.3 },
  ],
  calmStart: 0.52, // ride motion fades out before the camera moves
  exitStart: 0.56,
  glassGone: 0.63,
  driveStop: 0.74,
  hillsEnd: 0.9,
  fadeStart: 0.9,
};

// Driving and camera path.
export const MOTION = {
  cruiseSpeed: 600, // focal-px/s (÷ focal = m/s): calm drift; near ground ~130 px/s, hills ~15 px/s
  scrollBoost: 1.4, // extra speed (× cruise) at fast scrolling; eases back when the user stops
  boostVelocity: 2500, // scroll px/s that counts as "fast"
  boostResponse: 2.5, // how quickly speed follows the scroll (1/s)
  camZEnd: 14, // how far we fly toward the hills
  camZAtWindow: 0.62, // camera depth (m) that lands just past the window glass
  windowShare: 0.4, // fraction of the fly phase spent reaching the window
  camRise: 600, // focal-px (≈0.7 m): camera lifts while flying, so the ground drops away
  flyPitchDeg: 0, // keep the camera level after leaving the cab so the road stays hidden below the view
};

// Ride physics (see scene/physics.js). Springs: k = stiffness, c = damping.
export const PHYSICS = {
  chassis: { k: 360, c: 22 }, // ~3 Hz, firm
  cab: { k: 80, c: 4.5 }, // ~1.4 Hz air-suspended cab, floaty
  head: { k: 55, c: 8 }, // sprung seat + neck, lags the cab
  hand: { k: 120, c: 10 },
  pitch: { k: 70, c: 5 }, // degrees
  headPitch: { k: 45, c: 7 }, // our head tilts with the cab, late
  hitVelocity: 780, // px/s given to the chassis per axle hit
  pitchVelocity: 5, // deg/s per axle hit
  axles: [
    { delay: 0, strength: 1, pitch: 1 }, // front axle: nose up
    { delay: 0.19, strength: 0.8, pitch: -1 }, // drive axle: tips back
    { delay: 0.5, strength: 0.3, pitch: -0.4 }, // trailer axles, far behind
  ],
  roadAmplitude: 1.0, // px of constant road texture while driving
  shakeAmplitude: 1.3, // px of high-frequency thud
  shakeDecay: 0.09, // seconds
  maxTiltDeg: 0.6, // cap when several bumps overlap
  sway: 0.85, // px of slow cab rocking between bumps (~0.3 Hz)
};

// Dust floating in the sunlit cab (layer 'dust' above).
export const DUST = { count: 46 };

// Portrait screens (phones, tablets held upright) get their own cab: a 1440 × 2560 frame whose window fits the screen width,
// so the whole window is shown instead of a crop of it. The world layers are lowered to sit behind the new window, with the
// horizon (and so the projection centre) where the road meets the guardrail at the same distance above the sill as on desktop.
export const PORTRAIT = window.innerWidth < window.innerHeight;
if (PORTRAIT) {
  Object.assign(FRAME, { w: 1440, h: 2560, cx: 720, cy: 1112 });
  Object.assign(WINDOW, { x0: 90, y0: 779, x1: 1350, y1: 1569 });
  const dy = FRAME.cy - 720;
  for (const l of LAYERS) {
    if (l.id === 'hills' || l.id === 'guardrail') l.y += dy;
    if (l.id === 'cab') l.src = 'assets/hero/img/cab-interior-portrait.webp';
  }
}
