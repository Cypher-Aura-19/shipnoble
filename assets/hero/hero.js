// Home hero: the freight-journey scene (inside the cab → out through the window → the hills fade into the page).
// Ported from cargo/freight-journey/web. It runs on the site's own GSAP, ScrollTrigger and Lenis (site.js).
import { LAYERS, TIMELINE } from './config.js?v=2';
import { createRenderer } from './render/renderer.js?v=2';
import { createGLRenderer } from './render/renderer-gl.js?v=2';
import { createJourney } from './scene/journey.js?v=2';

const { gsap } = window;
const journeyEl = document.querySelector('[data-journey]');
const canvas = journeyEl?.querySelector('[data-canvas]');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

// the night set sits beside the day photographs (assets/hero/img/night/), pixel-for-pixel registered with them
const isNight = () => document.documentElement.dataset.theme === 'dark';
const srcOf = (l, night) => (night ? l.src.replace('assets/hero/img/', 'assets/hero/img/night/') : l.src);
const sets = {};
async function preload(layers, night = isNight()) {
  const key = night ? 'night' : 'day';
  if (sets[key]) return sets[key];
  const images = {};
  await Promise.all(layers.filter((l) => l.src).map(async (l) => {
    const res = await fetch(srcOf(l, night));
    if (!res.ok) throw new Error(`Failed to load ${l.src}`);
    images[l.id] = await createImageBitmap(await res.blob());
  }));
  sets[key] = images;
  return images;
}

// copy choreography on the same scroll range as the canvas: the headline splits and leaves,
// the line over the hills arrives, then everything fades into the page
function initCopy() {
  const T = TIMELINE;
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: journeyEl, start: 'top top', end: 'bottom bottom', scrub: true } });
  tl.to('[data-split-l]', { xPercent: -45, autoAlpha: 0, duration: 0.1 }, T.exitStart)
    .to('[data-split-r]', { xPercent: 45, autoAlpha: 0, duration: 0.1 }, T.exitStart)
    .to('[data-hero-foot]', { y: 30, autoAlpha: 0, duration: 0.08 }, T.exitStart - 0.04)
    .to('[data-hero-kicker]', { y: -20, autoAlpha: 0, duration: 0.06 }, T.exitStart - 0.04)
    .to('[data-shade]', { autoAlpha: 0, duration: 0.1 }, T.exitStart)
    .fromTo('[data-hills-line]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.05 }, 0.79)
    .to('[data-hills-line]', { autoAlpha: 0, y: -30, duration: 0.04 }, T.fadeStart + 0.02)
    .to('[data-fade]', { opacity: 1, duration: 1 - T.fadeStart }, T.fadeStart);
  tl.set({}, {}, 1);
}

async function boot() {
  if (!journeyEl) return;
  let images;
  try { images = await preload(LAYERS); } catch (e) { console.warn(e); journeyEl.classList.add('is-static'); journeyEl.dataset.drawn = '1'; return; }

  let renderer = null;
  try { renderer = createGLRenderer(canvas, LAYERS, images); } catch (err) { console.warn('WebGL2 renderer failed, using Canvas2D', err); }
  renderer ??= createRenderer(canvas, LAYERS, images);
  const journey = createJourney({ trigger: journeyEl, reducedMotion });
  initCopy();
  journeyEl.classList.add('is-ready');
  // the theme switch swaps the photographs (the other set loads once, then swaps instantly)
  document.addEventListener('sn:theme', async () => {
    const want = isNight();
    try { const imgs = await preload(LAYERS, want); if (isNight() === want && renderer.setImages) renderer.setImages(imgs); } catch (e) { console.warn(e); }
  });

  // adaptive resolution: render fewer pixels rather than stutter
  const STEPS = [1, 0.8, 0.65, 0.5];
  let qi = 0, slow = 0, warmup = 2.5;
  const adapt = (dt) => {
    if (!renderer.setQuality || document.hidden) return;
    if (warmup > 0) { warmup -= dt; return; }
    if (dt > 0.25) return;
    slow = dt > 1 / 45 ? slow + dt : Math.max(0, slow - dt * 0.5);
    if (slow > 1.2 && qi < STEPS.length - 1) { qi += 1; renderer.setQuality(STEPS[qi]); slow = 0; }
  };

  // stop drawing once the hero has scrolled away
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; journeyEl.classList.toggle('is-away', !visible); }).observe(journeyEl);
  gsap.ticker.add((time, deltaMs) => {
    const dt = deltaMs / 1000;
    const state = journey.update(dt);
    if (!visible) return;
    renderer.render(state);
    if (!journeyEl.dataset.drawn) journeyEl.dataset.drawn = '1';   // the loader waits for this first frame
    adapt(dt);
  });
  // re-measure once the loader has opened, never in the middle of it
  if (window.SN?.revealed) window.ScrollTrigger.refresh();
  else document.addEventListener('sn:revealed', () => window.ScrollTrigger.refresh(), { once: true });
}

boot();
