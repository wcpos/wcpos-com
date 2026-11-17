# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source plugin plus apps that turns my tablet into a till running off my WooCommerce shop's products, stock and prices, and it keeps going when the internet drops.
Why version 2: Opening and closing the register, split payments and today's sales are now free ("New in 2.0 · Open and close your register, split payments and see today's sales — free.").

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 7 |

## Worst defect — Marketing
- Page/viewport: /compare/square (and the other six /compare/* pages, e.g. /compare/foosales), both viewports
- Element: the page ends "Spot an error? Email support@wcpos.com — we correct fast and log every change." and goes straight into the footer. The only way forward on the page is a plain inline link in the middle of "What does it cost?": "Try everything first at demo.wcpos.com/pos (login demo / demo)."
- Problem: This is where I decide between Square and WCPOS. After "Which should you choose?" and the FAQ there is no "Try Live Demo", "Download Free" or "See Pro pricing" button, and nothing about what to do if I've picked WCPOS. The home page has a closing CTA band ("Ready to sell in-store with WooCommerce?"); the comparison pages don't.
- Why it costs: Comparison pages are where people arrive from searches like "WCPOS vs Square" or "vs FooSales", already shortlisting. That makes them the visitors closest to trying it. When the page ends in a corrections notice and a footer, the next click is the back button to Google, not the demo.
- Fix: Put the existing home closing CTA band (same copy and buttons: Try Live Demo / Download Free) after the FAQ on every /compare/* page, or before the sources note.
- Scope: ok (reuses existing copy and component; no new claims)

## Worst defect — UI
- Page/viewport: /compare hub, desktop 1440x900 and phone 390x844
- Element: The H1 "Compare WooCommerce POS systems", then the paragraph "Every WooCommerce POS roundup on the web is written by a vendor ranking itself first … we say when a competitor is the better fit.", then a ~180px empty gap, then a boxed "Who runs this comparison" that says the same thing again ("We obviously have a horse in this race — so every number is sourced and dated…").
- Problem: The first screen has no comparisons in it at all. Not one of the seven cards ("WCPOS vs Square for WooCommerce", "WCPOS vs FooSales", …) is visible above the fold on either viewport. On phone it's only the H1 and the disclaimer paragraph; the box starts at the cookie bar. The hierarchy puts two copies of the same disclaimer above the content the page exists for.
- Why it costs: I came to find Square and FooSales. A skimmer sees a wall of "we're honest, really" text and no list, and may leave before scrolling. The duplicate also makes the disclaimer read as defensive rather than confident.
- Fix: On the hub only, drop the "Who runs this comparison" box (the intro already says it) or move it below the card list, and tighten the hero's bottom padding so the first cards start inside the 900px fold.
- Scope: ok (layout/markup on an existing page; no copy invented)

## Worst defect — SEO
- Page/viewport: /compare/square (same pattern on the other /compare/* pages), both viewports
- Element: facts.json shows internalLinks 13 on /compare/square, the same count as the bare site chrome (/support also has 13). There is no visible breadcrumb, even though the page ships BreadcrumbList JSON-LD (src/app/[locale]/(main)/compare/square/page.tsx:107), and there are no in-body links to /compare, /pro, /downloads or the sibling comparisons (vs FooSales, vs WooCommerce's official POS).
- Problem: Each comparison page is a dead end inside the body. The /compare hub links out to the seven pages, but they don't link back or to each other, and the "Pro adds: … card-terminal integrations …" and "Pro is $129 …" passages don't link to /pro. The breadcrumb exists only in structured data, with nothing matching it on the page.
- Why it costs: These are the site's best long-tail search pages. Without contextual links they pass no weight to /pro and /downloads, and they don't strengthen each other as a topic cluster. A visible breadcrumb backing the BreadcrumbList is also what Google expects before it shows the breadcrumb in results.
- Fix: Add a visible "Compare › Square for WooCommerce" breadcrumb above the H1, link "Pro" in the cost section to /pro, and close with a short "Other comparisons" row linking the sibling /compare/* pages.
- Scope: ok (links and markup on existing pages)

## Runner-up notes (max 3 lines)
- /compare/square "Offline" row ("take cash sales offline; connected card readers … need a connection") undersells 2.0: sales with the Card tender (an external terminal) also complete offline. That matters for my market stall.
- Comparison titles/descriptions run long: "WCPOS vs Square for WooCommerce (2026): An Honest Comparison | WCPOS" and a 219-char description will be cut off in results.
- On every non-Pro page the "Pro" nav item is red, so it reads as the current page (the real current-page pill only appears on /pro). Also, "Compare" sits only in the footer, and a shortlisting shop owner won't find it from the header.
