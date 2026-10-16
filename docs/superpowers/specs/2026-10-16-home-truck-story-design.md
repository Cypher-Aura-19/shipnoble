# Home page truck story: design

Approved in conversation on 2026-10-16. It replaces the 3/4-angle "From our dock to the open road" scene (`assets/journey.js` and `tools/fig-truck.mjs`).

## Goal
After the hero (cab → hills), the home page tells one story with a ShipNoble truck: **loaded at our dock → drives through our services → the camera swings overhead → the truck's skeleton is revealed beside the LMS.**

The page's own sections ride alongside the truck on the left and right, the way the United Carriers and Jesko Jets references do. The motion is clean and scrubbed by scroll, with no glitches.

## Camera
- **Side view** (orthographic elevation, about 4° above the ground) for the arrival, the loading and the drive. The truck is large and crosses the screen.
- **A camera swing** from side to top (elevation 4° → 90°). It is a pre-rendered frame sequence of the same anatomy model and plays on a canvas, scrubbed by scroll.
- **Top view** (straight down) for the junction turn and the skeleton wipe.

## Beats (in page order after the hero)

| Beat | Background | Truck | Page content beside it |
|---|---|---|---|
| **1. Arrival** | White | Rolls in from the left in side view and stops at the dock. | Left: "We move freight. We own the outcome." plus the value statement. Right: three count-up stats (3,000K+ shipments fulfilled, 1,000K+ parcels delivered, 10,000+ satisfied clients). These are ShipNoble's own published claims. |
| **2. Loading** (pinned) | White | The side curtain draws back along the trailer. A side-view forklift lifts four pallets in, one after another, and the curtain closes. | Left: "Loaded with care". Right: a pallet counter, 1–4 / 4. |
| **3. Drive and services** | The page turns navy (`--c-ink`) | Drives right along a road band, wheels turning. | Behind: a giant outline "SHIPNOBLE" word moves with the scroll (the page's only marquee). Below: the six services in two columns, each a link. |
| **4. Camera swing** (pinned) | Navy | The canvas frame sequence goes from side to top. | "Reliability at every turn." |
| **5. Top view and skeleton** (pinned) | Navy turning to light | In top view, the truck takes a junction turn and stops. A blueprint wipe crosses it and shows the frame rails, axles, fifth wheel and the four pallets in the bed. | The LMS section: "Your logistics, visible end to end." plus three capabilities, on the left and right. |
| **6.** | – | – | The existing sections continue: Why ShipNoble, testimonials, worldwide, footer. |

## Branding (only where it belongs)
- **Trailer curtain, side view:** the mark plus the SHIPNOBLE wordmark, with the orange livery stripe. This is the main brand surface.
- **Cab door, side view:** a small mark only.
- **Warehouse:** one sign over the dock with the mark and wordmark.
- **Trailer roof, top view:** the wordmark, as fleets do for overhead identification.

Nowhere else: no logos on wheels, pallets, forklift or road.

## Drawing (anatomy craft)
- Line art in the light theme: paper fills, shaded solids, real parts and seams, and screws drawn as dots. Every line ends on something.
- ShipNoble orange is the single accent: the livery stripe, the pallet straps and the wipe's scan line.
- **Side view parts:**
  - **Cab:** a cab-over with windscreen and side window, door seam and handle, grille, lights, bumper, mirror, steps, fuel tank, exhaust stack and roof fairing.
  - **Chassis and running gear:** chassis rails and wheels with hubs and turning bolts.
  - **Trailer:** a curtain-sider with rails, roof, bulkhead, landing legs, side guard and mudflaps.
  - **Forklift:** mast, carriage, forks, overhead guard and counterweight.
  - **Dock:** platform, bumpers, roll-up door and sign.
- **Top view parts:**
  - **Road:** a junction with lane lines.
  - **Truck skin:** the cab roof, trailer roof with wordmark, mirrors and wheels peeking out.
  - **Skeleton (blueprint):** rails, cross members, axles, fifth wheel, landing legs and four pallets.

## Build
| File | Job |
|---|---|
| `tools/fig-story.mjs` | The model and both views. Writes `assets/story-side.svg`, `assets/story-top.svg` and `assets/story.json`. |
| `tools/render-swing.mjs` | Renders the side→top frames (about 48, WebP) into `assets/story-swing/`, using headless Chrome from the anatomy scripts. |
| `assets/story.js` | The beats. One pinned GSAP ScrollTrigger timeline per beat. Each part's state is a pure function of that beat's progress, so scrolling backwards is exact. Shared Lenis from `site.js`. |
| `assets/home.css` | The story styles, appended to the existing home styles. |
| `index.html` | The story sections replace the current `.hv`, `.jt`, `.hs` and `.ht` blocks (their content moves into the beats). |

## Quality and testing
- **Captures:** headless captures at about 30 checkpoints across the beats, read at 1× and zoomed.
- **Line check:** `lines.mjs` reports 0 floating ends on both views.
- **Reduced motion:** each beat shows its final still, with no pinning.
- **Phone (390 px):**
  - the side view zooms and follows the truck;
  - the stats and services stack;
  - the swing frames are cover-fit.
- **Performance:**
  - transforms only;
  - the frame sequence is preloaded at 1440 px wide;
  - drawing stops offscreen.
