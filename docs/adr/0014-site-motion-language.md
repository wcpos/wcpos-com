# 0014 — Site motion language and the ambient gradient

Date: 2026-07-02
Status: accepted

## Context

The scroll-story homepage (ADR 0012) established that motion is central to
the site's character. The owner's direction, after evaluating dark vs light
prototypes: light pages, one continuous animated brand gradient tying
sections together, and — borrowing Stripe's philosophy, not their pixels —
"restraint, but nearly every element has movement."

## Decision

**Motion rules (site-wide):**

1. Animate only `transform` and `opacity` in loops; canvas/WebGL for the two
   signature elements (ambient gradient, dot orbit) with rAF gated by
   IntersectionObserver and `visibilitychange`.
2. Everything honours `prefers-reduced-motion` (static frame or no
   animation; the homepage swaps to `StoryStatic`).
3. Ambient loops are slow (≥9s periods); interaction feedback is fast
   (<500ms). Nothing autoplays sound, blocks input, or shifts layout.
4. Backgrounds may drift; **pinned foreground objects hold still**.
5. Every section-level animation must illustrate the copy's point, not
   decorate it (hardware carousel = "anything works"; arc pulses = sync;
   synchronized Charge buttons = "same store, same data").

**The ambient gradient** (`src/components/motion/ambient-gradient.tsx`) is an
original ~180-line WebGL fragment shader: domain-warped value noise through
the backdrop palette (blue-led with pink/yellow splashes — bright but calm; warm red/orange washes ruled out, brand red lives only in small accents) with a digital character: terraced contour lines and a bright filament through the noise field, not soft cloud inside a
bottom-left→top-right diagonal band that fades to warm white where copy
sits, with slow upward drift (echoing the homepage's coffee steam). It is
deliberately *not* Stripe's minigl or any recreation of it — inspired-by,
clean-room. Static CSS-gradient fallback on missing WebGL or context loss;
single-frame render under reduced motion; DPR capped at 1.5.

It is a reusable primitive: pricing/pro/downloads heroes adopt it as the
follow-up to this ADR.

## Consequences

- One GPU surface per page for the signature background; everything else is
  compositor-only CSS. Old-hardware cost stays bounded.
- The homepage's per-act drifting patterns were removed in favour of
  foreground act animations (rule 5).
- A `Reveal` scroll-into-view primitive (IntersectionObserver + <500ms
  transform/opacity) is the next building block for non-homepage pages.
- **Interactive kit direction:** the site standardises on `motion` (scroll,
  springs, gestures, SVG pathLength) plus the custom canvas/WebGL
  primitives (DotOrbit, AmbientGradient) for the signature surfaces. A
  `three` + `@react-three/fiber` 3D centerpiece (pointer-reactive spike
  burst) was prototyped and **rejected** (owner, 2026-07-02): visually
  strong, but not worth carrying a 3D library for a site with no other 3D
  need. Do not reintroduce a 3D dependency for decorative motion. Kit
  lives in `src/components/motion/`; every piece is IO/visibility gated
  and reduced-motion aware. First deployments: downloads "how it fits
  together" hub pulses, about-us timeline draw-on-scroll. The owner's
  preferred DotOrbit accent variant: dense blue-led
  (`dots={190} ringRadius={120} size={340}` with the blue/pink/yellow
  palette from the kit evaluation).
