# 0012 — Scroll-story homepage

Date: 2026-07-02
Status: accepted

## Context

The homepage was functional but flat: a static hero mockup followed by
stacked marketing sections. The owner wants a distinctive opening — a
cinematic, scroll-driven story: looking down on a live store counter, the
tablet swinging face-on as you scroll, platforms → hardware → Woo sync acts,
then the regular sections.

Three rendering approaches were evaluated with motion prototypes: real-time
3D (React Three Fiber + GLTF), pre-rendered frame scrubbing (Apple style),
and layered 2.5D (DOM devices + CSS 3D + scroll choreography).

## Decision

**Layered 2.5D**, orchestrated by `motion`'s `useScroll`/`useTransform` in
one pinned 560vh scroller (`src/components/home/scroll-story/`).

- **The tablet is one persistent DOM element across all four acts**, and its
  screen is the live `PosScreen` component — never an image. Artwork may
  replace device *bodies* later; screens stay DOM so they remain crisp under
  transforms, theme-aware, and translatable.
- **Choreography lives in data** (`keyframes.ts` progress tables), separate
  from scene markup. Every track carries explicit stops at progress 0 and 1:
  motion compiles opacity tracks to WAAPI ScrollTimeline animations, where
  missing endpoint offsets produce implicit keyframes from the element's base
  value (faded layers "loop back in" near the end of the scroll otherwise).
- **Degradation ladder:** `prefers-reduced-motion` and `< md` viewports get
  `StoryStatic` — the same copy and device components as stacked sections.
  Both variants render in the DOM and are switched by CSS, so SSR needs no
  viewport knowledge and copy is always server-rendered text.
- **Copy** is hardcoded English in `copy.ts`, matching the marketing-page
  convention (messages/*.json is chrome-only).
- Replaced sections (`HeroSection`, `ProblemSection`, `EcosystemSection`,
  `BenefitsSection`) stay in the tree until the story is validated on beta.

## Consequences

- The homepage's top depends on client JS for the pinned experience, but all
  copy and CTAs are in the SSR payload; no-JS visitors read the static acts.
- `motion` (~small, tree-shaken) is the only new runtime dependency.
- Asset upgrades are additive: hyper-real device renders drop into device
  body slots; Act 1 gains a still, then an ambient video loop
  (see `docs/runbooks/scroll-story-asset-generation.md`). No API changes.
- A dedicated `< md` pinned choreography is deferred; small viewports use the
  static variant meanwhile.
