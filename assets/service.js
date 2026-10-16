/* ================= SERVICE DETAIL ================= */
(() => {
const RMQ = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- how it works: a timeline beside the step cards ----------
   The rail runs from the first ring to the last. Its orange fill and each ring are driven by the same line on screen
   (55% down), so the fill reaches a ring exactly as that ring lights up. */
function procTimeline() {
  const list = document.querySelector('[data-proc]');
  if (!list) return;
  const rail = list.querySelector('.proc-rail'), fill = rail.querySelector('[data-proc-fill]');
  const steps = [...list.querySelectorAll('.proc-step')], rings = steps.map((s) => s.querySelector('.proc-ring'));
  const place = () => {
    const top = list.getBoundingClientRect().top, mid = (r) => { const b = r.getBoundingClientRect(); return b.top + b.height / 2 - top; };
    const a = mid(rings[0]), b = mid(rings[rings.length - 1]);
    rail.style.top = a + 'px'; rail.style.height = Math.max(0, b - a) + 'px';
  };
  place(); new ResizeObserver(place).observe(list);
  // lines that draw themselves get their true length (in their own units) for the dash animation
  list.querySelectorAll('.pm [data-a="draw"], .pm .pm-tape').forEach((el) => { try { el.style.setProperty('--len', el.getTotalLength().toFixed(2)); } catch (e) {} });
  // each card's scene plays from its first frame once the card is properly in view (its art past the lower third),
  // and rewinds when it leaves, so scrolling down always shows the whole action, never its tail end
  const scenes = steps.map((s) => s.querySelector('.proc-art'));
  const rewind = (art) => art.getAnimations({ subtree: true }).forEach((a) => { if (String(a.animationName || '').startsWith('pm-')) a.currentTime = 0; });
  // start: the art is well inside the screen (above its lower quarter); stop: the art has left the screen entirely
  const start = new IntersectionObserver((es) => es.forEach((e) => {
    const step = e.target.closest('.proc-step');
    if (e.isIntersecting && !step.classList.contains('is-in')) { rewind(e.target); step.classList.add('is-in'); }
  }), { rootMargin: '0px 0px -25% 0px', threshold: 0.6 });
  const stop = new IntersectionObserver((es) => es.forEach((e) => { if (!e.isIntersecting) e.target.closest('.proc-step').classList.remove('is-in'); }), { threshold: 0 });
  scenes.forEach((a) => { if (a) { start.observe(a); stop.observe(a); } });
  if (RMQ) { fill.style.transform = 'scaleY(1)'; steps.forEach((s) => s.classList.add('is-on')); return; }
  gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: rings[0], start: 'center 55%', endTrigger: rings[rings.length - 1], end: 'center 55%', scrub: true } });
  steps.forEach((s, i) => ScrollTrigger.create({ trigger: rings[i], start: 'center 55%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on') }));
}

document.addEventListener('sn:ready', () => {
  const { PathBackground, RM, lenis } = window.SN;

  // hero: title rises out of a mask, the rest settles in, the photo opens up
  const title = document.querySelector('[data-svh-title]');
  if (!RM) {
    const s = SplitText.create(title, { type: 'chars', mask: 'chars' });
    gsap.set((s.masks && s.masks.length) ? s.masks : s.chars.map(c => c.parentElement), { paddingBottom: '.2em', marginBottom: '-.2em' });
    gsap.from(s.chars, { yPercent: 105, duration: 1.2, ease: 'expo.out', stagger: .04, delay: .05, onComplete: () => s.revert() });
    gsap.from('.svh-promise, .svh-actions', { y: 16, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08, delay: .4 });
    gsap.from('.svh-photo', { clipPath: 'inset(10% 4% 0% 4% round 24px)', duration: 1.6, ease: 'expo.out', delay: .2 });
    gsap.from('.svh-photo img', { scale: 1.15, duration: 1.9, ease: 'expo.out', delay: .2 });
    gsap.from('.svh-facts li', { y: 20, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .08, delay: .7 });
    gsap.fromTo('.svh-photo img', { yPercent: -6 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.svh-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  procTimeline();

  // live inventory: circuit lines + numbers that move a little
  new PathBackground(document.querySelector('[data-lmsx-lines]'), { stroke: '#ffffff', strokeOpacity: .1, duration: 3.2, layout: (w, h) => [
    [{ x: 0, y: h * .78 }, { x: w * .22, y: h * .78, radius: 40 }, { x: w * .22, y: h }],
    [{ x: w * .38, y: 0 }, { x: w * .38, y: h * .12, radius: 30 }, { x: w, y: h * .12 }]
  ] });
  const ticks = [...document.querySelectorAll('[data-tick]')];
  if (!RM) setInterval(() => {
    const c = ticks[Math.floor(Math.random() * ticks.length)];
    const v = Math.max(0, +c.dataset.tick + (Math.random() > .5 ? 1 : -1) * Math.ceil(Math.random() * 6));
    c.dataset.tick = v; c.textContent = v.toLocaleString('en-US');
    gsap.fromTo(c, { color: getComputedStyle(document.querySelector('main.svc')).getPropertyValue('--a-light').trim() || '#ff9a5c' }, { color: '#ffffff', duration: 1.2, ease: 'power2.out' });
  }, 1800);
});

/* ---------- smooth anchor ---------- */
document.querySelectorAll('[data-scroll-to]').forEach(a => a.addEventListener('click', e => {
  const tg = document.querySelector(a.getAttribute('href')); if (!tg) return; e.preventDefault();
  window.SN?.lenis ? window.SN.lenis.scrollTo(tg, { offset: 0, duration: 1.4 }) : tg.scrollIntoView({ behavior: 'smooth' });
}));
})();
