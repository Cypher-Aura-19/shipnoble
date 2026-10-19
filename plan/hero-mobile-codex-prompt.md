# Codex prompt: portrait (mobile) cab window for the home hero

Copy everything inside the block into Codex. Run it from `cargo/`.

```
Make a PORTRAIT version of the home-hero cab interior so a phone shows the WHOLE truck window, like the desktop does.
Do NOT write website code. Do NOT touch any existing file. Only add the new files listed under OUTPUT.
Follow the style lock and anti-slop rules in freight-journey/plan/05-rules.md (photographic, same camera, same light).

CONTEXT
The live hero is shipnoble-about/assets/hero. Look at these first, at 100%:
  shipnoble-about/assets/hero/img/cab-interior.webp          2560x1440 RGBA, window is a TRANSPARENT hole
  shipnoble-about/assets/hero/img/night/cab-interior.webp    the night twin, pixel-registered with the day one
The desktop window hole measures x 550-2011, y 263-1178 (about 1461 x 915, rounded corners, passenger window of a
truck cab, golden-hour, door handle and armrest on the right, grey-beige interior).
A phone is portrait, so the cover fit crops that window to a sliver of hills. I need the same cab, same window,
same light, same materials, re-composed for a 9:16 portrait frame so the entire window is visible edge to edge.

OUTPUT (new files only)
  shipnoble-about/assets/hero/img/cab-interior-portrait.webp          1440 x 2560, RGBA, day
  shipnoble-about/assets/hero/img/night/cab-interior-portrait.webp    1440 x 2560, RGBA, night, pixel-registered with the day file
  shipnoble-about/assets/hero/img/cab-interior-portrait.json         { "window": { "x0":..,"y0":..,"x1":..,"y1":.. } } measured from the alpha
  shipnoble-about/assets/hero/qa/portrait-day.png and portrait-night.png   the result composited over assets/hero/img/hills.webp (crop the hills to fit) so I can see it

COMPOSITION (1440 x 2560)
  - The window is a TRANSPARENT hole (alpha 0 inside, hard clean anti-aliased edge, rounded corners, no halo, no fringe).
  - Hole bounds: x 90-1350 (1260 wide) and y 760-1620 (860 tall), centred horizontally. Same rounded-rectangle shape
    and corner radius ratio as the desktop hole. The whole hole must be inside the frame with at least 90 px of
    seal and frame visible on EVERY side.
  - Above the window (y 0-760): the headliner, the A/B pillar trim, the sun-visor edge, the grab handle if it fits.
    It falls into soft shadow towards the top edge. The phone nav bar sits over the top 150 px, so keep that dark and quiet.
  - Below the window (y 1620-2560): door panel, window switches, armrest, door handle, speaker grille. This area is
    where white headline text and orange buttons sit, so keep it calm: mid-to-dark, low contrast detail, no bright
    highlights, no busy pattern. Fall off to about 30% luminance at the bottom edge.
  - Left and right edges: continue the seal and trim so nothing looks cropped or stretched.
  - Keep the golden light spilling in from the window onto the sill, the seal and the door panel, same direction and
    colour temperature as the desktop file.
  - The existing window falloff (interior darker away from the window, slightly warm near it) stays.

HOW TO BUILD IT
  - Reuse the real pixels of cab-interior.webp where they fit: the window seal, corner shapes, handle and armrest are
    cut from it and re-arranged. Extend the roof and door areas with a composite inpaint of the SAME materials.
    Do not invent a different truck. Do not re-render the whole image from scratch.
  - No text, no logos, no hands, no people, no mirror reflections of anything outside.
  - Night version: same geometry, same hole, the night grade of the desktop night file.
  - Do the perfection loop from 05-rules.md: view both outputs at 100%, check the hole edge at 400%, check that day and
    night alpha masks are identical, fix, repeat.

QA BEFORE YOU FINISH
  1. Alpha of the day and night files is identical.
  2. The hole is one connected transparent region and no semi-transparent haze is left inside it.
  3. The JSON bounds match the real alpha bounds to within 1 px.
  4. In the composite PNGs the hills fill the whole window with no gaps, and the bottom 900 px is calm enough for
     white 40 px text.
  5. List every file you wrote and nothing else.
```

## After Codex delivers

Send back the JSON bounds. The site then loads `cab-interior-portrait.webp` when the screen is portrait,
shifts the hills, guardrail, ground and dust layers so the horizon sits at the window's centre, and sets the glass
and dust rectangle to the new bounds. No other change is needed.
