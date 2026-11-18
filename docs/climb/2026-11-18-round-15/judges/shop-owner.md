# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free point-of-sale add-on for my WooCommerce shop that turns a tablet into my till, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales report, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: every page, desktop header (and the phone menu); first noticed on the home page.
- Element: header nav "Downloads · Pro · Documentation · Support · Roadmap"
- Problem: I'm choosing between Square, WCPOS and FooSales this week, and the site has exactly the pages I need (/compare/square, /compare/foosales). But the header never mentions them. On the home page the only way in is a small text link, "Compare WooCommerce POS systems", under the final CTA band, about 9 screens down on phone, plus a footer link. "Roadmap" gets a header slot and comparing does not.
- Why it costs: Someone weighing alternatives skims the header, sees nothing about other POS options, and goes to Google for "WCPOS vs Square". There they land on someone else's comparison. The site's strongest proof (sourced, dated, and frank about where Square or FooSales win) goes unseen by the people it was written for.
- Fix: Add a "Compare" link (→ /compare) to `navLinks` in `src/components/main/site-header.tsx`, after Pro and before Documentation, adding a `header.compare` key to each locale (copy the existing `footer.compare` value, e.g. "Compare").
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare hub, phone (390) and desktop.
- Element: The lede says "Sourced, dated comparisons with Square, FooSales, Oliver POS and other WooCommerce POS options", but the cards below run Oliver POS → WooCommerce's official POS → Square → Jovvie → Vitepos → YITH → **FooSales last**.
- Problem: The card order contradicts the lede and puts the rivals a shop owner most likely shortlisted at the bottom. On phone, "WCPOS vs FooSales" is the 7th card, about 5 screens down, below Jovvie, Vitepos and YITH, which I've never heard of. Square is 3rd, below Oliver.
- Why it costs: A skimming visitor scans the first two or three cards, doesn't see FooSales, and decides there's no comparison for it. They'd scroll back up or leave rather than read seven cards.
- Fix: Reorder the hub cards to follow the lede (Square, FooSales, Oliver POS, WooCommerce's official POS, then the rest), which only changes the array order at `src/app/[locale]/(main)/compare/page.tsx:15-21`. Keep the ItemList JSON-LD in the same order.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare/square (and by the same template the other six comparison pages), all viewports.
- Element: The page emits `BreadcrumbList` JSON-LD, but there's no visible breadcrumb above the H1 "WCPOS vs Square for WooCommerce". The body (13 internal links, the same count as the home page, so nav and footer only) never links to /compare or to a sibling comparison. The only way back is the small "Compare WooCommerce POS systems" link under the final CTA.
- Problem: The breadcrumb markup describes navigation the visitor can't see. The seven comparison pages also don't link to each other, so link equity and crawl paths all go through the footer, and a reader who finishes the Square page has no in-body next step to "WCPOS vs FooSales".
- Why it costs: The comparison cluster is the site's best chance to rank on "X vs Y" searches. Sibling pages that never link in-body are a weaker topical cluster, and breadcrumb rich results are less reliable when the trail isn't on the page. It also ends the shortlisting visitor's session on the page instead of passing them to the next comparison.
- Fix: Render a visible breadcrumb ("Compare › WCPOS vs Square") above the H1 from the same data as the JSON-LD, and add a short "Other comparisons" link row (the hub's titles, minus the current one) before the CTA band, in the shared comparison layout.
- Scope: ok

## Runner-up notes (max 3 lines)
- Home hero subline "WCPOS turns **the** tablet into your register" reads like a typo; "your tablet" (and the nl "de tablet" → "je tablet") is a one-word fix.
- The "Pro" header item is styled bright on every page (home, /compare, /compare/square), so it reads as the current page when it isn't.
- /compare/square phone fold: a six-line, centred grey lede at large size pushes "The short answer" below the fold; left-align it and use a smaller size on phone.
