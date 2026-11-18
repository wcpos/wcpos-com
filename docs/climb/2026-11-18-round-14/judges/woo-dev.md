# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone, the "How it fits together" section (key `downloads.howItFits.points.sync.body`, all locales)
- Element: "Every app reads and writes the same store — Ring up a sale on the desktop, refund it on your phone — one set of products, orders and customers, updating in real time."
- Problem: This section describes the free plugin plus free apps ("One plugin is the only setup… the free plugin"), and it gives refunds on a phone as its example. On the site's own terms, refunds are Pro. The home grid marks "Order history & management — process returns" as Pro, /pro's Order Management card says "refund them", and step 3 lower on the same page says Pro "adds terminal payments, refunds and stock control". The phone apps are also still beta. So the page contradicts itself about Free and Pro.
- Why it costs: When I recommend a tier to a client, I list what Free does. This sentence would have me promise counter refunds on Free. The client finds out after install that refunds need a licence, and that comes back to me. It is also the first page a developer reads before installing, so it is where Free and Pro need to be clearest.
- Fix: Swap the example for something Free does, e.g. "Ring up a sale on the desktop and the stock drops on every other till — one set of products, orders and customers, updating in real time." Change the same string in every locale.
- Scope: ok. Copy only, and it removes an overclaim rather than adding a claim.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440 (first row of cards in the fold) and phone 390
- Element: the accent-red link under every card, "Mercado Pago Terminal for WooCommerce documentation →" (`extensions.docsLink: "{name} documentation"`, rendered in `extensions/page.tsx:122`)
- Problem: Not fixed since round 13. Each card repeats its full title as a red link, and on desktop the link wraps to two lines on all three cards in the fold. Across 15 cards, the red repeated names outweigh the white titles, the small "Pro" pills and the one-line descriptions, which are what I scan for.
- Why it costs: I came to this page to answer "which terminals and stock plugins work, and which are Pro?", and the noisiest thing on it is the same name printed twice. On phone, each card gets two lines longer, so the list scrolls much further.
- Fix: Make the visible text "Documentation" (translated per locale) and keep "{name} documentation" as the link's accessible name (`aria-label` or a sr-only span), so the anchors stay unique for screen readers and crawlers.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (home), all viewports. `src/components/home/features-section.tsx` contains no `href`, and home has 13 internal links in facts.json, as in round 13.
- Element: "Smooth checkout flow — … Pro connects card readers like Stripe Terminal and SumUp." and "Order history & management Pro"
- Problem: The home body names specific terminals and Pro features but links neither to /extensions ("WooCommerce POS Extensions & Card Terminals", with ItemList JSON-LD) nor to /pro. /extensions gets links from home only in the footer. Round 13 added this kind of contextual link to the /compare/* pages, but the home page, which has the most authority, still has none in its feature grid.
- Why it costs: The page with the most authority passes no anchor text ("card readers", "Stripe Terminal") to the page that targets card-terminal searches. A developer checking hardware support hits a dead end on the home page.
- Fix: In the "Smooth checkout flow" card, link "card readers like Stripe Terminal and SumUp" to /extensions with the same `t.rich` tag pattern #759 used.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro "More Registers & Multiple Stores" still doesn't say that stores are locations in one WooCommerce site sharing its stock (per-location stock needs ATUM). Next to the "2 sites (live + dev)" FAQ, a two-shop agency can still read it as two licences. needs-front-desk (plugin fact check pending since round 13).
- /support: the H1 "How can we help?" has no keyword, and the body is only the AI widget plus Discord. There are no links to docs topics a developer looks for (REST API, hooks, requirements).
- No page says how POS orders appear in WooCommerce (order status, created-via, which tax address applies at the counter), even though the mockup shows "Tax based on: Shop base address". After stock, this is a developer's next question.
