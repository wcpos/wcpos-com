# Runbook: generating the scroll-story artwork

How to produce the hyper-real assets that replace the CSS device bodies and
the Act 1 counter scene on the homepage scroll story (ADR 0012). Written so
the owner (or an agent session with image-gen access) can execute it
end-to-end. Components already expose the slots; dropping files in and
swapping classes is the only code change.

## Scene bible (every prompt inherits this)

- **Camera:** true top-down (90°, orthographic feel, no wide-angle
  distortion) for counter/Act-1 assets; straight-on frontal orthographic for
  Act 2–3 device renders. No perspective convergence — CSS 3D supplies it.
- **Lighting:** one warm key light from the upper-left (morning window,
  ~3200K), soft shadows falling lower-right, gentle falloff. No hard flash,
  no rim-light halos.
- **Grade:** premium 3D product render (Apple hardware page / Stripe
  Terminal), *not* photographic grain — idealized materials, crisp contact
  shadows, warm coffee-shop cast on Act 1 assets, neutral-cool on Act 2–4
  device renders (they sit on the slate studio background `#0f172a–#1e293b`).
- **Style words that work:** "high-end product render, octane, soft studio
  key light upper left, physically based materials, clean contact shadow,
  4k". Avoid: "photo, dslr, bokeh, lens" (drags grain/DOF in).
- **Brand:** the tablet/phone/laptop screens stay BLACK/OFF or are cropped
  out — live DOM screens overlay them. Accent color if needed: #cd201f.

## Tools

- **Stills:** Nano Banana Pro (Gemini image), Midjourney v7, or Imagen 4
  Ultra — whichever the owner has handy. Nano Banana Pro is best at
  instruction-following for layout ("tablet lying flat, screen off, centered
  lower third"); Midjourney has the best material feel.
- **Transparent cutouts:** Recraft (native transparent background) or
  generate on neutral gray + remove (Photoshop "Remove background" or
  `rembg`). Inspect edges at 200% — halos show instantly on the slate stage.
- **Video loop (phase 3):** Veo 3.1 / Runway Gen-4 / Kling 2.x image-to-video
  from the approved master still. Prompt only ambient motion: steam rising,
  light shifting subtly, receipt paper trembling. Lock the camera ("static
  locked-off shot, no camera movement"). 8s, loop-point it (crossfade last
  0.5s in any editor, or generate with first/last frame pinned).

## Shot list

| # | Asset | View | Drops into |
|---|-------|------|------------|
| 1 | Master still: timber counter with tablet (screen off) lower-center, payment terminal upper-left, receipt printer (paper mid-print) upper-right, barcode scanner right, espresso cup + saucer lower-right, napkin, scattered beans | top-down | Act 1 background layer (`PinnedStoryScroller` warm background slot); also the LCP poster |
| 2 | Tablet body, dark slate bezel | frontal | `devices/tablet.tsx` bezel |
| 3 | Phone body | frontal | `devices/phone.tsx` bezel |
| 4 | Laptop body (lid + base, screen area black) | frontal | `devices/laptop.tsx` |
| 5 | Payment terminal, screen area black, keypad visible | frontal | `devices/terminal.tsx` |
| 6 | Thermal receipt printer, paper slot visible, white receipt curling up | frontal | `devices/printer.tsx` |
| 7 | Barcode scanner on stand | frontal | `devices/scanner.tsx` |
| 8 | Video: ambient loop of shot 1 | top-down | Act 1 `<video>` (phase 3) |

Consistency check after each device: place it over `#1e293b` next to the
previous renders — same key-light direction, same shadow softness, same
material sheen. Regenerate outliers rather than color-correcting.

## Prompt template (shots 2–7)

> {device description}, high-end 3D product render, straight-on front view,
> orthographic, centered, soft studio key light from upper left, physically
> based materials, subtle contact shadow below, screen completely black,
> isolated on transparent background, 4k

For shot 1 swap the view for "directly overhead top-down view of a warm oak
coffee-shop counter" and add the prop list. Generate 4–8 candidates, pick in
the browser, iterate.

## Integration map

- Files land in `public/images/story/` as AVIF + WebP (use `sharp` or
  Squoosh; target ≤120 KB per device, ≤400 KB master still, ≤5 MB video).
- Device bodies: each `devices/*.tsx` keeps its dimensions; replace the CSS
  bezel classes with the image (keep the DOM screen slot untouched).
- Act 1: master still renders as the warm background layer (`<Image>` with
  `priority`); the CSS wood/props layer becomes the still's fallback.
- Video (phase 3): `<video muted autoPlay playsInline loop poster={still}>`
  behind a corner-pinned (`matrix3d`) `PosScreen` aligned to the artwork
  tablet; crossfade to the DOM tablet as Act 2 begins.

## Act 3 hardware prompt pack (executed 2026-07-03)

The nine Act 3 renders shipped from these prompts (Nano Banana / Gemini).
Brand rule: **iconic form factors, no logos** — recognition comes from
silhouette, never from marks. One scene-bible amendment since the sections
above were written: acts 2–4 now sit on the *light* studio background, so
devices are generated over plain light gray (not slate) and cut out.

Shared prompt tail for every device:

> …, high-end 3D product render, photorealistic materials, straight-on
> front view, orthographic, device centered filling about 80% of the frame,
> soft studio key light from the upper left, crisp soft contact shadow
> directly below, plain light gray background, completely blank housing
> with no logos, no brand names, no legible text, square format, 4k detail.

Per-device subjects (file = `public/images/story/hardware/<name>`):

| File | Subject |
|------|---------|
| terminal-1 | classic countertop card payment terminal, dark charcoal plastic body, raised numeric keypad with softly rounded keys, small rectangular display completely black and switched off, contactless tap-to-pay zone above the display, card insert slot along the bottom edge |
| terminal-2 | modern smart payment terminal, slim white body, large portrait touchscreen completely black and switched off, thin bezels, narrow integrated receipt slot along the top edge, one subtle side button |
| terminal-3 | small square contactless card reader resting on its low matching charging dock, matte white body with softly rounded corners, embossed contactless wave symbol on the top face, thin card-swipe groove along one edge, no screen |
| printer-1 | compact thermal receipt printer, matte light-gray cube body with rounded corners, crisp white paper receipt emerging from the front slot and curling gently forward, faint generic gray print lines with no readable words, small round feed button, tiny power LED |
| printer-2 | vertical black thermal receipt printer, matte black housing, glossy top paper hatch with a white receipt emerging upward, faint generic gray print lines with no readable words, one large oval feed button on the front face, small green status LED |
| printer-3 | minimalist modern white cube receipt printer, clean matte white surfaces, softly rounded edges, front paper exit slit with the leading edge of a white receipt just visible, subtle blue power LED |
| scanner-1 | handheld barcode scanner gun, black rubberized ergonomic body, dark red scan window at the head, standing upright in its weighted hands-free desk stand with a curved neck |
| scanner-2 | omnidirectional presentation barcode scanner, dark gray dome-shaped head angled slightly upward, glossy dark scan window, sitting on a weighted round base |
| scanner-3 | modern compact 2D barcode scanner, white body with light gray trim, rounded head with a dark scan window, standing upright in a minimal matching white cradle |

Session tips that mattered:

- **Reference-image consistency:** after the first approved render, attach
  it and add "match the lighting direction, shadow softness and background
  of the reference image" — beats regenerating outliers blind.
- If a logo or fake brand text sneaks in, re-roll with "completely blank
  plastic, absolutely no printed markings anywhere on the device".
- Cutout pipeline (no installs needed): Apple Vision subject mask via a
  small `swiftc` CLI + sharp compositing that re-extracts the baked contact
  shadow from the gray backdrop (luminance, feathered band around the
  subject's base, largest-mask-component filter for Gemini's floating
  sparkle props). Tools archived in `~/Documents/hardware/tools/` on the
  owner's machine.
- Screen overlays: terminal display rects are measured off the renders in
  source-image px and live in `devices/terminal.tsx` — remeasure if a
  terminal render is regenerated.
