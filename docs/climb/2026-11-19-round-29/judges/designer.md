# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the shop's register, selling from the store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free. It is the smallest text on the fold, but it answers the question.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, desktop and phone (both folds)
- Element: the first cards under "Card terminals and payments": "Mercado Pago Terminal for WooCommerce", "Mollie Terminal for WooCommerce", "PayArc Terminal for WooCommerce". "Square Terminal…" is fifth and "Stripe Terminal…" is sixth. Five of the eight terminal cards share the same line: "Adds X Terminal support to WooCommerce for in-person payments."
- Problem: The terminals come in catalog order, which is alphabetical. The fold shows two regional or niche brands, and the two terminals most visitors look for are about 1,000 px down on desktop and three or more screens down on phone. The page's own meta description, and the /pro card that links here, lead with "Stripe, Square, SumUp, PayPal". The repeated description gives a skimmer no way to tell the cards apart.
- Why it costs: Visitors arrive from /pro's "See all terminal extensions" asking one thing: "does it work with my Stripe or Square reader?" The fold answers with Mercado Pago and PayArc. That reads as "probably not", and they leave before scrolling.
- Fix: Add a PAYMENTS_FIRST order next to the existing `PAYMENTS_LAST` in `src/app/[locale]/(main)/extensions/page.tsx`, in the meta description's order (Stripe, Square, SumUp, PayPal, Mollie, Windcave), with the rest after them. Order only, no copy change.
- Scope: ok

## Worst defect — UI
- Page/viewport: /support, phone (also desktop)
- Element: "Prefer to talk to a human?" / "Join store owners and the team in our live Discord community." It is followed only by the embedded Discord widget.
- Problem: There is still no first-party button that opens Discord. The only way in is the third-party iframe. At 390 px its toolbar truncates the channel name to "# W…", with icons crowding the "Open Discord App" pill. Its content is a 2023 welcome post with a grey "Click here to log in" bar. Above it, an empty band of about 170 px separates "Answered by Aide" from the heading, so the human route also starts below the fold. This is the fourth round this has been on the carry-over list.
- Why it costs: A visitor who wants a person has one job on this page: get into Discord. The control for that is small, clipped and styled by Discord rather than WCPOS, inside a block that looks like a screenshot. The page's second call to action has no button.
- Fix: Put a primary "Join the WCPOS Discord" button, using the invite URL the footer already has, directly under the lede and above the embed. Shrink the reserved empty space under the chips on phone.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /de (meta description, both viewports)
- Element: "Kostenloses Kassensystem für WooCommerce. Verkaufe offline, teile Zahlungen auf, öffne und schließe die Kasse. Web- und Desktop-Apps; iOS und Android in Beta."
- Problem: The en and nl home descriptions both say "open-source" and "free in 2.0" / "gratis in 2.0". The German one, trimmed to fit the 160-character budget (#735), dropped both. The /de search snippet has no version-2 hook and no open-source signal, though the German fold leads with "Neu in 2.0".
- Why it costs: German is one of the two long-word locales the site targets. Its home snippet is the only one that does not say why to look now, and it misses "Open Source", which differentiates it from paid German POS rivals in the results.
- Fix: Rewrite within ≤160 characters to keep "Open-Source" and "neu in 2.0". Tighten the platform clause to make room, e.g. "Web, Desktop; iOS/Android in Beta". The existing length test still holds.
- Scope: ok

## Runner-up notes (max 3 lines)
- Home desktop H1 rags as "…store, at / the counter." (nl: "…-winkel, aan / de toonbank."). Keep the phrase together with a non-breaking space or `text-wrap: balance`. This is in the story component, which the owner's PR touches, so coordinate.
- The consent banner flips its button order: desktop is "Decline | Accept", phone is "Accept" above "Decline". Pick one order.
- Spelling differs for the same question: the /support chip says "licence" and the /pro FAQ says "license".
