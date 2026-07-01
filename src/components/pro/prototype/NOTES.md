# /pro pricing + checkout prototypes — NOTES

## Part 1 — pricing section

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

## Part 1b — pricing round 2 (research-driven)

Round 1 (a/b/c) was rejected as lacklustre. Round 2 patterns come from
researching high-converting license/pricing pages (Sketch, WP Rocket, Tower,
plus data-backed roundups):

- **Use the free tier as the anchor** — three tiers convert best; our free
  plugin IS the missing third column (none of round 1 used it).
- **Dollar framing beats percentages** — "about 3 years of Yearly, then $0
  forever", not "save 24%".
- **Proof adjacent to price** — 5,000+ active stores, open source since 2014,
  14-day no-reason refund (all factual: homepage + /refunds).
- **Risk-reversal at the CTA** — never auto-renews; Yearly credits toward
  Lifetime (from the live FAQ).
- **≤8 specific features, one CTA per tier, generous whitespace.**

New variants (switcher now cycles current + d/e/f; a/b/c still URL-reachable):

```
http://localhost:3000/pro?variant=d   # D — Free anchors Pro (3-col, research-correct)
http://localhost:3000/pro?variant=e   # E — The zero column (dark value pitch vs POS industry, term toggle)
http://localhost:3000/pro?variant=f   # F — The receipt (till-receipt pricing, brand-native)
```

All still render static-first with only the price suspending (PriceSlot).

## Part 2 — checkout flow

**Question:** What does a modern, minimal checkout look like given the two hard
requirements (account + billing address)?

Current flow pain points the variants attack:

1. **The /login bounce** — middleware redirects signed-out buyers to a separate
   login/register page and back. All three variants create the account inline
   from the checkout email field (license + sign-in link delivered after
   purchase), so a new customer never leaves the page.
2. **The blocking init spinner** — "Preparing checkout..." blocks on three
   sequential API calls before any UI appears. The variants render the full
   form instantly (in the real implementation the cart would be created in the
   background while the customer types).
3. **No express path** — wallet payments (Apple/Google Pay via Stripe) provide
   name, email, and billing address from the wallet in one tap, which is the
   real answer to "quick and painless" for most buyers.
4. **No explicit billing address** — today only the bare Stripe PaymentElement
   is shown; the variants use one compact block (name / country / address /
   city / postal) and wallet payments skip it entirely.

Checkout variants (fully stubbed — no Medusa/Stripe/auth; middleware has a
dev-only bypass for `?variant=a|b|c`):

```
http://localhost:3000/pro/checkout?variant=a   # A — one column, express-first
http://localhost:3000/pro/checkout?variant=b   # B — three steps that collapse
http://localhost:3000/pro/checkout?variant=c   # C — split-screen paywall
http://localhost:3000/pro/checkout             # current production checkout
```

`?signedin=1` (or the toggle in the floating bar) previews the signed-in state
— B starts on step 2 with Account already ticked. Pay buttons fake a 1.2s
processing state then show a success screen.

## Verdict

- **Checkout: Variant B wins** (owner, 2026-07-01) — three collapsing steps
  with sticky summary. Payment step reworked to the owner's spec: wallet
  buttons (Apple/Google Pay) on top, then a radio-accordion where **Card is
  the default and expanded** and **PayPal and Bitcoin are equally visible
  rows** (not a buried text link); the pay button label follows the selection
  ("Pay $129 now" / "Continue to PayPal" / "Continue to Bitcoin payment").
  See `checkout/payment-method-selector.tsx`.
- **Pricing section: TBD** — owner still to pick between A / B / C.

When both are decided: fold the winners into the real components and delete
this directory (including the middleware bypass)._
