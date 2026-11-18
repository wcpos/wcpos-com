# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop that turns my tablet into the register, with the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: The red "New in 2.0" line says I now get register open and close, split payments and today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: / (home), desktop and phone
- Element: The pricing teaser "Start free. Upgrade when you need more." ends with "See Full Pricing & Features". The only path to the comparisons is the small "Compare WooCommerce POS systems" text link under the final "Ready to sell in-store with WooCommerce?" CTA, plus the footer. Nothing in the home body says "Square" or "FooSales".
- Problem: My shortlist is Square for WooCommerce, this app and FooSales. The site has sourced pages for both (/compare/square, /compare/foosales), and they are its best proof: dated facts and a "Where Square is genuinely better" section. From the home page, though, I only find them if I scroll past the last CTA. This is the third round I've raised it. Round 18 deferred it as a candidate, and the live page hasn't changed.
- Why it costs: My "how is this different from Square?" question comes at the price card, where I'm weighing Square's $0 plan against $129 for Pro. If the answer isn't there, I go back to Google and read Square's own page. Then the comparison the site worked hardest on never gets read.
- Fix: Below "See Full Pricing & Features", add one line in all ten locales: "Comparing with Square or FooSales? See how we compare →", linking to /compare.
- Scope: ok (one copy line linking to an existing page; no new claims or numbers)

## Worst defect — UI
- Page/viewport: /compare (hub), phone 390 px
- Element: The seven stacked cards come in this order: "WCPOS vs Oliver POS", "WCPOS vs WooCommerce's official POS", "WCPOS vs Square for WooCommerce", Jovvie, Vitepos, YITH, then "WCPOS vs FooSales" last. The lead promises "comparisons with Square, FooSales, Oliver POS…".
- Problem: The lead names Square and FooSales first, but the cards don't follow it. The phone fold shows only the Oliver card, half hidden by the cookie bar. Square is about two screens down, and FooSales is about five screens down, just above "More comparisons are on the way." All the cards look the same and there is no jump list, so the order is the only hierarchy. Right now that order matches neither the lead nor the alternatives a WooCommerce shop actually meets.
- Why it costs: I came to this page for two specific comparisons. On my phone I scroll past four POS systems I've never heard of, and that makes the hub look like a list of filler, not an answer to my question. Some shoppers will give up before the FooSales card.
- Fix: Reorder `COMPARISONS` in `src/app/[locale]/(main)/compare/page.tsx` to match the lead and what shoppers meet most: Square, WooCommerce's official POS, FooSales, Oliver, then the rest. The ItemList JSON-LD follows that order.
- Scope: ok (array order in one component; no copy or claim change)

## Worst defect — SEO
- Page/viewport: /compare/square (and all /compare/* pages), all locales
- Element: The title "WCPOS vs Square for WooCommerce (2026) | WCPOS" and the visible "Square facts verified 2026-10-06 …". The JSON-LD in facts.json is only Organization, FAQPage and BreadcrumbList, and `grep -rn "dateModified\|datePublished" src` finds nothing.
- Problem: These pages make a freshness promise in the title ("2026") and the body ("verified 2026-10-06", "We re-verify every quarter"). But nothing machine-readable carries a date, so search engines have to guess it from the text. For comparison queries ("Square for WooCommerce vs …", "FooSales alternative"), a visible date in the snippet is what makes a dated, sourced page stand out from vendor pages and stale listicles.
- Why it costs: Without structured dates, the main thing these pages offer, sourced and current facts, can't show in the search result. Google may also show no date, or the wrong one, in the snippet, which weakens the click against competitors' own pages.
- Fix: Add an `Article` JSON-LD node to the shared compare template, with `headline` (the H1), `datePublished`, `dateModified` (each page's existing verified date), and `author`/`publisher` set to the existing Organization.
- Scope: ok (metadata only; dates already shown on the page; no new claims)

## Runner-up notes (max 3 lines)
- On /pro there's no "Try Live Demo" near the $129 price box. "Try the free version first" is the only nudge, and before paying I want to click around first.
- The ceramicist "sell … at markets" review is the best proof for a market-stall seller, but it's the middle card under the generic "Works for stores of all kinds".
- In the home lead, "WCPOS turns the tablet into your register" reads oddly: whose tablet? "your tablet" (German already says "dein Tablet").
