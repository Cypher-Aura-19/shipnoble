// Truck ride model for a cab-over tractor, integrated in real time.
//
//   road ──hits──▶ chassis (stiff leaf/air springs, fast)
//                    └─▶ cab (air-suspended, soft, floaty wobble)
//                          ├─▶ seat + head (sprung seat, lags the cab)  = our camera
//                          └─▶ driver hand on the wheel (lags slightly)
//   pitch: front-axle hit tips the nose up, drive-axle hit tips it back. Seen through the
//   side window, truck pitch shows up as the view tilting.
//
// A bump is a short sequence of axle hits (front → drive axle → trailer axles), spaced by
// wheelbase / speed, so it reads as a real truck rolling over a seam rather than one jolt.
import { PHYSICS } from '../config.js?v=4';

const spring = ({ k, c }) => ({ x: 0, v: 0, k, c });

export function createRig() {
  return {
    chassis: spring(PHYSICS.chassis),
    cab: spring(PHYSICS.cab),
    head: spring(PHYSICS.head),
    hand: spring(PHYSICS.hand),
    pitch: spring(PHYSICS.pitch),
    headPitch: spring(PHYSICS.headPitch),
    shake: 0, // decaying high-frequency thud energy
    roadPhase: Math.random() * 100,
    pending: [], // scheduled axle hits { at, strength, pitchSign }
    time: 0,
  };
}

// Schedule the axle hits that make up one bump.
export function bump(rig, strength = 1) {
  const s = strength * (0.85 + Math.random() * 0.3);
  for (const hit of PHYSICS.axles) {
    rig.pending.push({ at: rig.time + hit.delay * (0.9 + Math.random() * 0.2), strength: s * hit.strength, pitchSign: hit.pitch });
  }
}

function applyHit(rig, hit) {
  rig.chassis.v += PHYSICS.hitVelocity * hit.strength;
  rig.pitch.v += PHYSICS.pitchVelocity * hit.strength * hit.pitchSign;
  rig.shake = Math.min(1.5, rig.shake + hit.strength);
}

// Smooth pseudo-random road texture (sum of incommensurate sines), roughly -1..1.
function roadNoise(t) {
  return (
    0.5 * Math.sin(t * 9.3) +
    0.3 * Math.sin(t * 13.7 + 1.3) +
    0.2 * Math.sin(t * 21.1 + 0.4)
  );
}

export function stepRig(rig, dt, { driving = 1 } = {}) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;

  for (let i = 0; i < steps; i += 1) {
    rig.time += h;
    if (rig.pending.length) {
      rig.pending = rig.pending.filter((hit) => {
        if (hit.at > rig.time) return true;
        applyHit(rig, hit);
        return false;
      });
    }

    const { chassis, cab, head, hand, pitch, headPitch } = rig;
    // Chassis is pushed around its rest position by the road surface while driving.
    const road = roadNoise(rig.time + rig.roadPhase) * PHYSICS.roadAmplitude * driving;
    chassis.v += (-chassis.k * (chassis.x - road) - chassis.c * chassis.v) * h;
    chassis.x += chassis.v * h;
    cab.v += (-cab.k * (cab.x - chassis.x) - cab.c * cab.v) * h;
    cab.x += cab.v * h;
    head.v += (-head.k * (head.x - cab.x) - head.c * head.v) * h;
    head.x += head.v * h;
    hand.v += (-hand.k * (hand.x - cab.x) - hand.c * hand.v) * h;
    hand.x += hand.v * h;
    pitch.v += (-pitch.k * pitch.x - pitch.c * pitch.v) * h;
    pitch.x += pitch.v * h;
    headPitch.v += (-headPitch.k * (headPitch.x - pitch.x) - headPitch.c * headPitch.v) * h;
    headPitch.x += headPitch.v * h;
    rig.shake *= Math.exp(-h / PHYSICS.shakeDecay);
  }
}

// High-frequency thud added to the cab right after a hit (px).
export function thud(rig) {
  const t = rig.time;
  return rig.shake * PHYSICS.shakeAmplitude * (Math.sin(t * 157) * 0.6 + Math.sin(t * 233) * 0.4);
}
