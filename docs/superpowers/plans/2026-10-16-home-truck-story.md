# Home Truck Story Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3/4-angle truck scene on the ShipNoble home page with a five-beat scroll story:
1. the truck arrives in side view;
2. it is loaded;
3. it drives through the services;
4. the camera swings overhead;
5. a top-view skeleton reveal plays beside the LMS.

**Architecture:**
- **Drawings:** the anatomy kit (`~/.claude/skills/anatomy/kit`) builds two orthographic SVG drawings (side and top) and a pre-rendered camera-swing frame sequence from one model in `tools/fig-story.mjs`.
- **Motion:** `assets/story.js` runs one pinned GSAP ScrollTrigger per beat. Each beat's state is a pure function of that beat's progress (0 → 1), so reverse scrolling is exact.
- **Page content:** the content that sat in the old `.hv`, `.jt`, `.hs` and `.ht` blocks moves into the beats.

**Tech Stack:**
- Node ESM build scripts using the anatomy kit (`iso-kit.mjs`, `lathe.mjs`) and the existing `tools/fig-lib.mjs` exports `k` and `G`.
- GSAP 3.13, ScrollTrigger and Lenis 1.3.4, already loaded by `index.html` and `assets/site.js`.
- Headless Chrome via `~/.claude/skills/anatomy/scripts/{capture,drive,lines}.mjs`.
- Python 3 with Pillow, for frame conversion and contact sheets.

## Global Constraints
- **Camera:**
  - side view at elevation 4°, azimuth 90° (orthographic elevation);
  - the swing goes from elevation 4° to 90°;
  - top view at elevation 90°.
- **Accent:** ShipNoble orange `#ff6a14` (`--c-accent`) is the only colour accent: the livery stripe, the pallet straps and the wipe scan line. Ink is `--c-ink` `#071b33`.
- **Branding goes only on:**
  - the trailer curtain (mark plus SHIPNOBLE wordmark);
  - the cab door (mark only);
  - the warehouse dock sign (mark plus wordmark);
  - the trailer roof in top view (wordmark).

  The mark is `assets/logos/mark.png`.
- **Copy:**
  - Stats are ShipNoble's published claims, verbatim: "3000K+ Shipments Fulfilled", "1000K+ Parcels Delivered", "10,000+ Satisfied Clients".
  - No em dashes anywhere in visible copy.
- **Anatomy craft rules:**
  - every line ends on a stroke, dot or outline (`lines.mjs` must print `line ends: 0`);
  - solids are filled; no wireframes; no floating labels other than the brand marks.
- **Motion rules:**
  - transforms and opacity only;
  - no `window.addEventListener('scroll')`; use ScrollTrigger plus the shared Lenis (`window.SN.lenis`);
  - drawing stops offscreen;
  - under `prefers-reduced-motion` each beat shows its final still and no pinning.
- **Not a git repository:** skip the commit steps; checkpoints are captures saved under `tools/out/story/`.

## File Structure
| File | Responsibility |
|---|---|
| `tools/fig-story.mjs` (create) | The model (dimensions, parts) and two renders: `assets/story-side.svg`, `assets/story-top.svg`, plus `assets/story.json`. |
| `tools/render-swing.mjs` (create) | Writes 48 SVG pages, one per elevation, to `tools/out/swing/`. It captures each with `capture.mjs` and converts the captures to `assets/story-swing/f00.webp` … `f47.webp`. |
| `assets/story.js` (create) | Loads the SVGs and JSON, wires the five beats and runs a single rAF render per beat. |
| `assets/home.css` (modify) | Appends a `/* ---------- story ---------- */` block. Deletes the old `.jt` block. |
| `index.html` (modify) | Swaps the `.hv`, `.jt`, `.hs` and `.ht` sections for the five beat sections. The `journey.js` script tag becomes `story.js`. |
| `tools/fig-truck.mjs`, `assets/journey.*` (delete) | The superseded scene. |

---

### Task 1: The side-view drawing

**Files:**
- Create: `tools/fig-story.mjs`
- Output: `assets/story-side.svg`, `assets/story.json`, `tools/out/story-side.html`

**Interfaces:**
- Produces: `assets/story.json` with the following fields.

| Field | Contents |
|---|---|
| `side.vb` | `[W, H]` |
| `side.o` | `[ox, oy]` |
| `side.ax`, `side.az` | Screen vectors per world unit along x (along the truck) and z (up). |
| `side.wheels` | `[{x, r}]` in truck-local x. |
| `side.slots` | `[x0..x3]`: the four pallet centres, truck-local. |
| `side.floor` | Trailer floor top z. |
| `side.curtain` | `{x0, x1, z0, z1}` |
| `side.truckLen` | Truck length. |

- Produces these SVG hooks: `[data-truck]`, `[data-wheel="i"]`, `[data-curtain-clip]` with `<clipPath id="st-curtain">`, `[data-forklift]`, `[data-forks]`, `[data-pallet="i"]`, `[data-cargo]`, `[data-dock-door]`.

**Model (world units, z up, x along the truck; side view looks along -y):**

| Part | Geometry |
|---|---|
| Ground | Line `z=0` from x −400 to 2400. Road band in beats 1–3. Dock platform x −40..0, z 0..22, with two lo bumpers. |
| Warehouse | x −360..−40, z 0..90; roll-up door x −220..−150, z 22..72 (`[data-dock-door]`); sign over the door with the mark (`<image href="assets/logos/mark.png">`, 14×14) and SHIPNOBLE (Geist 600, 9 px, ink). |
| Truck | Faces +x, rear at truck-local x 0 against the dock, front at x 196. |
| Trailer | x 0..150, floor z 22..25.5, roof z 66..69. Curtain z 25.5..66 with folds every 7.6. Orange stripe band z 31..35. Mark plus SHIPNOBLE wordmark centred at x 75, z 48 (mark 16, Geist 600, 14 px, ink). |
| Trailer gear | Landing legs at x 118; side guard x 40..100, z 9..14; mudflaps behind each axle group. |
| Tractor | Chassis rails x 120..196, z 10..15. Cab x 168..196, z 16..64: windscreen panel on the front face, side window x 180..192 / z 42..56, door seam, handle, mirror arm, steps, fuel tank (x 140..160, r 5), exhaust stack x 166 / z 16..70, roof fairing x 170..194 / z 64..72. |
| Door mark | The cab door gets the mark only (10×10). |
| Wheels | Tractor x 186, 156, 145; trailer x 24, 37, 50. r 9; hub r 5; 6 bolts. |
| Forklift | Seen in profile, facing +x (toward the cab), local x 0 is the fork heel. The forks run x 0..22, the mast is x −3..0 at z 0..34, the body x −24..−3, the counterweight x −28..−22, the overhead guard roof z 30 and the wheels r 4. |
| Pallets | Four pallets: base 22 long × 2.6 high, load 20 high, two orange strap lines each. |

**How loading works.** This is real dock loading:
1. The truck reverses in from the right with its rear against the dock.
2. The curtain draws back, so the trailer is open to view like a cutaway.
3. The forklift carries each pallet out of the warehouse door, across the dock plate and in through the rear into the trailer.
4. It sets the pallet down and backs out. The first pallet goes nearest the cab (slots run front to rear).

All of this is motion along x, so it reads perfectly in profile. Draw order:
- the inside of the trailer (back wall and floor) is drawn behind the forklift and the pallets;
- the rear frame posts are drawn in front of them.

**Beat 1:** the truck reverses in from the right; the white reversing lamps glow.

- [ ] **Step 1:** Write `tools/fig-story.mjs` with:
  - the model constants above;
  - helper `box(x0,x1,y0,y1,z0,z1,style)` (as in `tools/fig-truck.mjs`);
  - `scene('side')` using `k.fitProjection(points, 1600, 760, { pad: 40, azimuth: 90, elevation: 4 })`;
  - the SVG layer order: ground → warehouse → dock → truck (far wheels, base, cargo, skin with curtain clip, near wheels) → forklift → pallets-in-transit.
- [ ] **Step 2:** Run `node tools/fig-story.mjs`.
  - Expected: it prints `wrote story-side.svg <N> KB` and writes `assets/story.json`.
- [ ] **Step 3:** Capture the preview:
  ```
  node ~/.claude/skills/anatomy/scripts/capture.mjs tools/out/story-side.html --out tools/out/story/side.png --scale 1 --width 1600 --height 900
  ```
  - Read the PNG.
  - Expected: a large side-on truck reading clearly as a cab-over plus curtain-sider, with the brand on the curtain and the cab door, and the dock and warehouse behind it.
- [ ] **Step 4:** Run `node ~/.claude/skills/anatomy/scripts/lines.mjs tools/out/story-side.html`.
  - Expected: `line ends: 0`.
  - Fix any listed ends by making them land on an outline.

### Task 2: The top-view drawing

**Files:**
- Modify: `tools/fig-story.mjs` (adds `scene('top')`)
- Output: `assets/story-top.svg`, plus `top` added to `assets/story.json`

**Interfaces:**
- Produces in `story.json`:
  - `top.vb`, `top.o`;
  - `top.ax`, `top.ay` (screen vectors per world unit);
  - `top.path`: the truck's junction route as world `[x, y]` points (resampled at a 2-unit step);
  - `top.headingFrames: 16`.
- Produces these SVG hooks:
  - `[data-top-truck]` containing `[data-v="i"]` heading variants, each holding skin `[data-skin]` and skeleton `[data-bones]`;
  - `<mask id="st-wipe">` with `<linearGradient data-wipe-grad>`;
  - `[data-scan]`.

**Model:**

| Element | Geometry |
|---|---|
| Junction | Main road along x (y −22..22). A side road along +y from x 600 (x 578..622). Lane lines are flat slabs (no free lines). |
| Truck route | `[[−200, 0], [560, 0], arc R 40 to [600, 40], [600, 260]]` |
| Skin, from above | Cab roof with fairing, trailer roof with the SHIPNOBLE wordmark along x (Geist 600, 18 px, ink) and the orange stripe at the roof edge, mirrors, and wheel edges peeking out. |
| Skeleton | Two frame rails, cross members every 10, the fifth-wheel disc, axle beams with springs, landing legs, the curtain stanchions as dots on the rails, and the four pallets with orange straps. |

- [ ] **Step 1:** Add `scene('top')` with `elevation: 90` and the mover heading variants. Use `fig-lib`'s `movers()` pattern, building the skin and the skeleton in each variant.
- [ ] **Step 2:** Run `node tools/fig-story.mjs`.
  - Expected: it writes `story-top.svg`.
- [ ] **Step 3:** Capture `tools/out/story-top.html` to `tools/out/story/top.png` and read it.
  - Expected: a clean plan view of the junction, with the truck reading from above.
- [ ] **Step 4:** Run `lines.mjs` on `tools/out/story-top.html`.
  - Expected: `line ends: 0`.

### Task 3: The camera-swing frames

**Files:**
- Create: `tools/render-swing.mjs`
- Output: `assets/story-swing/f00.webp` … `f47.webp`

**Interfaces:**
- Consumes: the model in `tools/fig-story.mjs`, exported as `export function drawModel(P, { mode })`, where `mode` is `'skin'`.
- Produces: 48 frames at 1440×700. Frame `i` is elevation `4 + (86 * i / 47)`°. Each frame is framed so the truck centre stays put.

- [ ] **Step 1:** Write `render-swing.mjs`. For each `i`, it builds `P` with `fitProjection` (azimuth 90, the elevation above, the same framing points) and writes `tools/out/swing/f{i}.html` with `k.pageHtml`.
- [ ] **Step 2:** Capture each frame with `capture.mjs --scale 1 --width 1440 --height 700 --select .iso-stage`, then convert to WebP at quality 82 with Pillow.
- [ ] **Step 3:** Make a contact sheet of frames 0, 12, 24, 36 and 47 and read it.
  - Expected: a smooth, continuous camera tilt from side to overhead, with no jumps in framing.

### Task 4: Beats 1–2 (arrival and loading) in the page

**Files:**
- Create: `assets/story.js`
- Modify: `index.html`. Replace the `<section class="hv">` and `<section class="jt">` blocks with `<section class="st st--arrive" data-beat="arrive">` and `<section class="st st--load" data-beat="load">`.
- Modify: `assets/home.css`. Remove the `.jt` block and add the `.st` styles.

**Interfaces:**
- Consumes: `story.json` `side.*`; the SVG hooks from Task 1.
- Produces:
  - `const beats = { arrive, load, drive, swing, top }`, each `{ el, render(u) }`;
  - `window.__st(beat, u)`, a test hook that holds a beat at progress `u`.

**Beat 1, arrive** (not pinned; progress runs from the section top hitting the bottom of the viewport until it hits the top):
- The truck x eases from +420 (offscreen right, reversing) to 0 with `smooth()`.
- The stats count up from 0 to their value when 30% of the section is visible.

**Beat 2, load** (pinned for `innerHeight * 3`), as fractions of `u`:

| Range | What happens |
|---|---|
| 0–0.1 | The curtain clip shrinks from the rear (x0) toward the front (x1 − 6). |
| 0.1–0.9 | Pallets 0..3, each taking 0.2. For each one the forklift picks it up inside the warehouse door (forks rise 3), drives along x through the rear into the trailer to the slot (front slot first), lowers it to the floor, then reverses back to the door. |
| 0.9–1 | The curtain closes. |

The counter shows `placed / 4`.

- [ ] **Step 1:** Write the markup for both sections:
  - **arrive:** left `h2` "We move freight. We own the outcome." plus `p.data-reveal` (the value statement); right three `.st-stat` blocks with `data-count`.
  - **load:** a sticky `.st-pin` holding `.st-stage` (the side SVG), left `h3` "Loaded with care" with one line, right `.st-counter`.
- [ ] **Step 2:** Write `story.js`:
  - fetch the SVGs and JSON and insert them;
  - give each beat a pure `render(u)`;
  - create one ScrollTrigger per beat (`pin` only for load, swing and top), with `onUpdate` → `set(u)`;
  - add exponential follow (τ 0.18 s) and the hold hook `window.__st`.
- [ ] **Step 3:** Run `drive.mjs` on `http://localhost:5507/index.html` with `__st('arrive', 0 / 0.5 / 1)` and `__st('load', 0 / 0.05 / 0.3 / 0.5 / 0.7 / 0.95 / 1)`, shooting `[data-beat="load"] .st-pin`, then make a contact sheet.
  - Expected:
    - the truck slides in to the dock;
    - the curtain draws back;
    - the pallets appear in the bed one by one;
    - the curtain closes;
    - the counter reads 0 → 4.

### Task 5: Beat 3 (drive through the services)

**Files:**
- Modify: `index.html`. Replace `<section class="hs">` with `<section class="st st--drive" data-beat="drive">`, keeping the six service links.
- Modify: `assets/story.js`, `assets/home.css`

**Interfaces:**
- Consumes: the side SVG, which is cloned for this beat (the same model, truck closed).
- Produces: the `drive` beat.

**Behaviour** (pinned for `innerHeight * 2.5`):
- The section background goes from `#fff` to `var(--c-ink)` over the first 15%.
- The truck moves across the viewport, x from −0.2·vw to 1.1·vw in world units, and the wheels turn by distance / r.
- The outline wordmark `.st-marquee` (SHIPNOBLE, 22vw, `-webkit-text-stroke: 1px rgba(255,255,255,.18)`, transparent fill) moves its translateX from 10% to −60%.
- The services grid (two columns of three) sits below the road band and enters with `data-enter`.

- [ ] **Step 1:** Write the markup and CSS. The road band is a dark slab under the truck, with lane dashes as `<span>`s scaled from CSS.
- [ ] **Step 2:** Write `drive.render(u)` in `story.js`.
- [ ] **Step 3:** Capture at u = 0, 0.3, 0.6 and 1 and read them.
  - Expected: the ink background, the truck crossing, the moving word behind it and the services below, with no overlap glitches.

### Task 6: Beat 4 (the camera swing)

**Files:**
- Modify: `index.html` (adds `<section class="st st--swing" data-beat="swing">` after drive), `assets/story.js`, `assets/home.css`

**Behaviour** (pinned for `innerHeight * 1.6`):
- A canvas draws frame `round(u * 47)` with cover-fit.
- All 48 frames are preloaded with `createImageBitmap` when the beat comes within 1 viewport.
- The heading "Reliability at every turn." fades in over 0.6–0.9.

- [ ] **Step 1:** Write the markup, canvas and preload code.
- [ ] **Step 2:** Capture at u = 0, 0.5 and 1.
  - Expected: side, mid-tilt and overhead, matching the first frame of the top beat.

### Task 7: Beat 5 (top view and skeleton beside the LMS)

**Files:**
- Modify: `index.html`. Replace `<section class="ht">` with `<section class="st st--top" data-beat="top">`, moving its content (title, text, three capabilities, link) beside the stage.
- Modify: `assets/story.js`, `assets/home.css`

**Behaviour** (pinned for `innerHeight * 3`):

| Range | What happens |
|---|---|
| 0–0.45 | The truck follows `top.path` (arc-length interpolation, heading variant chosen from the tangent). |
| 0.5–0.9 | The wipe gradient x moves from the cab to the tail. Under it the skin is masked away to show the skeleton, and the scan line follows the edge. |
| 0.85–1 | The page background lightens to `#f5f5f3`. |

The LMS copy sits on the left and the capabilities list on the right (desktop); on mobile they stack under the stage.

- [ ] **Step 1:** Write the markup and CSS.
- [ ] **Step 2:** Write `top.render(u)`.
- [ ] **Step 3:** Capture at u = 0, 0.25, 0.45, 0.6, 0.75, 0.9 and 1.
  - Expected:
    - the truck takes the turn smoothly;
    - the blueprint sweeps across;
    - the pallets and frame read clearly, and the LMS copy sits beside them.

### Task 8: Cleanup, reduced motion, phone, final pass

**Files:**
- Delete: `tools/fig-truck.mjs`, `assets/journey.js`, `assets/journey.svg`, `assets/journey.json`, `assets/journey-pallet.svg`, `journey-preview.html`
- Modify: `index.html` (the script tag `journey.js` becomes `story.js`), `assets/story.js` (reduced motion, phone follow), `assets/home.css`

- [ ] **Step 1:** Reduced motion: when the media query matches, skip pinning and render every beat at u = 1.
- [ ] **Step 2:** Phone (390 px wide):
  - side stages scale the SVG ×1.8 and translate to keep the truck centred (the same follow math as `assets/service.js`'s `follow()`);
  - stats and services stack.
- [ ] **Step 3:** Delete the superseded files and the preview, then `grep -n "journey" index.html assets/*.js`.
  - Expected: only the hero's `data-journey` (the freight hero) remains.
- [ ] **Step 4:** Full pass:
  - run `drive.mjs` across every beat at desktop (1440×810) and phone (390×844);
  - run `lines.mjs` on both views;
  - read every capture.
  - Expected: no glitches, 0 line ends, and the story reads in order.
