# Landing journey: yard → road → airside → inside the hold

One scroll-driven anatomy illustration for the ShipNoble home page that joins the two references:
- **United Carriers (localhost:3000):** a reach stacker lifts a container, sets it on a truck trailer, and the loaded truck drives off.
- **Jesko Jets (localhost:8000):** a jet seen from above. On scroll, a gradient-mask wipe peels the skin away and shows its blueprint.

The two meet in one story: **the container ShipNoble loads at the yard is the one you find inside the plane's skeleton.**

## Style

- Anatomy kit, light theme, the same language as the service figures:
  - paper fills, 0.6 px lines, solids with four shades, bevels, screws and seams;
  - a halo under the base plate.
- One lit accent, ShipNoble orange, used as an outline only: our container (and the truck pulling it) is white with an orange border.
- One long diorama on a single base plate. The camera pans across it while you scroll, so you never cut between scenes.

## Placement on the home page

`Hero (cab → hills)` → `Creating value` statement → **this section** → Services list → …

- The section is pinned for about 5 screens of scroll.
- A slim caption rail on the left (desktop) shows four steps, each lighting up as its act plays. On mobile the captions sit under the figure.

## Storyboard (scroll progress 0 → 1)

| Act | Scroll | What you see | What moves (physics) |
|---|---|---|---|
| **1 · Load at the yard** | 0.00–0.28 | Container yard: stacks of containers, a reach stacker, a truck with an empty skeletal trailer waiting. | The stacker rolls to the stack, its boom lifts and telescopes, and the spreader grips our container. It lifts, swings, and lowers the container onto the trailer, settling with a small bounce. Twist-locks flash orange. |
| **2 · Hit the road** | 0.28–0.52 | Yard gate with a boom barrier, then a road curving out of the yard. | The camera starts following the truck. The barrier arm lifts, and the truck pulls out with eased acceleration and takes the curve. Its wheels and container stay square to the road (heading frames). |
| **3 · Transfer airside** | 0.52–0.72 | Cargo apron: a freighter jet seen from above, its side cargo door open, and a scissor-lift loader. | The truck parks beside the loader. The container slides onto the loader deck, the scissor lift rises to door height, and the container rolls into the hold. The cargo door closes. |
| **4 · Inside the hold** | 0.72–1.00 | The same jet. | A gradient wipe runs nose to tail and peels the skin away, Jesko style. Under it is the skeleton: fuselage frames, stringers, the floor grid, the wing spars and ribs, and the hold with containers seated in rows. Ours is outlined in orange. A final line closes the act: "Every mile, every mode." |

## Parts list (Hero size, about 110–140 solids)

| Group | Parts |
|---|---|
| **Yard** | Base plate on feet with corner screws; yard markings; two container stacks (2–3 high, corrugated sides, door ends with locking bars); a light mast. |
| **Reach stacker** | Chassis on four wheels, counterweight, cab with glass, boom pivot, two-stage telescoping boom, hydraulic ram, spreader with corner castings. |
| **Truck** | Tractor (cab, windows, grille, fuel tank, wheels) and a skeletal trailer (rails, bolsters, twist-lock dots, three axles). |
| **Our container** | 20 ft, corrugated sides drawn as faint ribs, doors with locking bars; white with an orange outline. |
| **Gate** | Guard booth, barrier post, lifting arm. |
| **Road** | Asphalt band with edge lines and centre dashes, curving from the yard to the apron. |
| **Apron** | A freighter seen from above at the anatomy angle. It has a fuselage, swept wings, engines on pylons, a tail and a side cargo door. Beside it are the scissor-lift loader (deck, scissor arms, base) and chocks. |
| **Skeleton** | Fuselage frames (rings), stringers, the floor beam grid, ULD containers in the hold, and wing spars and ribs. |

## How it is built

- `tools/fig-journey.mjs`, built with the anatomy kit. It renders two aligned layers of the plane: **skin** and **skeleton**. The skin sits in an SVG `<mask>` with a moving gradient, so the wipe is smooth and resolution-free.
- Moving parts are separate groups:
  - The stacker's boom angle uses about 24 pre-drawn frames (steps of 0.25 px or less, per the anatomy motion rules).
  - The truck uses heading frames, like the service figures.
  - The barrier, scissor lift and cargo door are driven by transforms.
- One GSAP ScrollTrigger timeline, pinned with `scrub`, drives everything:
  - the camera pan (a `translate` on the world group);
  - the act triggers;
  - the wipe.
- Reduced motion shows the four acts as four still frames.
- The phone view follows the action, like the zoom-and-follow on the service pages.

## Size and time

By the anatomy rules this is between **Hero** and **Epic**: several machines, a vehicle and a plane cutaway in one figure. The plan above is the **Hero** version, about 5–7 hours of build and verification.

The full Epic would add:
- a rotating 3D plane;
- a WebGL sky;
- wheels that turn;
- a take-off at the end.
