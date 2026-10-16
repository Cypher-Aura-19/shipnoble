// The dark theme, generated: every colour in the site's stylesheets is carried onto the night-navy palette by
// what it does (a page or card surface, a hairline, text, a shadow, an illustration fill, the orange accent), and
// written out as :root[data-theme="dark"] overrides. Hand-tuned rules (tokens, brand blocks, the illustration kit)
// come from tools/dark-manual.css and are appended last so they win.
// node tools/make-dark.mjs → assets/theme-dark.css      (re-run whenever a stylesheet changes)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const FILES = ["site.css", "home.css", "story.css", "fx.css", "service.css", "contact.css"];
const P = ':root[data-theme="dark"]';

/* ---------- colour helpers ---------- */
const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };
const parse = (s) => {
  s = s.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s].slice();
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    const n = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    return [...n, h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) { let a = m[4] === undefined ? 1 : m[4].endsWith("%") ? parseFloat(m[4]) / 100 : +m[4]; return [+m[1], +m[2], +m[3], a]; }
  return null;
};
const hsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
};
const rgbOf = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
};
const out = ([r, g, b, a = 1]) => (a >= 0.999 ? "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("") : `rgba(${r},${g},${b},${+a.toFixed(3)})`);
const NAVY = 214;
const PAGE = "#0b1424";                                         // the night palette's hue
const navyL = (l, s = 0.3) => rgbOf(NAVY, s, Math.max(0, Math.min(1, l)));

/* ---------- roles ---------- */
const TEXTY = /^(color|caret-color|outline(-color)?|text-decoration(-color)?|-webkit-text-stroke(-color)?|text-shadow|column-rule(-color)?)$/;
const SHADOW = /^(box-shadow|filter|-webkit-filter)$/;
// parts that stay dark at night: roads and belts, section cuts, screens, door openings, the brand panels
const DEEP = /(road|belt|band|st-cut|screen|door-open|wn-door|wn-photo-door|ls-bp|b2-door|st-earth|ec-ui|ls-van|wh-opening|st-lot|ap-chip|ct-panel|nav-bg|footer|f-wrap|np-|lmsx|ls-check-bg|is-done \.b2-chip|b2-sign-line|ec-led|st-hole|ec-hub)/;
const ILLU = /(iso-|st-svg|ec-svg|ls-svg|rt-svg|wn-svg|wh-svg|b2-svg|fp-svg|\.st-|\.ec-|\.ls-|\.rt-|\.wn-|\.wh-|\.b2-|\.fp-)/;

function mapColor(col, prop, sel) {
  const c = parse(col); if (!c) return null;
  const [r, g, b, a] = c, [h, s, l] = hsl(c);
  // the orange accent: a touch brighter so it carries on navy; glows a little softer
  // pale warm tints (cardboard, peach washes) become a muted kraft at night, not orange
  if (h >= 8 && h <= 48 && l > 0.8 && s > 0.15) { const [nr, ng, nb] = rgbOf(h, Math.min(0.32, s * 0.45), a < 1 ? 0.5 : 0.27); return out([nr, ng, nb, a]); }
  if (s > 0.55 && h >= 8 && h <= 40 && l > 0.35) {
    const [nr, ng, nb] = rgbOf(h, Math.min(1, s), Math.min(0.66, l + 0.04));
    return out([nr, ng, nb, a < 1 ? a * 0.88 : a]);
  }
  const neutral = s < 0.4 || (h >= 190 && h <= 240);
  if (!neutral) { const [nr, ng, nb] = rgbOf(h, s * 0.9, Math.min(0.78, l + 0.08)); return out([nr, ng, nb, a]); }   // greens, reds, other hues
  // the blueprint stays blueprint blue at night
  if (/(st-bp|st-bones|ls-bp)/.test(sel) && !TEXTY.test(prop)) return null;
  const deep = DEEP.test(sel), illu = ILLU.test(sel);
  // shadows stay shadows: deeper, pure black
  if (SHADOW.test(prop) || prop === "box-shadow") return l < 0.5 ? out([0, 0, 0, Math.min(1, a * 1.9 + 0.04)]) : out([...navyL(0.2), a * 0.4]);
  // translucent colours: navy tints become light tints, white highlights on dark panels stay highlights
  if (a < 0.999) {
    if (TEXTY.test(prop) && l >= 0.5) return null;                              // light text with some transparency: keep
    // a strong navy wash over a photo is a scrim: it keeps darkening
    if (l < 0.5 && /^background/.test(prop) && (a >= 0.3 || /(shade|scrim|overlay|vignette)/.test(sel))) return out([4, 9, 18, Math.min(1, a * 1.05)]);
    if (l < 0.5) return deep && !TEXTY.test(prop) ? out([...navyL(0.03), Math.min(1, a * 1.2)]) : out([226, 233, 242, Math.min(1, a * (prop.startsWith("border") || prop === "stroke" ? 1.05 : 0.95))]);
    if (a < 0.5) return null;                                                   // a light highlight: keep
    if (!/^background/.test(prop)) return null;                                 // light lines and paint on dark parts: keep
    return out([...navyL(0.12 + (1 - l) * 0.9, 0.36), a]);                       // a frosted light surface → a night surface
  }
  // text: dark ink turns light, light text stays light
  if (TEXTY.test(prop)) {
    if (l < 0.45) return out(navyL(0.94 - l * 0.55, 0.28));
    return out(navyL(Math.min(0.92, l * 0.98), 0.14));
  }
  // illustration paint: fills and strokes swap ends of the scale so parts keep their contrast
  if (prop === "fill" || prop === "stroke" || prop === "stop-color" || prop === "flood-color") {
    if (deep) return out(navyL(Math.min(0.09, l * 0.5), 0.45));
    if (illu || prop === "stroke") return out(navyL(l < 0.5 ? 0.86 - l * 0.6 : 0.1 + (1 - l) * 0.95, 0.3));
  }
  // surfaces: white is a night card, the greys step up from it; brand navy blocks stay dark, a shade apart
  if (l > 0.985) return PAGE;                                                    // white is the page itself at night
  if (l >= 0.5) return out(navyL(0.115 + (0.985 - l) * 0.95, 0.36));
  if (deep) return out(navyL(Math.max(0.045, l * 0.55), 0.48));
  if (prop.startsWith("border")) return out([226, 233, 242, 0.12]);
  return out(navyL(0.14 + l * 0.35, 0.4));
}
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|\b(white|black)\b/g;
const mapValue = (val, prop, sel) => {
  let changed = false;
  // the ink token turns light at night (it is mostly text); where it paints a block, the block stays deep navy
  if (/var\(--c-ink\)/.test(val) && /^(background(-color)?|fill)$/.test(prop)) { val = val.replace(/var\(--c-ink\)/g, 'var(--c-ink-deep)'); changed = true; }
  const v = val.replace(COLOR_RE, (m) => {
    if (/var\(/.test(m)) return m;
    const n = mapColor(m, prop, sel); if (!n || n === m) return m; changed = true; return n;
  });
  return changed ? v : null;
};

/* ---------- a small css parser: rules, @media/@supports blocks, @keyframes ---------- */
function blocks(css) {
  const items = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i); if (open < 0) break;
    const head = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === "{") depth++; else if (css[j] === "}") depth--; j++; }
    items.push({ head, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return items;
}
const decls = (body) => body.split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean).map((d) => { const k = d.indexOf(":"); return [d.slice(0, k).trim().toLowerCase(), d.slice(k + 1).trim()]; }).filter(([k]) => k && !k.startsWith("--"));
const splitTop = (sel) => { const out = []; let d = 0, cur = ""; for (const ch of sel) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
const scope = (sel) => splitTop(sel).map((s) => {
  s = s.trim();
  if (/^(html|:root)\b/.test(s)) return s.replace(/^(html|:root)/, `html[data-theme="dark"]`);
  return `${P} ${s}`;
}).join(",");

const onlyGradients = (v) => { let d = 0, rest = ""; for (let i = 0; i < v.length; i++) { const c = v[i]; if (c === "(") d++; if (d === 0) rest += c; if (c === ")") d--; } return /gradient/.test(v) && /^[s,]*((repeating-)?(linear|radial|conic)-gradient[s,]*)+$/.test(rest); };
const lines = [];
const kfRenames = new Map();
function walk(css, wrap) {
  for (const { head, body } of blocks(css)) {
    if (head.startsWith("@keyframes")) {
      const name = head.split(/\s+/)[1];
      const frames = blocks(body).map(({ head: fh, body: fb }) => {
        const ds = decls(fb).map(([k, v]) => [k, mapValue(v, k, "@kf " + name) ?? v]);
        return `${fh}{${ds.map(([k, v]) => `${k}:${v}`).join(";")}}`;
      }).join("");
      if (frames !== blocks(body).map(({ head: fh, body: fb }) => `${fh}{${decls(fb).map(([k, v]) => `${k}:${v}`).join(";")}}`).join("")) {
        kfRenames.set(name, name + "-dk"); lines.push(`@keyframes ${name}-dk{${frames}}`);
      }
      continue;
    }
    if (head.startsWith("@media") || head.startsWith("@supports")) { const inner = []; const save = lines.length; walk(body, (l) => inner.push(l)); if (inner.length) lines.push(`${head}{${inner.join("")}}`); continue; }
    if (head.startsWith("@")) continue;
    const ds = []; const sel = head;
    for (const [k, v] of decls(body)) {
      const n = mapValue(v, k, sel);
      // a background made only of gradients is written as background-image, so the rule keeps its size and position
      if (n) ds.push(`${k === "background" && onlyGradients(v) ? "background-image" : k}:${n}`);
      if ((k === "animation" || k === "animation-name")) for (const [from, to] of kfRenames) if (new RegExp(`\\b${from}\\b`).test(v)) ds.push(`${k}:${v.replace(new RegExp(`\\b${from}\\b`), to)}`);
    }
    if (ds.length) (wrap || ((l) => lines.push(l)))(`${scope(sel)}{${ds.join(";")}}`);
  }
}
// keyframes are declared before the rules that use them in these files; a first pass collects them
for (const f of FILES) { const css = readFileSync(join(ROOT, "assets", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""); blocks(css).filter((b) => b.head.startsWith("@keyframes")).forEach(() => {}); }
for (const f of FILES) {
  const css = readFileSync(join(ROOT, "assets", f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  // keyframes first so the rules can be renamed onto their dark copies
  const kf = blocks(css).filter((b) => b.head.startsWith("@keyframes")).map((b) => `${b.head}{${b.body}}`).join("");
  walk(kf);
  lines.push(`/* ${f} */`);
  walk(css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, ""));
}
const manual = readFileSync(join(HERE, "dark-manual.css"), "utf8");
writeFileSync(join(ROOT, "assets", "theme-dark.css"), `/* generated by tools/make-dark.mjs — edit tools/dark-manual.css for hand-tuned rules */\n${lines.join("\n")}\n\n/* ---------- hand-tuned ---------- */\n${manual}`);
console.log("wrote theme-dark.css", lines.length, "rules,", kfRenames.size, "keyframes");
