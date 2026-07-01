# /pro pricing prototype — NOTES

**Question:** What should the /pro pricing section look like, and how little of
it needs to suspend while Medusa prices load?

**Finding (applies to whichever variant wins):** the only datum that needs
Medusa is the **price text**. Titles, descriptions, feature lists, and badges
are static copy (`OFFER_COPY` in `src/lib/pro-offer-catalog.ts`), and the
checkout CTA works with just the product handle
(`/pro/checkout?product=wcpos-pro-yearly`) because checkout re-validates the
selection against the live catalog anyway. So the production fix is: render the
cards statically and wrap only the price in Suspense — verified by streaming
inspection that the full card markup arrives in the first chunk with
number-sized price skeletons.

## How to view

```
pnpm dev   # then open:
http://localhost:3000/pro?variant=a     # A — static-first cards (minimal change)
http://localhost:3000/pro?variant=b     # B — comparison panel (features listed once)
http://localhost:3000/pro?variant=c     # C — one product, pick a term
http://localhost:3000/pro               # current production design (baseline)
```

Flip variants with the floating bottom bar or ←/→ keys. `?delay=<ms>` tunes the
simulated Medusa latency (default 1500; `?delay=0` disables).

Dev-only: in production builds the gate renders the real pricing section.

## Verdict

_TBD — owner to flip through and pick a winner (or a combination), then fold it
into `pricing-card.tsx` / `page.tsx` properly and delete this directory._
