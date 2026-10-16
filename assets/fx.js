/* ================= EFFECTS · the canvas grid and the travelling light =================
   Any element with [data-fx-grid="card|side|light"] (holding a <canvas>) gets the animated dot grid;
   any element with [data-fx-lines="<layout>"] gets rounded circuit lines with a glow running along them.
   Shared by the home page and the service pages. Needs site.js (window.SN) and runs once it is ready. */
(() => {
const GRID = {
  card: { mode: 'pulse', blobs: false, colors: { line: 'rgba(255,255,255,0.07)', rect: 'rgba(255,255,255,0.26)' } },
  side: { mode: 'pulse', blobs: true, colors: { line: 'rgb(226,229,234)', rect: 'rgb(178,184,194)' }, dark: { line: 'rgb(21,32,49)', rect: 'rgb(40,55,78)' } },
  light: { mode: 'pulse', blobs: true, colors: { line: 'rgb(228,230,234)', rect: 'rgb(186,190,198)' }, dark: { line: 'rgb(21,32,49)', rect: 'rgb(40,55,78)' } },
};
const r = 26;
const LAYOUTS = {
  card1: (w, h) => [[{ x: w * .56, y: 0 }, { x: w * .56, y: h * .34, radius: r }, { x: w, y: h * .34 }]],
  card2: (w, h) => [[{ x: w, y: h * .5 }, { x: w * .68, y: h * .5, radius: r }, { x: w * .68, y: 0 }]],
  card3: (w, h) => [[{ x: w * .42, y: 0 }, { x: w * .42, y: h * .24, radius: r }, { x: w * .84, y: h * .24, radius: r }, { x: w * .84, y: 0 }]],
  card4: (w, h) => [[{ x: w * .6, y: 0 }, { x: w * .6, y: h * .2, radius: r }, { x: w, y: h * .2 }]],
  card5: (w, h) => [[{ x: w, y: h * .38 }, { x: w * .5, y: h * .38, radius: r }, { x: w * .5, y: 0 }]],
  card6: (w, h) => [[{ x: w * .74, y: 0 }, { x: w * .74, y: h * .42, radius: r }, { x: w, y: h * .42 }]],
  sideL: (w, h) => [
    [{ x: 0, y: h * .18 }, { x: w * .46, y: h * .18, radius: 40 }, { x: w * .46, y: 0 }],
    [{ x: w * .16, y: h }, { x: w * .16, y: h * .84, radius: 40 }, { x: w * .78, y: h * .84, radius: 40 }, { x: w * .78, y: h }],
  ],
  sideR: (w, h) => [
    [{ x: w, y: h * .14 }, { x: w * .4, y: h * .14, radius: 40 }, { x: w * .4, y: 0 }],
    [{ x: w * .86, y: h }, { x: w * .86, y: h * .88, radius: 40 }, { x: w * .24, y: h * .88, radius: 40 }, { x: w * .24, y: h }],
  ],
  // the dock chapter: lines in the sky over the warehouse and the yard
  dock: (w, h) => [
    [{ x: w * .4, y: 0 }, { x: w * .4, y: h * .5, radius: 50 }, { x: w * .5, y: h * .5, radius: 50 }, { x: w * .5, y: h }],
    [{ x: w, y: h * .58 }, { x: w * .84, y: h * .58, radius: 50 }, { x: w * .84, y: h }],
  ],
  // service pages
  hero: (w, h) => [
    [{ x: w * .5, y: 0 }, { x: w * .5, y: h * .1, radius: 50 }, { x: w * .86, y: h * .1, radius: 50 }, { x: w * .86, y: h * .36, radius: 50 }, { x: w, y: h * .36 }],
    [{ x: 0, y: h * .44 }, { x: w * .1, y: h * .44, radius: 40 }, { x: w * .1, y: h * .2 }],
  ],
  floor: (w, h) => [
    [{ x: 0, y: h * .12 }, { x: w * .22, y: h * .12, radius: 50 }, { x: w * .22, y: 0 }],
    [{ x: w, y: h * .9 }, { x: w * .7, y: h * .9, radius: 50 }, { x: w * .7, y: h }],
  ],
  fig: (w, h) => [
    [{ x: 0, y: h * .2 }, { x: w * .16, y: h * .2, radius: 40 }, { x: w * .16, y: 0 }],
    [{ x: w, y: h * .78 }, { x: w * .86, y: h * .78, radius: 40 }, { x: w * .86, y: h }],
  ],
  cta: (w, h) => [
    [{ x: w * .55, y: 0 }, { x: w * .55, y: h * .3, radius: 50 }, { x: w * .9, y: h * .3, radius: 50 }, { x: w * .9, y: h * .75, radius: 50 }, { x: w, y: h * .75 }],
  ],
  quote: (w, h) => [[{ x: w * .58, y: 0 }, { x: w * .58, y: h * .3, radius: 40 }, { x: w * .86, y: h * .3, radius: 40 }, { x: w * .86, y: h * .7, radius: 40 }, { x: w, y: h * .7 }]],
  world: (w, h) => [
    [{ x: 0, y: h * .34 }, { x: w * .4, y: h * .34, radius: 50 }, { x: w * .4, y: h * .12, radius: 50 }, { x: w, y: h * .12 }],
    [{ x: w, y: h * .82 }, { x: w * .7, y: h * .82, radius: 40 }, { x: w * .7, y: h }],
  ],
};
const style = (key) => key.startsWith('card') ? { stroke: '#ffffff', strokeOpacity: .16, duration: 2.4 }
  : key === 'world' ? { stroke: '#ffffff', strokeOpacity: .2, duration: 3 }
  : { strokeOpacity: .15, duration: key === 'quote' ? 2.6 : 3 };

document.addEventListener('sn:ready', () => {
  const SN = window.SN;
  if (!SN || !SN.GridCanvas || !SN.PathBackground) return;
  document.querySelectorAll('[data-fx-grid]').forEach((el) => {
    const G = GRID[el.dataset.fxGrid] || GRID.light;
    const g = new SN.GridCanvas(el, G.mode, G.blobs);
    g.palette = { light: G.colors, dark: G.dark || G.colors }; g.setColors();
  });
  document.querySelectorAll('[data-fx-lines]').forEach((el) => {
    const key = el.dataset.fxLines;
    if (!LAYOUTS[key]) return;
    new SN.PathBackground(el, { layout: LAYOUTS[key], trigger: el.closest('section') || el, ...style(key) });
  });
});
})();
