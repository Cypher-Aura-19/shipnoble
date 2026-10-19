// Maps time (the truck is always cruising) and scroll progress (bumps, fly-out) to the
// camera/scene state the renderer draws.
// GSAP comes from the page (window.gsap), shared with the rest of the site
const { gsap, ScrollTrigger } = window;
import { CAMERA, MOTION, PHYSICS, TIMELINE } from '../config.js?v=4';
import { bump, createRig, stepRig, thud } from './physics.js?v=4';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const range = (v, a, b) => clamp01((v - a) / (b - a));
const inOut = gsap.parseEase('power1.inOut');
const sine = gsap.parseEase('sine.inOut');

// camZ = A·(e^{b·s} − 1): constant *relative* speed, so the fly-through feels evenly paced
// from the window glass all the way to the hills. b is solved so the window is reached at windowShare.
function solveCamCurve() {
  const { camZAtWindow, camZEnd, windowShare } = MOTION;
  const target = camZEnd / camZAtWindow;
  let lo = 0.01;
  let hi = 20;
  for (let i = 0; i < 60; i += 1) {
    const b = (lo + hi) / 2;
    const ratio = (Math.exp(b) - 1) / (Math.exp(b * windowShare) - 1);
    if (ratio > target) hi = b;
    else lo = b;
  }
  const b = (lo + hi) / 2;
  const A = camZEnd / (Math.exp(b) - 1);
  return (s) => A * (Math.exp(b * s) - 1);
}

export function createJourney({ trigger, reducedMotion }) {
  const rig = createRig();
  const camCurve = solveCamCurve();
  const st = ScrollTrigger.create({ trigger, start: 'top top', end: 'bottom bottom' });

  let lastP = 0;
  let speed = 1; // cruise multiplier, follows scroll velocity
  const state = {
    p: 0, camZ: 0, camRise: 0, dist: 0, glassAlpha: 1,
    cabUp: 0, headUp: 0, handUp: 0, cabRollDeg: 0, worldRollDeg: 0, time: 0, pitchPx: 0,
  };

  function update(dt) {
    const p = st.progress;
    const T = TIMELINE;
    const step = Math.min(dt, 1 / 20);

    // Bumps fire when the scroll crosses a threshold (softer when scrolling back).
    if (!reducedMotion) {
      for (const { at, strength } of T.bumps) {
        if (lastP < at && p >= at) bump(rig, strength);
        else if (lastP > at && p <= at) bump(rig, strength * 0.6);
      }
    }
    lastP = p;

    // In the truck we cruise at constant speed; once we leave the cab the world stops sliding.
    // Scrolling presses the accelerator a little; letting go eases back to cruise.
    const inTruck = 1 - sine(range(p, T.exitStart, T.driveStop));
    const scrollSpeed = Math.min(1, Math.abs(st.getVelocity()) / MOTION.boostVelocity);
    const target = 1 + (reducedMotion ? 0 : MOTION.scrollBoost * scrollSpeed);
    speed += (target - speed) * (1 - Math.exp(-step * MOTION.boostResponse));
    state.dist += MOTION.cruiseSpeed * speed * step * inTruck;
    stepRig(rig, step, { driving: inTruck });

    // Ride motion fades out before the camera glides through the window.
    const calm = reducedMotion ? 0 : 1 - sine(range(p, T.calmStart, T.exitStart));
    const fly = inOut(range(p, T.exitStart, T.hillsEnd));

    state.p = p;
    state.camZ = camCurve(fly);
    // Go straight through the window centre first; only once clear of the cab, rise a little.
    const clear = MOTION.windowShare * 1.1;
    state.camRise = sine(range(fly, clear, 1)) * MOTION.camRise;
    const tiltDown = sine(range(p, T.exitStart + 0.03, T.glassGone + 0.05)) * (1 - sine(range(p, T.driveStop, T.hillsEnd - 0.02)));
    state.pitchPx = CAMERA.focal * Math.tan((MOTION.flyPitchDeg * Math.PI) / 180) * tiltDown;
    state.glassAlpha = 1 - range(p, T.exitStart, T.glassGone);
    const sway = PHYSICS.sway * (Math.sin(rig.time * 1.9) * 0.7 + Math.sin(rig.time * 3.1 + 1) * 0.3) * inTruck;
    state.cabUp = (rig.cab.x + thud(rig) + sway) * calm;
    state.time = rig.time;
    state.headUp = rig.head.x * calm;
    state.handUp = rig.hand.x * calm;
    const clampTilt = (d) => Math.max(-PHYSICS.maxTiltDeg, Math.min(PHYSICS.maxTiltDeg, d));
    state.cabRollDeg = clampTilt(rig.pitch.x - rig.headPitch.x) * calm;
    state.worldRollDeg = clampTilt(-rig.headPitch.x) * calm;
    return state;
  }

  return { update, state, scrollTrigger: st };
}
