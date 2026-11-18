# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free register for my WooCommerce shop that runs on a tablet at the counter, with the same products, stock and prices as my website, and it keeps going when the internet drops.
Why version 2: 2.0 lets me open and close the register, split a payment and see today's sales, and all of that is free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone (the "Who runs this comparison" card and the "At a glance" caption; `src/app/[locale]/(main)/compare/square/page.tsx`).
- Element: "every number is sourced and dated, we link to competitors' own pricing pages … Check everything." and "Square facts verified 2026-10-06 on squareup.com and in WooCommerce's documentation for the Square for WooCommerce extension".
- Problem: The page promises links and has none. Its only outbound link is the WCPOS demo. The facts that matter most to me are unlinked: Square Free at "$0/month", "2.6% + 15¢", the 72-hour offline window, "orders placed in Square's POS are not synced to WooCommerce", and "one Square location at a time". The FooSales comparison does link to foosales.com, so the Square page is the odd one out. I raised this last round and it is still the same.
- Why it costs: I am choosing between Square and WCPOS this week, and the sync gap is the deciding point. The page tells me to "check everything" and then gives me nothing to click, so the claim reads as marketing and I go to Google, where Square's own pages are waiting. A comparison written by WCPOS only earns trust if it shows its sources.
- Fix: Add plain links to the sources the caption already names: Square's fees page, its offline-payments help article, and WooCommerce's Square for WooCommerce docs and FAQ. Put them inline on the "What Square for WooCommerce doesn't do" list items and on the caption, the same way /compare/foosales does it.
- Scope: ok (links to sources the page already cites; no new claims, no price wording changes)

## Worst defect — UI
- Page/viewport: /compare/square, phone 390 px (the shared compare hero and the answer-first section).
- Element: The empty space above the breadcrumb "‹ Compare WooCommerce POS systems" and the gap between the end of the intro ("…and when Square is the better choice.") and "The short answer".
- Problem: About 80 px of blank space sits above the breadcrumb (the hero `py-20`). Another ~88 px sits between the intro and "The short answer" (the hero's `pb-6` plus the compact section's `pt-16`). On an 844 px phone screen, with the cookie bar showing, that leaves room for only two lines of the short answer above the fold. Most of the first screen is the H1, a grey intro and white space.
- Why it costs: I tapped through to find out how WCPOS differs from Square. On my phone, I decide from the first screen whether the page will tell me. The key sentence, "every sale is a WooCommerce order, so there is no second catalog", is cut off below the fold, so a skimmer like me scrolls past or leaves.
- Fix: Below `sm`, cut the hero top padding (for example `pt-10`) and give the short-answer Section `pt-6`. Desktop stays as it is.
- Scope: ok (spacing classes on an existing page; no copy changes)

## Worst defect — SEO
- Page/viewport: /compare (hub), all viewports, meta description (facts.json; `messages/*.json` `compare.hub.metadata.description`).
- Element: "Honest, sourced comparisons of point of sale systems for WooCommerce — architecture, real free-tier limits, pricing, offline support, and when to choose each one."
- Problem: It is 162 characters in en, against the site's own 155 budget. The other locales are much longer: de 187, nl 192, fr 204, against a 160 budget. Neither length test covers the hub, so the snippet gets cut off. It also names none of the competitors people actually search for. The hub's own visible intro names Square, FooSales and Oliver POS, but the description doesn't. I would search "WooCommerce POS Square vs FooSales", and this snippet gives me only abstract words ("architecture", "free-tier limits").
- Why it costs: The hub is the page that should rank for "WooCommerce POS comparison" and "FooSales alternative". A truncated snippet without a competitor name gets fewer clicks from exactly the shoppers who are comparing, which is the point where they choose.
- Fix: Rewrite it within budget and name the competitors, for example (en, 136 characters): "Sourced, dated comparisons of WCPOS with Square, FooSales, Oliver POS and other WooCommerce POS options, and when each is the better choice." Do the same in each locale, and add the hub key to `compare/metadata-length.test.ts`.
- Scope: ok (metadata only)

## Runner-up notes (max 3 lines)
- The /pro "Customer-facing display" card says "pair it to a till with a code". #796 replaced "till" with "register" on /downloads, but /pro still says "till".
- The /pro H1 "WCPOS Pro for WooCommerce POS" reads as "WooCommerce POS Pro for WooCommerce POS" to anyone who knows that WCPOS means WooCommerce POS. "WCPOS Pro: more registers, stores and card terminals" would say what I'm buying.
- /compare/square still has no body links to the sister comparisons (FooSales is my other shortlist pick). The only route is back through the hub.
