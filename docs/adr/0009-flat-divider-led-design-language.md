# Flat, divider-led design language (no enclosing boxes)

The shared UI had drifted into an "everything in a rounded, bordered, shadowed
box" look — and the account area nested boxes inside boxes. We adopt a flat,
divider-led visual language across the whole site: structure comes from
whitespace, hairline dividers, and type hierarchy, not from enclosure. This
extends ADR 0005 (the marketing language is canonical); it de-boxes that
language rather than replacing it.

## Context

After ADR 0005 converged the brand on the marketing look and the shared
primitives, two problems remained:

- **Inconsistency.** ~5 corner radii (`sm`→`2xl`), 5+ shadow levels
  (`none`→`shadow-2xl`), and drifting borders/padding/hover behaviour across
  `src/components/`. Marketing pages hand-rolled boxes instead of using the
  `ui/*` primitives.
- **The boxed aesthetic.** Almost every group of content was wrapped in a
  `rounded-* border ... shadow` card, and the account area stacked
  `rounded-lg border bg-muted/40` boxes *inside* `Card`s. The effect read as
  generic / "AI slop" rather than the intended modern, classy feel
  (reference: stripe.com).

## Decision

1. **No enclosing boxes for grouping.** Content is organised by whitespace +
   hairline dividers + type hierarchy. A panel has at most ONE outer hairline
   container. Nested grouping boxes are removed and become divider-separated
   rows. New primitives carry this: `Row`, `DividedList`, `FieldRow`
   (`src/components/ui/row.tsx`).

2. **One tight radius scale.** `--radius` is `6px`. `rounded-md` (6px) is the
   default for buttons, inputs, cards and panels; `rounded-lg` (8px) is reserved
   for genuinely-raised cards; `rounded-full` stays for pills/avatars/dots.
   `rounded-xl`/`rounded-2xl` are retired from app code. Only `ui/*` primitives
   set radius; pages should not hand-roll it.

3. **Quiet elevation.** Default surfaces are flat (border, no shadow). A designed
   soft, ink-tinted shadow scale (`--shadow-xs/sm/md/lg` in `globals.css`)
   replaces Tailwind's defaults. Shadow appears ONLY on genuinely-raised
   surfaces: featured pricing card, the hero device mockup, dialogs/popovers,
   auth cards, the consent banner, and the editorial founder-letter. No
   `shadow-2xl`/`shadow-xl`; no playful `hover:-translate-y` + `hover:shadow`
   lifts (replaced by a single subtle `hover:border-foreground/20`).

4. **Restrained brand.** `--wcpos-red` is the single accent (CTAs, active states,
   small marks). Foreground is a deep slate-ink rather than near-black. Status is
   shown with a quiet tint + leading dot (`StatusBadge`), not solid red fills.

## Consequences

- `Card` is flat by default (`rounded-md border bg-card`, no shadow). Callers opt
  into elevation with `shadow-lg` where a surface is genuinely raised.
- Test selectors must not depend on styling classes. The downloads release-row
  selector moved from `div.rounded-lg.border` to `[data-testid="release-row"]`
  (e2e + unit) so restyles don't break tests. New work should prefer
  `data-testid`/role/text selectors over class selectors.
- Marketing one-offs that carry intentional character (the founder letter's cream
  paper) are kept, but aligned to the designed shadow scale.
- `about/about-cta.tsx` still hand-rolls CTA buttons; they are radius-consistent
  with the Button `xl` variant, but folding them into the `Button` primitive is a
  worthwhile follow-up (out of scope here).
- Numbering note: a separate, pre-existing collision exists on ADR 0006 (two
  files). This ADR takes the next free number (0009) and does not attempt to
  reconcile that collision.
