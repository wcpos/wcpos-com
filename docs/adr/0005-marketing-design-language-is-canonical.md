# The marketing design language is the canonical design system

The site grew two parallel visual languages. Shared UI components must converge
on one. We choose the marketing (home page) language as canonical: every page —
marketing, roadmap, account, and Pro — converges toward it, and the shared
primitives are re-skinned to match it.

## Context

Two distinct design languages exist side by side in `src/components/`:

- **Marketing language** (`home/`): the polished, brand-forward look. Uses the
  WCPOS red brand (`--wcpos-red`), the Tailwind `slate` scale, hero/section
  treatments, and bespoke section composition. It hand-rolls buttons, badges,
  and cards instead of using the `ui/*` primitives.

- **Semantic language** (`account/`, `pro/`, `roadmap/`): the shadcn-style
  system. Uses the `ui/*` primitives (`Button`, `Badge`, `Card`) and semantic
  tokens (`bg-card`, `text-muted-foreground`, `border-primary`). Its `--primary`
  is teal, which never appears on the marketing pages.

The result is visible drift: `--primary` (teal) versus `--wcpos-red`, two card
styles, copy-pasted button/badge class strings on home that duplicate unused
`ui/*` components, and inconsistent section rhythm. The account redesign (#135)
already moved the account area toward "homepage quality", confirming the
intended direction.

## Decision

The marketing language is canonical. Concretely:

1. **Brand color.** WCPOS red is the primary brand color across the whole site.
   The `ui/*` primitives are re-skinned so their primary maps to the red brand,
   not teal. Teal is retired as a primary surface (it may survive only as an
   incidental accent if a specific use justifies it).

2. **Shared primitives over hand-rolled markup.** The duplicated marketing
   markup (buttons, badges, cards, sections) is extracted into shared primitives.
   Home stops hand-rolling these and consumes the primitives like every other
   page. The primitives carry the marketing look by default.

3. **One section system.** A shared `Section` / `Container` / `SectionHeading`
   set standardizes max-width, padding rhythm, eyebrow/heading treatment, and
   background alternation. Per-section padding drift is removed.

4. **Convergence direction is "level up", not "level down".** Pages on the
   semantic language (roadmap especially) are raised to marketing-quality polish
   using the new primitives; the marketing pages are not flattened to match the
   plainer semantic pages.

## Consequences

- `src/components/ui/` remains the home of the primitives, but its tokens and
  default styling reflect the red/slate brand. `globals.css` token values change;
  semantic class names (`bg-card`, `text-muted-foreground`, etc.) are kept so the
  account and Pro pages re-skin without markup churn.
- The roadmap page is rebuilt on the new primitives rather than redecorated in
  place, so it is not restyled twice.
- Anything that hardcodes teal as a brand surface is a defect to migrate, not a
  variant to preserve.
- The phased migration order and the per-component primitive inventory live in
  the working plan (`docs/plans/`, not committed); this ADR records only the
  durable decision.
