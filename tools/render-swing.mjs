// The camera swing (beat 4): the junction scene drawn at 48 elevations, from the side view (4°) to straight down (90°),
// for a landscape stage (1600 × 900, 4.2 px per dm) and a portrait one (900 × 1600, 3.9 px per dm).
// Frame 47 matches assets/story-top.svg exactly, so the page can hand over from the canvas to the live drawing.
// node tools/render-swing.mjs  → tools/out/swing/*.svg, view.html, shots.json; then it drives headless Chrome to
// capture each frame (the site must be served on :5507) and tools/swing-encode.py writes assets/story-swing/*.avif
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";
import { k } from "./fig-lib.mjs";
import { swingScene, J } from "./fig-story.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// --dark renders the night set (assets/story-swing-dark) with the site's dark stylesheet
const DARK = process.argv.includes("--dark");
const DIR = join(HERE, "out", DARK ? "swing-dark" : "swing");
mkdirSync(DIR, { recursive: true });
export const N = 48;
const smooth = (t) => t * t * (3 - 2 * t);
const ORIENTS = [
  { name: "land", W: J.W, H: J.H, K: J.K, scale: 1.6 },
  { name: "port", W: J.H, H: J.W, K: J.KP, scale: 1.2 },
];

const shots = [["wait", 1500]];
for (const o of ORIENTS) {
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), E = 4 + 86 * smooth(t);
    const svg = swingScene(E, { W: o.W, H: o.H, K: o.K, target: [82.75, J.LANE, 18 * (1 - t)], href: "/assets/logos/mark.png" });
    const f = `${o.name}-${String(i).padStart(2, "0")}`;
    writeFileSync(join(DIR, f + ".svg"), svg);
    shots.push(["eval", `show('${f}.svg', ${o.W}, ${o.H})`], ["wait", 120], ["shot", join(DIR, f + ".png").replaceAll("\\", "/"), "#f", o.scale]);
  }
}
const html = `<!doctype html><html${DARK ? ' data-theme="dark"' : ""}><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&display=swap" rel="stylesheet">
<style>${k.ISO_CSS}html,body{margin:0;background:${DARK ? "#0a1220" : "#f4f5f6"}}#f{position:absolute;left:10px;top:10px}#f svg{display:block;width:100%;height:100%}</style>
<link rel="stylesheet" href="/assets/story.css">${DARK ? '<link rel="stylesheet" href="/assets/theme-dark.css">' : ""}<link rel="stylesheet" href="/assets/dock-colors.css"></head><body class="iso" data-theme="light"><div id="f" class="st-colors"></div>
<script>window.show = async (name, w, h) => { const f = document.getElementById('f'); f.style.width = w + 'px'; f.style.height = h + 'px'; f.innerHTML = await (await fetch(name)).text(); await document.fonts.ready; return name; };</script></body></html>`;
writeFileSync(join(DIR, "view.html"), html);
writeFileSync(join(DIR, "shots.json"), JSON.stringify(shots));
console.log("wrote", ORIENTS.length * N, "frames");
if (!process.argv.includes("--no-shots")) {
  const drive = join(os.homedir(), ".claude/skills/anatomy/scripts/drive.mjs");
  const r = spawnSync(process.execPath, [drive, `http://localhost:5507/tools/out/${DARK ? "swing-dark" : "swing"}/view.html`, "--actions", join(DIR, "shots.json"), "--width", "1700", "--height", "1700", "--scale", "1"], { stdio: ["ignore", "ignore", "inherit"] });
  console.log("captured", r.status === 0 ? "ok" : "exit " + r.status);
}
