# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free add-on that turns a tablet into the till for my WooCommerce shop, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: Version 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, both viewports. The same layout is on every comparison page (foosales, oliver-pos, woocommerce-pos, jovvie, vitepos, yith-pos).
- Element: the "Which should you choose?" section, with the cards "Choose WCPOS if:" and "Choose Square for WooCommerce if:" (`compare/square/page.tsx` around line 304). Neither card has a button or a link. The only call to action in the body is plain text in the middle of the cost section: "Try everything first at demo.wcpos.com/pos (login demo / demo)".
- Problem: This section is where a skimmer decides. Once I read "Choose WCPOS if:" and say "that's me", there is nothing to click. The first button, the "Ready to sell in-store with WooCommerce?" band (`<CtaSection />`, line 342), comes after the six-question FAQ, 14 source links and "More comparisons". That is about 2,600 px further down on desktop, and the phone page is about 13,600 px long in total.
- Why it costs: I came to this page from my shortlist to decide what to try this week. If I make up my mind at the verdict but have to scroll past the FAQ and the sources to find "Try Live Demo", I'm likely to leave. Square's page does have a button. This is the conversion point on the site's most commercial pages.
- Fix: Under the two "choose" cards, add the two existing hero buttons, "Try Live Demo" (demo.wcpos.com) and "Download Free" (/downloads). Use the existing `common` button strings, put them in a shared compare component, and render them on all seven spokes.
- Scope: ok (it reuses buttons and copy the site already has; no new claim)

## Worst defect — UI
- Page/viewport: /pro at phone width (390x844). The same hero spacing is on /downloads, /compare and the comparison spokes.
- Element: the /pro hero "WCPOS Pro for WooCommerce POS" with `Section spacing="hero"` (`py-20` on phone), then the price section with `pt-8` on top of the hero's `pb-8`.
- Problem: On phone there is about 85 px of empty dark space between the header and the H1, and about 70 px more between the subtitle and the "Get Pro" card. The consent bar takes about 137 px at the bottom. As a result the first screen shows only the Yearly option. "Lifetime", its price and the buy button are all below the fold. The capture shows the same empty band above the H1 on /downloads, /compare and /compare/square.
- Why it costs: On my phone I open Pro to see what it costs and how to buy it. About a fifth of the first screen is blank padding, so I have to scroll before I see both options or anything to tap. The page feels sparse and slow to get to the point.
- Fix: Below `md`, tighten the `hero` spacing variant in `src/components/ui/section.tsx`, for example `pt-10 pb-12 md:py-24 lg:py-28`. Keep desktop as it is. That pulls the price card about 70 px up on every interior page.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare/square (and /compare/woocommerce-pos), in the JSON-LD and the visible captions.
- Element: `dateModified` comes from `COMPARE_FACTS_VERIFIED.square = '2026-10-06'` (`src/lib/compare-page-json-ld.ts:12`). The glance caption reads "Square facts verified 2026-10-06". The Sources section says "read on 2026-10-06 and checked again on 2026-11-18". The footer says the WCPOS facts "are for WCPOS 2.0, released 2026-11-09".
- Problem: According to the structured data, the page was last modified on 6 October. Yet the page describes a release from 9 November and a re-check on 18 November. The page contradicts itself about its own freshness, and its machine-readable date is the stale one.
- Why it costs: "WCPOS vs Square" is a decision query, and searchers favour recent results. The SERP date shown is a month older than the content, against competitors' pages. Readers like me also see two different "verified" dates and start to doubt that "every number is sourced and dated".
- Fix: Set the square (and woocommerce-pos, if it was re-checked as well) entry in `COMPARE_FACTS_VERIFIED` to 2026-11-18. Change the glance caption and the footer line to "verified 2026-10-06, re-checked 2026-11-18" to match Sources.
- Scope: ok (it restates a date the page already gives)

## Runner-up notes (max 3 lines)
- On every comparison page, "Where … is genuinely better" still says "WCPOS keeps taking cash sales offline", while the page's own table says cash or separate-terminal sales. For a market stall this is the deciding line. It is front-desk held (offline wording), but it is the costliest copy on the page.
- /pro gives no proof other than features. The home page's market-vendor review (the ceramicist on lifetime Pro) would reassure a stall owner at the point of paying.
- On phone, the consent bar is three lines of text plus a separate button row, about 137 px. Putting the buttons inline beside a shorter message would give back about 60 px on every first screen.
