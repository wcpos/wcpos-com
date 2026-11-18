# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet into a till running off my WooCommerce shop, with the same products, stock and prices, and it keeps working offline.
Why version 2: Opening and closing the register, split payments and today's sales are now free ("New in 2.0" line above the headline).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: / (home), act 3 of the scroll story, desktop and phone (all locales; en `messages/en.json` line 298)
- Element: "Card terminals, thermal receipt printers, barcode scanners — WCPOS doesn’t lock you into proprietary hardware. Plug in what’s already on your counter."
- Problem: It promises that whatever card terminal I already have will "plug in". The rest of the site says something different. In the free version a card terminal is only recorded as a "Card" tender (home pricing card: "Cash or card on your own terminal"). Connected readers are Pro, and only certain brands: "Pro connects card readers like Stripe Terminal and SumUp" (home), plus the list on /pro and /extensions. I'm weighing this against Square, so the card reader is the thing I care about most. If my reader isn't on that list, "plug in what's on your counter" isn't true.
- Why it costs: Card payments are the one place where Square clearly beats WCPOS for a market stall, and this is the home page's answer to them. If I find out later that my reader doesn't connect, or needs the $129 Pro, I stop trusting the other claims on the page as well, including the honest ones on /compare. Raised by woo-dev in round 23 and still not fixed.
- Fix: Change the body to something like "Card terminals, thermal receipt printers, barcode scanners — no proprietary hardware. Take card payments on your own terminal; Pro connects readers like Stripe Terminal, Square Terminal and SumUp." Update all 10 locales.
- Scope: ok (it only restates what /pro and the home feature list already say; no new claim and no price wording)

## Worst defect — UI
- Page/viewport: /compare/square, phone 390x844
- Element: the gap between the hero lead ("…and when Square is the better choice.") and the "The short answer" H2
- Problem: The hero section uses `spacing="hero"` (80 px top) with `pb-6`, and the short-answer section adds `spacing="compact"` top padding on top of that. On phone that leaves about 100 px of empty dark space under the lead paragraph, plus about 85 px above the breadcrumb. The whole first screen is the breadcrumb, a 2-line title and a 6-line intro. "The short answer" starts at the very bottom, and its first lines sit under the cookie bar.
- Why it costs: I came for the answer, and the page labels it as one ("The short answer"). On my phone I see none of it without scrolling, and it reads like a long article. This page is roughly a dozen phone screens long, so losing the first one to padding hurts. Raised by me in round 23 and still not fixed.
- Fix: In `src/app/[locale]/(main)/compare/square/page.tsx`, add `max-sm:pt-10` to the hero `Section` and `max-sm:pt-2` to the short-answer `Section`. Apply the same to the other six /compare/* spokes, which share the pattern.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare (hub), meta description, all locales
- Element: "Honest, sourced comparisons of point of sale systems for WooCommerce — architecture, real free-tier limits, pricing, offline support, and when to choose each one."
- Problem: It is 162 characters in en (de 187, nl 192, fr 204), so Google cuts it off. It also doesn't name a single competitor, while the hub's own H1 subtitle names Square, FooSales and Oliver POS. Those vendor names are what someone like me actually types ("woocommerce pos square vs foosales"). Raised in round 23 and still not fixed. The metadata-length test still doesn't cover the hub.
- Why it costs: The snippet that should catch comparison searches is generic and truncated, so the hub loses clicks to the vendors' own pages for exactly the queries it was built for.
- Fix: Use something like "Sourced, dated comparisons of WooCommerce POS systems: WCPOS vs Square, FooSales, Oliver POS and more, on pricing, offline use and when to pick each." (149 chars). Translate it at ≤155 per locale and add the hub to `compare/metadata-length.test.ts`.
- Scope: ok

## Runner-up notes (max 3 lines)
- /compare/square "Where Square is genuinely better": "Square's POS has a free plan… WCPOS Pro costs $129 or more." This reads as if WCPOS has no free version, which contradicts the table's "Free plugin with no caps". needs-front-desk (price wording).
- Home "Weighing up Square or FooSales? See how WCPOS compares" names two competitors but links only to the hub. Linking "Square" and "FooSales" straight to their pages would save me a click and pass link equity.
- Home act 3b "Internet drops? Keep selling" doesn't add that connected card readers need a connection, which /downloads and /compare do say. That matters at a market stall with weak signal.
