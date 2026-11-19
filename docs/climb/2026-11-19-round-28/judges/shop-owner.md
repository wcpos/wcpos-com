# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet into a till for my WooCommerce shop, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales report, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, both viewports (same pattern on every /compare/* page)
- Element: "Choose WCPOS if:" card body, "You want every sale, online and in person, to be a WooCommerce order sold from one catalog, with no second catalog to keep in sync, run more than one store, sell outside Square's eight countries, want a register in a web browser or in desktop apps for Windows, macOS and Linux, or want to use a payment gateway or card terminal other than Square." The "Choose Square for WooCommerce if:" card is the same.
- Problem: This is where I make the decision, and it is one 60-word sentence in muted grey that packs six conditions together. Neither card has a button. The first "Try Live Demo" / "Download Free" buttons come after the FAQ and 14 source links, about 8,000 px further down on phone.
- Why it costs: I skim. I can't tick the conditions off against my shop (one counter plus a weekend market), so I don't reach "this is for me". When I do, there's nothing to click, and Square is the vendor holding my attention at that point.
- Fix: Turn each card's `body` into a short checklist that keeps the same wording (split at the commas into 4–6 items). Under the WCPOS card, add the existing "Try Live Demo" button (same link as the closing CTA).
- Scope: ok (copy and markup only, no new claims; this carries over from round 27's choose-card CTA note)

## Worst defect — UI
- Page/viewport: /compare/square, phone 390x844
- Element: the hero section above "The short answer"
- Problem: There is about 90 px of empty space between the nav and the "‹ Compare WooCommerce POS systems" breadcrumb, and about 110 px between the end of the grey lead paragraph and the "The short answer" H2. On the first screen, the short answer gets only about 3 lines before the cookie banner (which starts at about 752 px) covers it.
- Why it costs: The short answer is the reason I opened the page. On the first screen I see a title, a grey intro that only promises a comparison, and empty space. The verdict is below the fold, under the banner.
- Fix: On mobile, shrink the compare hero's `spacing="hero"` padding (e.g. pt-8 pb-6 below `sm`), and the top padding of the section after it, so "The short answer" H2 and its first paragraph sit inside the first 700 px.
- Scope: ok (component spacing at one breakpoint; fifth round on the carry-over list)

## Worst defect — SEO
- Page/viewport: /compare/square, structured data (all locales)
- Element: `WebPage.dateModified` = "2026-10-06" (from `COMPARE_FACTS_VERIFIED.square` in `src/lib/compare-page-json-ld.ts`). The sitemap lastmod is "2026-11-18", and Sources says "read on 2026-10-06 and checked again on 2026-11-18".
- Problem: The page gives search engines two different freshness dates, and the structured one is six weeks staler than the date the page shows. The "At a glance" caption also says only "verified 2026-10-06".
- Why it costs: This page competes on "(2026)" freshness for "Square for WooCommerce" searches. When dateModified and sitemap lastmod disagree, Google tends to trust neither, and it may show the older October date in results. A shopper comparing this week reads that as stale.
- Fix: Set `COMPARE_FACTS_VERIFIED.square` to '2026-11-18' and change the caption to "Square facts verified 2026-10-06, re-checked 2026-11-18 …" so the JSON-LD, sitemap, caption and Sources give one date.
- Scope: ok (a metadata field plus one caption string; no new claims, since Sources already states the 11-18 re-check)

## Runner-up notes (max 3 lines)
- /compare/jovvie caption says "facts as of 2026-07-09 … not re-checked since", which contradicts the /compare hub's "re-verified quarterly". A visitor reads that as the page breaking its own promise.
- On phone, the home "Built for the demands of physical retail" stacks six full-width cards, each with a 48 px icon box above the title, about 2.5 screens of scrolling. Putting the icon inline with the title would cut about a third of the height.
- The home device mockup and the "Bring your own hardware" panel never name a printer or scanner model that works. A "see supported hardware" link would answer "will my receipt printer work?"
