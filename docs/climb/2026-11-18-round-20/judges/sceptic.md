# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A WooCommerce-connected register that uses my existing catalog, stock and prices, with a free, open-source core.
Why version 2: Register opening and closing, split payments and today’s sales reporting are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, offline section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise omits the payment restrictions explicitly stated on Downloads. Cash and externally handled card sales work offline; connected readers and online gateways need a connection.
- Why it costs: Inferred: a buyer comparing Square’s offline card payments could assume equivalent functionality and discover the limitation during an outage.
- Fix: Specify that cash and externally handled card sales continue offline, while connected readers and online gateways require internet.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, “Install the free plugin” card.
- Element: “.zip”
- Problem: Observed in source: this button targets the GitHub releases index, not a ZIP download. Its label conceals an additional selection step.
- Why it costs: Inferred: a shop owner expecting an installable plugin instead reaches a developer-oriented release list and must identify the correct download.
- Fix: Rename the button “Find ZIP on GitHub” so its destination and required next step are explicit.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare`, search metadata for desktop and mobile.
- Element: “Honest, sourced comparisons of point of sale systems for WooCommerce — architecture, real free-tier limits, pricing, offline support, and when to choose each one.”
- Problem: Observed: the description names none of the competing systems covered. It spends search-preview space asserting honesty instead of showing buyers that their shortlist is included.
- Why it costs: Inferred: weaker click relevance for shoppers evaluating Square, FooSales or the official WooCommerce POS; no ranking penalty is established.
- Fix: Use “Compare WCPOS with Square, FooSales, WooCommerce’s official POS and more: sourced differences in payments, offline selling, devices and pricing.”
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: “Plug in what’s already on your counter” needs a clearer qualification alongside the site’s supported terminal extensions.
Observed: all supplied Lighthouse SEO scores are 100; captured phone document widths are 390px, including Dutch and German pages.
Not verified: screenshot appearance and live interactions; this assessment used the permitted text, JSON and source reads.