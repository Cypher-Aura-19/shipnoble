/* ================= HOME ================= */
(() => {
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');

/* ---------- services: a preview image that follows the pointer ---------- */
const list = document.querySelector('[data-hs-list]');
const preview = document.querySelector('[data-hs-preview]');
if (list && preview && !RM) {
  const img = preview.querySelector('[data-hs-img]');
  const pos = { x: innerWidth / 2, y: innerHeight / 2 }, cur = { ...pos };
  let raf = 0, on = false;
  const loop = () => {
    cur.x += (pos.x - cur.x) * 0.16; cur.y += (pos.y - cur.y) * 0.16;
    const tilt = Math.max(-8, Math.min(8, (pos.x - cur.x) * 0.06));
    preview.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%) rotate(${tilt}deg) scale(${on ? 1 : 0.85})`;
    raf = on || Math.abs(pos.x - cur.x) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  list.querySelectorAll('a').forEach((a) => {
    // warm the image so the swap is instant
    const pre = new Image(); pre.src = a.dataset.img;
    a.addEventListener('pointerenter', () => { if (!fine.matches) return; if (img.getAttribute('src') !== a.dataset.img) img.src = a.dataset.img; on = true; preview.classList.add('is-on'); kick(); });
  });
  list.addEventListener('pointerleave', () => { on = false; preview.classList.remove('is-on'); kick(); });
  addEventListener('pointermove', (e) => { pos.x = e.clientX; pos.y = e.clientY; if (on) kick(); }, { passive: true });
}

/* ---------- why shipnoble: tabs with a sliding indicator ---------- */
const tabs = [...document.querySelectorAll('.hw-tabs [role="tab"]')];
const ind = document.querySelector('.hw-tab-ind');
if (tabs.length) {
  const place = (t) => { ind.style.width = t.offsetWidth + 'px'; ind.style.transform = `translateX(${t.offsetLeft}px)`; };
  const select = (i, focus) => {
    tabs.forEach((t, k) => {
      const sel = k === i, panel = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', sel); t.tabIndex = sel ? 0 : -1;
      if (sel && panel.hidden) {
        panel.hidden = false;
        if (!RM && window.gsap) gsap.fromTo(panel.children, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.06 });
      } else if (!sel) panel.hidden = true;
    });
    place(tabs[i]); if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); select((i + d + tabs.length) % tabs.length, true); }
    });
  });
  const init = () => place(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
  init(); addEventListener('resize', init); document.fonts?.ready.then(init);
}

/* ---------- testimonials: one at a time, progress bars, pause on hover ---------- */
const stage = document.querySelector('[data-hq]');
if (stage) {
  const slides = [...stage.querySelectorAll('.hq-slide')];
  const dotsEl = document.querySelector('[data-hq-dots]');
  const dots = slides.map((_, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Quote ${i + 1}`); b.innerHTML = '<i></i>'; dotsEl.append(b); return b; });
  const HOLD = 7;
  let i = 0, t = 0, last = 0, paused = false, visible = false;
  // each quote is split into characters once (words kept whole), so a change lights it letter by letter the way the
  // about page text does: muted, then orange with a soft glow, then ink
  slides.forEach((s) => {
    const q = s.querySelector('blockquote'), label = q.textContent.replace(/\s+/g, ' ').trim();
    q.setAttribute('aria-label', label);
    let n = 0;
    q.innerHTML = label.split(' ').map((w) => `<span class="hq-wd" aria-hidden="true">${[...w].map((ch) => `<span class="hq-c" style="--i:${n++}">${ch}</span>`).join('')}</span>`).join(' ');
    s.style.setProperty('--n', n);
  });
  const play = (s) => { s.classList.remove('is-play'); void s.offsetWidth; s.classList.add('is-play'); };
  const show = (n) => {
    const prev = i;
    i = (n + slides.length) % slides.length; t = 0;
    slides.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-out', k === prev && k !== i); s.setAttribute('aria-hidden', k !== i); });
    play(slides[i]);
    dots.forEach((d, k) => { d.classList.toggle('is-done', k < i); d.firstElementChild.style.transform = k < i ? 'scaleX(1)' : 'scaleX(0)'; d.setAttribute('aria-current', k === i); });
  };
  const tick = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0; last = now;
    if (!paused && visible && !RM) {
      t += dt / HOLD;
      dots[i].firstElementChild.style.transform = `scaleX(${Math.min(1, t)})`;
      if (t >= 1) show(i + 1);
    }
    requestAnimationFrame(tick);
  };
  dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
  document.querySelector('[data-hq-prev]').addEventListener('click', () => show(i - 1));
  document.querySelector('[data-hq-next]').addEventListener('click', () => show(i + 1));
  const host = stage.closest('.hq');
  host.addEventListener('pointerenter', () => { paused = true; });
  host.addEventListener('pointerleave', () => { paused = false; });
  host.addEventListener('focusin', () => { paused = true; });
  host.addEventListener('focusout', () => { paused = false; });
  let seen = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !seen) { seen = true; t = 0; play(slides[i]); } }, { threshold: 0.35 }).observe(host);
  show(0); requestAnimationFrame(tick);
}

/* ---------- worldwide band: a gentle parallax on the photo ---------- */
document.addEventListener('sn:ready', () => {
  if (RM || !window.gsap) return;
  gsap.fromTo('.hg-card > img', { yPercent: -5 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.hg-card', start: 'top bottom', end: 'bottom top', scrub: true } });
});

/* ---------- in-page links (the hero's "Explore services") go through Lenis ---------- */
document.querySelectorAll('[data-scroll-to]').forEach((a) => a.addEventListener('click', (e) => {
  const tg = document.querySelector(a.getAttribute('href')); if (!tg) return; e.preventDefault();
  window.SN?.lenis ? window.SN.lenis.scrollTo(tg, { duration: 1.6 }) : tg.scrollIntoView({ behavior: 'smooth' });
}));
})();
