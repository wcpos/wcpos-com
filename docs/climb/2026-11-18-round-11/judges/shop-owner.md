# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free point-of-sale for my WooCommerce shop that turns a tablet into my till, using the same products, stock and prices, even when the internet drops.
Why version 2: The red "New in 2.0" line says I can now open and close the register, split payments and see today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: / (home), desktop and phone
- Element: "Compare WooCommerce POS systems" (the only comparison link on the page, a small text link under the final "Ready to sell in-store with WooCommerce?" buttons; the header nav has no Compare item either)
- Problem: I came in with Square for WooCommerce and FooSales on my shortlist, and the site already has honest pages for "WCPOS vs Square for WooCommerce" and "WCPOS vs FooSales". The home page hides them behind one small link at the very bottom, after the long empty scroll story. Nothing near the hero or the Free/Pro block says "comparing? here is how we stack up against Square or FooSales".
- Why it costs: A shopper who is comparing tools decides this week. If they can't find the comparison from the home page, they go back to Google and read someone else's roundup, which is often an affiliate list that ranks WCPOS lower. The best proof the site has never gets read by the visitors it was written for.
- Fix: Add one link row under the hero trust strip (or under "Start free. Upgrade when you need more."): "Comparing? WCPOS vs Square · vs FooSales · vs WooCommerce's POS · all comparisons", linking to the existing /compare pages. Or add "Compare" to the header nav.
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare (hub), phone 390x844
- Element: The intro "Every WooCommerce POS roundup on the web is written by a vendor ranking itself first…", followed straight away by the "Who runs this comparison" box
- Problem: On a phone, the first screen shows the H1, a 7-line grey paragraph and the start of a disclosure box. Both say the same thing: it's a vendor and every fact is sourced. Not a single comparison is visible, so you have to scroll a full screen to reach "WCPOS vs Oliver POS". After that, each card takes up about half a screen. "WCPOS vs FooSales" sits last, about five screens down, under tall cards that all end with the same phrase, "where X is genuinely better".
- Why it costs: I skim. A page called "Compare" that opens with a paragraph about other people's roundups, and then a box repeating it, reads like an essay rather than a menu. Visitors bounce before they reach the competitor they came to check.
- Fix: Cut the intro to one sentence. Move the "Who runs this comparison" box below the list, next to "How these comparisons work" (which already covers the same thing). Tighten the card padding on phone so 3–4 competitors fit on the first two screens.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro (and /de/pro, /nl/pro), all viewports
- Element: H1 "WCPOS Pro"; the price block's heading "Get Pro" is not a heading (the only H2s are "What's included in Pro?" and "Frequently Asked Questions")
- Problem: The title targets "Pro Features & Pricing for WooCommerce POS", but the H1 is just the brand name, and neither "WooCommerce", "POS" nor "pricing" appears in any heading on the page. The pricing section has no heading at all, so search engines and screen readers can't see it in the page outline. This is the same gap /downloads had before #748 put "WooCommerce POS" into its H1.
- Why it costs: "woocommerce pos pricing" and "woocommerce pos pro" searches land on a page whose headings don't confirm the query, which weakens relevance against competitors' pricing pages. A visitor who skims for the price block by heading can't find it either.
- Fix: Change `pro.hero.title` to something like "WCPOS Pro for WooCommerce POS". Render `pro.buyBox.heading` as an H2 that reads "Pro pricing" (or "Get Pro: pricing"). Mirror both in the de/nl messages. Prices and plan-term wording stay as they are.
- Scope: ok (only the heading text and tag change; no price or plan-term wording)

## Runner-up notes (max 3 lines)
- /compare hub order puts Oliver first and FooSales last; ordering by how often shoppers shortlist the tool (Square, WooCommerce's own POS, FooSales) would serve my persona faster.
- /downloads phone capture shows "macOS · Detected" at 390px. It's probably the capture user agent, but check that real iPhones get iOS and a "install the plugin first" step before any app.
- /compare/square's "Choose Square if" box is clear and honest. It's the most persuasive page on the site, which is exactly why it needs a link from home.
