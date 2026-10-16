/* ================= CONTACT PAGE ================= */
(() => {
const RMQ = matchMedia('(prefers-reduced-motion: reduce)').matches;
const form = document.querySelector('.qform');
const card = document.querySelector('.form-card');
const stateEl = document.querySelector('.qform-state'), note = form.querySelector('[data-note]');
const NOTE = note.textContent;
const fill = document.querySelector('.form-progress-fill');
const msg = document.getElementById('f-msg'), count = document.querySelector('[data-count]');
const svc = form.querySelector('.svc');
const panes = [...form.querySelectorAll('.qpane')];
const dots = [...form.querySelectorAll('.qsteps-i')];
const titleEl = form.querySelector('[data-step-title]'), summary = form.querySelector('[data-summary]');
const TITLES = ['What can we move for you?', 'How do we reach you?'];
let step = 1;

/* ---------- validation ---------- */
const rules = {
  first_name: v => v.trim().length > 0,
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  phone: v => v.replace(/\D/g, '').length >= 7
};
const servicesChosen = () => [...form.querySelectorAll('input[name="services"]:checked')].map(i => i.value);
const volume = () => form.querySelector('input[name="volume"]:checked')?.value || '';
function checkField(input, show) {
  const rule = rules[input.name]; if (!rule) return true;
  const ok = rule(input.value), f = input.closest('.field');
  f.classList.toggle('is-valid', ok);
  if (show || f.classList.contains('is-invalid')) f.classList.toggle('is-invalid', !ok);
  input.setAttribute('aria-invalid', String(!ok && show));
  return ok;
}
function checkChips(show) {
  const ok = servicesChosen().length > 0;
  if (show || svc.classList.contains('is-invalid')) svc.classList.toggle('is-invalid', !ok);
  return ok;
}
// the bar under the card's top edge: step one fills the first half, your details the second
function progress() {
  const w = [[servicesChosen().length > 0, .36], [!!volume(), .07], [msg.value.trim().length > 10, .07],
    [rules.first_name(form.first_name.value), .14], [rules.email(form.email.value), .18], [rules.phone(form.phone.value), .18]];
  const pct = w.reduce((a, [ok, v]) => a + (ok ? v : 0), 0);
  fill.style.transform = `scaleX(${Math.min(1, pct)})`;
}
form.querySelectorAll('input[required]').forEach(i => {
  i.addEventListener('blur', () => checkField(i, true));
  i.addEventListener('input', () => { checkField(i, false); progress(); });
});
form.querySelectorAll('input[name="services"], input[name="volume"]').forEach(c => c.addEventListener('change', () => { checkChips(false); progress(); }));
msg.addEventListener('input', () => { count.textContent = msg.value.length; progress(); });

/* ---------- steps: the panes slide sideways, the card eases to its new height ---------- */
const ease = 'expo.inOut';
const lenisRef = () => window.SN?.lenis;
let busy = false;
function keepCardInView() {
  const l = lenisRef(), top = card.getBoundingClientRect().top;
  if (top < 80 || top > innerHeight * .5) l ? l.scrollTo(card, { offset: -110, duration: 1 }) : card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function setDots(n) {
  dots.forEach((d, i) => {
    d.classList.toggle('is-on', i + 1 === n); d.classList.toggle('is-done', i + 1 < n);
    i + 1 === n ? d.setAttribute('aria-current', 'step') : d.removeAttribute('aria-current');
  });
}
function goStep(n) {
  if (busy || n === step) return;
  const dir = n > step ? 1 : -1, from = panes[step - 1], to = panes[n - 1];
  step = n; setDots(n);
  if (n === 2) summary.textContent = [servicesChosen().map(s => s.replace('Wine and Spirits', 'Wine & Spirits')).join(' · '), volume()].filter(Boolean).join('  —  ');
  const focusNext = () => (n === 2 ? form.first_name : form.querySelector('input[name="services"]')).focus({ preventScroll: true });
  if (RMQ || !window.gsap) { from.hidden = true; to.hidden = false; titleEl.textContent = TITLES[n - 1]; focusNext(); return; }
  busy = true;
  const h0 = card.offsetHeight;
  gsap.to(titleEl, { yPercent: -60, autoAlpha: 0, duration: .3, ease: 'power2.in', onComplete: () => {
    titleEl.textContent = TITLES[n - 1];
    gsap.fromTo(titleEl, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .7, ease: 'expo.out' });
  } });
  gsap.to(from.children, { x: -36 * dir, autoAlpha: 0, duration: .32, ease: 'power2.in', stagger: .03, onComplete: () => {
    from.hidden = true; gsap.set(from.children, { clearProps: 'all' });
    to.hidden = false;
    const h1 = card.offsetHeight;
    gsap.fromTo(card, { height: h0 }, { height: h1, duration: .7, ease, clearProps: 'height' });
    gsap.fromTo(to.children, { x: 36 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: .85, ease: 'expo.out', stagger: .055, delay: .12, clearProps: 'transform,opacity,visibility', onComplete: () => { busy = false; } });
    keepCardInView();
    setTimeout(focusNext, 350);
  } });
}
const nudge = (el) => { if (!RMQ && window.gsap) gsap.fromTo(el, { x: -6 }, { x: 0, duration: .6, ease: 'elastic.out(1,.3)' }); };
form.querySelector('.qform-next').addEventListener('click', () => {
  if (!checkChips(true)) { nudge(form.querySelector('.qform-next')); svc.querySelector('input').focus({ preventScroll: true }); return; }
  goStep(2);
});
form.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => goStep(1)));

/* ---------- submit: the result state replaces the form ---------- */
const ARROW = '<svg viewBox="0 0 14 14" fill="none"><path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const btnHTML = (label, variant, icon, cls = '', tag = 'button', href = '') =>
  `<${tag} ${tag === 'a' ? `href="${href}"` : 'type="button"'} class="btn btn--${variant} ${cls}"><span class="btn-label"><span class="roll"><span aria-hidden="true">${label}</span><span aria-hidden="true">${label}</span></span><span class="sr-only">${label}</span></span><span class="btn-icon" aria-hidden="true">${icon}${icon}</span></${tag}>`;

function swapPanels(from, to, build) {
  // fade the current panel out, resize the card, fade the next one in
  const h0 = card.offsetHeight;
  const parts = (el) => el === form ? form.querySelectorAll('.qform-head, .qpane:not([hidden]) > *') : el.children;
  const out = parts(from);
  const finish = () => {
    from.hidden = true; build && build(); to.hidden = false;
    gsap.set(out, { clearProps: 'all' });
    const h1 = card.offsetHeight;
    gsap.fromTo(card, { height: h0 }, { height: h1, duration: .75, ease, clearProps: 'height' });
    gsap.fromTo(parts(to), { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'expo.out', stagger: .06, delay: .25, clearProps: 'transform,opacity,visibility' });
    const bars = to.querySelectorAll('.qst-bar span');
    if (bars.length) gsap.to(bars, { scaleX: i => [1, .45, 0][i], duration: 1.2, ease: 'expo.out', stagger: .25, delay: .7 });
    keepCardInView();
    setTimeout(() => { busy = false; (to === stateEl ? stateEl : form.querySelector('input[name="services"]')).focus({ preventScroll: true }); }, 900);
  };
  if (RMQ || !window.gsap) { from.hidden = true; build && build(); to.hidden = false; busy = false; return; }
  gsap.to(out, { y: -14, autoAlpha: 0, duration: .32, ease: 'power2.in', stagger: .025, onComplete: finish });
}

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const GO = '<svg viewBox="0 0 14 14" fill="none"><path d="M1 13L13 1M13 1H4M13 1v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function showState(type, data) {
  const name = (data.first_name || '').trim(), full = [data.first_name, data.last_name].filter(Boolean).join(' ').trim();
  const success = type === 'success';
  swapPanels(form, stateEl, () => {
    stateEl.className = 'qform-state is-' + type;
    if (success) {
      const ref = 'SN-' + new Date().getFullYear().toString().slice(2) + '-' + String(Math.floor(1000 + Math.random() * 9000));
      const time = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric', timeZone: 'America/Toronto' }).format(new Date());
      stateEl.innerHTML = `
        <div class="qst-head">
          <p class="qst-status"><i></i>Request received</p>
          <h2 class="qst-title">Thanks${name ? ', ' + esc(name) : ''}. We're on it.</h2>
          <p class="qst-text">Your details are with our logistics team. Here's a copy of what you sent.</p>
        </div>
        <div class="qst-ticket">
          <div class="qst-ticket-top"><div class="qst-ref"><span>Reference</span><b>${ref}</b></div><span class="qst-time">${esc(time)} · Toronto</span></div>
          <dl class="qst-dl">
            <div><dt>Name</dt><dd>${esc(full || '—')}</dd></div>
            <div><dt>Email</dt><dd>${esc(data.email)}</dd></div>
            <div><dt>Phone</dt><dd>${esc(data.phone)}</dd></div>
            ${data.company ? `<div><dt>Company</dt><dd>${esc(data.company)}</dd></div>` : ''}
            <div><dt>Services</dt><dd class="qst-tags">${data.services.map(s => `<span>${esc(s)}</span>`).join('')}</dd></div>
            ${data.volume ? `<div><dt>Volume</dt><dd>${esc(data.volume)}</dd></div>` : ''}
          </dl>
        </div>
        <div class="qst-track" aria-label="Request progress">
          <div class="qst-step is-done"><div class="qst-bar"><span></span></div><p><i><svg viewBox="0 0 12 12"><path d="M2.5 6.2 5 8.6l4.6-5"/></svg></i>Received</p></div>
          <div class="qst-step is-live"><div class="qst-bar"><span></span></div><p><i></i>Under review</p></div>
          <div class="qst-step"><div class="qst-bar"><span></span></div><p><i></i>Your plan</p></div>
        </div>
        <div class="qst-actions">${btnHTML('Send another request', 'dark', ARROW, 'js-again')}${btnHTML('Back to home', 'ghost-dark', ARROW, '', 'a', 'index.html')}</div>`;
    } else {
      stateEl.innerHTML = `
        <div class="qst-head">
          <p class="qst-status"><i></i>Not sent</p>
          <h2 class="qst-title">That didn't go through.</h2>
          <p class="qst-text">Nothing is lost, your details are still saved. Try again, or reach our team directly.</p>
        </div>
        <div class="qst-alts">
          <a class="qst-alt" href="tel:+14165374427"><span class="ic"><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg></span><span><small>Call</small><b>+1 (416) 537-4427</b></span><span class="go">${GO}</span></a>
          <a class="qst-alt" href="mailto:info@shipnoble.com?subject=${encodeURIComponent('Quote request')}"><span class="ic"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5 12 13l8.5-6.5"/></svg></span><span><small>Email</small><b>info@shipnoble.com</b></span><span class="go">${GO}</span></a>
        </div>
        <div class="qst-actions">${btnHTML('Try again', 'dark', ARROW, 'js-retry')}</div>`;
    }
    stateEl.querySelector('.js-again')?.addEventListener('click', () => backToForm(true));
    stateEl.querySelector('.js-retry')?.addEventListener('click', () => backToForm(false));
  });
  if (success) fill.style.transform = 'scaleX(1)';
}
function backToForm(reset) {
  if (busy) return; busy = true;
  if (reset) {
    form.reset(); count.textContent = 0;
    form.querySelectorAll('.is-valid, .is-invalid').forEach(el => el.classList.remove('is-valid', 'is-invalid'));
    inlineNote(NOTE, false);
    // a fresh request starts again at step one
    panes[1].hidden = true; panes[0].hidden = false; step = 1; setDots(1); titleEl.textContent = TITLES[0];
  }
  swapPanels(stateEl, form, () => progress());
}
function inlineNote(text, isError) { note.textContent = text; note.classList.toggle('is-error', !!isError); }

form.addEventListener('input', () => { if (note.classList.contains('is-error')) inlineNote(NOTE, false); });
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return;
  // Enter on step one moves on rather than sending
  if (step === 1) { form.querySelector('.qform-next').click(); return; }
  const ok = [...panes[1].querySelectorAll('input[required]')].map(i => checkField(i, true)).every(Boolean);
  if (!ok) {
    inlineNote('Please complete the highlighted fields before sending.', true);
    const first = panes[1].querySelector('.is-invalid input');
    first && first.focus({ preventScroll: true });
    nudge(form.querySelector('.qform-submit'));
    return;
  }
  busy = true;
  const btn = form.querySelector('.qform-submit');
  btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
  const data = Object.fromEntries(new FormData(form)); data.services = servicesChosen();
  // Connect a real endpoint by setting data-endpoint on the form (e.g. WPForms / CRM webhook)
  const endpoint = form.dataset.endpoint;
  let sent = true;
  try {
    if (endpoint) { const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); sent = r.ok; }
    else await new Promise(r => setTimeout(r, 900));
  } catch (err) { sent = false; }
  btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
  busy = false;
  showState(sent ? 'success' : 'error', data);
  busy = true;
});

/* ---------- copy address ---------- */
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); } catch (e) {}
  const l = b.querySelector('[data-copy-label]'), t = l.textContent;
  b.classList.add('is-done'); l.textContent = 'Copied';
  setTimeout(() => { b.classList.remove('is-done'); l.textContent = t; }, 1800);
}));

/* ---------- smooth anchor scroll ---------- */
document.querySelectorAll('[data-scroll-to]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href')); if (!t) return;
  e.preventDefault();
  window.SN?.lenis ? window.SN.lenis.scrollTo(t, { offset: -90, duration: 1.6 }) : t.scrollIntoView({ behavior: 'smooth' });
}));

/* ---------- live Toronto clock ---------- */
const clock = document.querySelector('[data-clock]');
const tick = () => { clock.textContent = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Toronto' }).format(new Date()); };
tick(); setInterval(tick, 15000);

/* ---------- motion hooks once the shared engine is ready ---------- */
document.addEventListener('sn:ready', () => {
  const { PathBackground, NotchMask, animatedStrong, DIR, RM, isLg } = window.SN;
  const panel = document.querySelector('.ct-panel');
  // title: bold word sweeps faint → orange → white
  animatedStrong(document.querySelector('[data-ct-title]'), panel, { end: '#ffffff' });
  // glowing circuit inside the navy panel
  new PathBackground(document.querySelector('[data-panel-lines]'), { trigger: panel, stroke: '#ffffff', strokeOpacity: .12, duration: 3, layout: (w, h) => [
    [{ x: w, y: h * .1 }, { x: w * .78, y: h * .1, radius: 40 }, { x: w * .78, y: h * .3, radius: 50 }, { x: w * .92, y: h * .3, radius: 40 }, { x: w * .92, y: h * .55 }],
    [{ x: 0, y: h * .9 }, { x: w * .3, y: h * .9, radius: 40 }, { x: w * .3, y: h }],
    [{ x: w * .62, y: h }, { x: w * .62, y: h * .82, radius: 40 }, { x: w, y: h * .82 }]
  ] });
  // panel rows: icons draw in, redraw on hover
  document.querySelectorAll('.ct-row').forEach((a, i) => {
    const parts = a.querySelectorAll('.ct-ic svg > *');
    if (RM) return;
    gsap.fromTo(parts, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.2, ease: 'power2.inOut', delay: .3 + i * .12 });
    a.addEventListener('mouseenter', () => gsap.fromTo(parts, { drawSVG: '50% 50%' }, { drawSVG: '0% 100%', duration: .8, ease: 'expo.out', overwrite: true }));
  });
  // "what happens next": one glowing line through the step numbers
  const track = document.querySelector('.next-track');
  new PathBackground(document.querySelector('[data-next-line]'), { trigger: track, duration: 3.2, layout: (w, h) => isLg() || innerWidth >= 768 ? [[{ x: 0, y: 24 }, { x: w, y: 24 }]] : [] });
  // map card: notched edges that drift with scroll
  const top = { direction: DIR.top, offset: 28, position: .72, size: .32, notchWidth: .92, radius: 12 };
  const side = { direction: DIR.right, offset: 22, position: .35, size: .22, radius: 10 };
  new NotchMask(document.querySelector('[data-visit-mask]'), isLg() ? [top, side] : [top]);
  if (!RM) gsap.timeline({ scrollTrigger: { trigger: '.visit', start: 'top bottom', end: 'bottom top', scrub: true } })
    .fromTo(top, { position: .8 }, { position: .6, ease: 'none' }, 0)
    .fromTo(side, { position: .5 }, { position: .25, ease: 'none' }, 0);
  progress();
});
})();
