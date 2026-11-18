# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns a tablet (or any screen) into the register for your WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales, all free. The line answers the question, but it is small print above the kicker and links nowhere.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square on phone (390), and every /compare/* page, which all share the layout.
- Element: The first screen holds the H1 "WCPOS vs Square for WooCommerce", the centred six-line lead "Many WooCommerce stores sell in person with Square's POS app…", and the card "Who runs this comparison — This page is published by kilbot, the maker of WCPOS. We obviously have a horse in this race…". "The short answer" begins below the fold.
- Problem: Someone who searched "WCPOS vs Square" scrolls through about 1.3 screens of preamble (a lead set at large size and centred, then a seven-line disclosure) before reading one fact about either product. The disclosure matters, but it is about the page, not the products, and it sits where the verdict should be. On desktop the short answer is close enough; on phone it is not. This was deferred in round 8 after the shop-owner and sceptic judges named it, and it is unchanged.
- Why it costs: These pages are the site's search entry points for shoppers who are comparing options. A phone visitor who sees no answer on the first screen goes back to the results. The page's real strength, "every sale is a WooCommerce order", is hidden below a paragraph about the publisher.
- Fix: On every /compare/* page, render "The short answer" directly under the lead, and move the "Who runs this comparison" card below it, or below the "At a glance" table. Keep the copy as it is.
- Scope: ok. It reorders existing blocks in the seven compare page files, with no copy, claim or pricing change. If the disclosure-first order was chosen on purpose for trust, mention it to the front desk; it can stay in view as a one-line link right under the lead.

## Worst defect — UI
- Page/viewport: /compare/square on phone (390), and the "At a glance" table on every /compare/* page (each page has its own `ComparisonTable`, e.g. `src/app/[locale]/(main)/compare/square/page.tsx:130-162`).
- Element: The "At a glance" table: a three-column `<table>` with the row label ("In-person sales", "Devices", "Countries", …), "WCPOS" and "Square POS + Square for WooCommerce".
- Problem: At 390 px the row-label column takes about 35% of the width, so each answer column is about 110 px wide. Cells wrap to 5–9 lines: "Devices" is nine lines on the Square side, "Offline" is ten on the WCPOS side, and the column header "Square POS + / Square for / WooCommerce" breaks over three lines. The nine rows make up about 2,500 px of narrow, ragged text whose two columns never line up. Neither column can be scanned, and on phone the table, which is the most useful block on the page, is the hardest thing to read. In nl and de the longer compounds will make it worse.
- Why it costs: The glance table is what a comparison visitor came for, and what the code comment says answer engines extract. On phone it reads as a wall of text, and both the comparison and the site's polish suffer at the moment of decision.
- Fix: Below `sm`, give each row label its own full-width header row (`<tr class="sm:hidden"><th colSpan={2} scope="colgroup">`), and hide the label cell from the data row (`hidden sm:table-cell`). The two answer columns then each get about half the width. Shorten the column header to the product name on phone. Keep the desktop table unchanged.
- Scope: ok. It changes markup and responsive classes only in the compare pages' table component. The cells, copy and table semantics stay the same.

## Worst defect — SEO
- Page/viewport: /support (all locales), search-result title and H1.
- Element: `<title>` "Support | WCPOS" (15 chars). H1 "How can we help?". Meta description "Ask anything about WCPOS and get an instant answer from our docs, or chat with the community on Discord." (104 chars)
- Problem: It is the only indexable page whose title and H1 have no category term: no "WooCommerce", no "POS", no "point of sale". The description is 50 characters under budget and does not say "WooCommerce" either. Every other captured page names WooCommerce in its title. This has been open since round 7 (sceptic; designer and seo runner-up).
- Why it costs: "woocommerce pos support" and "wcpos help" searches match only on brand, and to someone who does not know the name, the snippet shows a page with no category. The page also wastes the 40 characters it could use to rank for help-intent queries.
- Fix: Change the title to "WCPOS Support: WooCommerce POS Help & Docs | WCPOS". Extend the description to name WooCommerce POS setup, printers and scanners, which are the existing suggestion chips. Optionally add a visually small "WooCommerce POS support" kicker above the H1. Do this for every locale.
- Scope: ok. It changes metadata and copy only, with no new claim.

## Runner-up notes (max 3 lines)
- Home, every viewport: "New in 2.0 · Open and close your register…" is still a plain `<p>` (`story-copy-blocks.tsx:72-91`). Link it to /changelog with "→". It touches the scroll-story, so check it against the owner's PR first.
- Home stats band on phone: "GPL Licensed" uses a GitHub icon where its neighbours have numbers, so its label sits about 12 px off "Languages Supported". The band also says "5,000+ Active Installations" where the hero says "Active Stores". Give it a text stat ("GPL") and use one label.
- Home "Works for stores of all kinds" on phone: each testimonial card opens with a roughly 200 px tinted band that holds only an icon, so three quotes take about three screens. Below `md`, shrink the band to an inline icon.
