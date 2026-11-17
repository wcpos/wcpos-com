# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source add-on for my WooCommerce shop that turns a tablet into the till, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: Opening and closing the register, split payments and today's sales report are now free ("New in 2.0 · Open and close your register, split payments and see today's sales — free.").

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 7 |

## Worst defect — Marketing
- Page/viewport: /compare/square, and in the same way /compare/foosales and the other five /compare/* pages. Both viewports.
- Element: after "Which should you choose?" and the FAQ, the page ends with "Spot an error? Email support@wcpos.com — we correct fast and log every change." and then the footer. The only next step anywhere on the page is a plain inline link halfway down "What does it cost?": "Try everything first at demo.wcpos.com/pos (login demo / demo)." (`src/app/[locale]/(main)/compare/square/page.tsx:253`)
- Problem: I'm choosing between Square, WCPOS and FooSales, and this is the page that answers my question. "Choose WCPOS if: …" persuades me, but then there's no "Try Live Demo", no "Download Free" and no "See Pro pricing". The home page has a closing band ("Ready to sell in-store with WooCommerce?" with both buttons), and the comparison pages don't use it. Round 4 deferred this; it's still live.
- Why it costs: Someone who reaches a "vs Square" or "vs FooSales" page from search has already shortlisted, so they're the visitor most ready to try it. When the page ends on a corrections notice and a footer, the next click is the back button to Google, and maybe to the competitor's page.
- Fix: Render the existing home `cta-section` (same copy and buttons: Try Live Demo / Download Free) after the FAQ on every /compare/* page.
- Scope: ok (reuses an existing component and existing copy; no new claims)

## Worst defect — UI
- Page/viewport: /compare hub, phone 390x844
- Element: on the first screen there's the 3-line H1 "Compare WooCommerce POS systems", a 7-line intro ("Every WooCommerce POS roundup on the web is written by a vendor ranking itself first … we say when a competitor is the better fit."), and then the boxed "Who runs this comparison" card, which says the same thing again ("We obviously have a horse in this race — so every number is sourced and dated …"). The cookie bar cuts the box off. None of the seven comparison cards appears.
- Problem: #722's padding cut brought the first card ("WCPOS vs Oliver POS") into the desktop fold, but on phone the first screen is still two copies of the same disclaimer and no list. The cards I came for ("WCPOS vs Square for WooCommerce", "WCPOS vs FooSales") are two to three screens down, and Square and FooSales are 3rd and 7th in the list.
- Why it costs: I'm on my phone at the market stall and I tapped through for Square and FooSales. A wall of "we're honest, really" text with nothing to tap reads as defensive, and a skimmer leaves before scrolling.
- Fix: On the hub only, move the "Who runs this comparison" box below the card list (the intro already makes the same disclosure), so the first card starts on the first phone screen.
- Scope: ok (reorders sections on an existing page; no copy invented)

## Worst defect — SEO
- Page/viewport: /compare/square (the same on the other /compare/* pages), both viewports
- Element: facts.json gives internalLinks 13 for /compare/square, the same as the bare header-and-footer chrome on /support and /extensions. There's no visible breadcrumb, though the page emits `BreadcrumbList` JSON-LD. The body has no links to /compare, /pro, /downloads or the sibling comparisons, even where it says "Pro is $129 …", "Pro adds: …" and "WCPOS is free …".
- Problem: Every comparison page is a dead end in its body. The hub links out to the seven pages, but they don't link back, to each other, or to /pro and /downloads. The breadcrumb exists only in structured data and nothing on the page matches it. Round 4 deferred this too; it hasn't changed.
- Why it costs: These are the site's highest-intent long-tail pages ("WCPOS vs Square", "vs FooSales"). With no contextual links they pass no weight to /pro and /downloads and don't reinforce each other as a cluster. A visible breadcrumb that matches the markup also makes the breadcrumb more likely to show in search results.
- Fix: Add a visible "Compare › Square for WooCommerce" breadcrumb above the H1, link "Pro" in "What does it cost?" to /pro and "free" to /downloads, and end each page with an "Other comparisons" row linking the six siblings.
- Scope: ok (links and markup on existing pages)

## Runner-up notes (max 3 lines)
- The header "Pro" item is red on every page (`site-header.tsx:60`, `highlight: true`), so on /compare/square it looks like the current page. "Compare" is footer-only, so a shop owner who is shortlisting can't find it from the header or the home page body.
- The /compare/square "Offline" row ("take cash sales offline; connected card readers … need a connection") leaves out that Card-tender sales on an external terminal also complete offline in 2.0, which matters for a market stall.
- The /compare/square title and description run long ("… (2026): An Honest Comparison | WCPOS", a 219-character description) and will be truncated in search results.
