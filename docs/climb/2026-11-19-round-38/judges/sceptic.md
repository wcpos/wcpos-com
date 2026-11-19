# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source point of sale that runs on my tablet, phone or computer and sells straight from my WooCommerce catalog, stock and prices. Unlike Square, it doesn't need a second system to sync.
Why version 2: The "New in 2.0" line says opening and closing the register, split payments and today's sales are now free. It names features Square Free already has, so to me it reads as catching up rather than pulling ahead.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, all viewports, the "Where Square is genuinely better" list (first bullet). Key `messages/en.json:2470`.
- Element: "Square's POS has a free plan, Square Free ($0/month per location). WCPOS Pro costs $129 or more."
- Problem: The bullet sets Square's free plan against WCPOS's paid tier, as if WCPOS had no free option. The same page says "WCPOS is free, with no caps on products, orders, customers, or cash sales" and has "Free plugin with no caps" in the glance table. Square's real advantage is narrower: Square Free includes integrated card payments at $0/month, while in WCPOS a connected card terminal needs Pro. The bullet never says this.
- Why it costs: This is the page's "honest concessions" list, and buyers comparing options read it most closely. As written, WCPOS gives away price, the dimension where it actually leads (no transaction fees and a free core). A buyer who skims the concessions leaves thinking "Square is free, WCPOS costs $129." The bullet also contradicts the page's own short answer, which weakens the "every number is sourced, check everything" trust pitch.
- Fix: Name the real gap and keep the price phrase word for word: "Square Free ($0/month per location) includes integrated card payments; in WCPOS, connected card terminals need Pro. WCPOS Pro costs $129 or more." Apply the same change in all locales.
- Scope: ok. This is a copy change in one bullet. The "$129 or more" wording stays as it is, so it doesn't touch the held price wording, and the terminals-need-Pro fact is already stated on the same page.

## Worst defect — UI
- Page/viewport: /compare/square, phone (390 px), the "At a glance" table.
- Element: the per-cell column label "Square POS + Square for WooCommerce", repeated above the right-hand cell in all nine stacked rows.
- Problem: At phone width every row repeats a 2-line grey label in the right column next to the 1-word "WCPOS" label. That adds about 18 lines of chrome to the most important table on the page. The two columns no longer line up, because the Square value always starts a line lower than the WCPOS value. That makes the side-by-side comparison harder to scan.
- Why it costs: A comparison table is meant to be scanned on a phone, row by row. The repeated long label slows the scan, buries the values, and makes the Square side look denser. This is the second round it has been named.
- Fix: Use a short per-cell label on phone ("Square"), and keep the full column header "Square POS + Square for WooCommerce" on desktop and in the table caption.
- Scope: ok. This is a label string plus a component styling change.

## Worst defect — SEO
- Page/viewport: home (and /nl, /de), meta description, which is the search-result snippet. Key `messages/en.json:58`.
- Element: "Free, open-source WooCommerce POS. Sell offline, split payments, open and close the register, free in 2.0. Web and desktop apps; iOS and Android in beta."
- Problem: The first claim in the snippet is an unqualified "Sell offline". Every page that explains it (/downloads, /compare/square glance table and FAQ) limits it to cash sales and sales on a separate card terminal, and says connected card readers and online gateways need a connection. The snippet also lists features, ending in "open and close the register, free in 2.0", and never says what the product is for: selling in your shop from the WooCommerce catalog.
- Why it costs: A buyer comparing search results with Square's own snippet (offline card payments) reads "Sell offline" as card-reader offline. They later find the caveat on the site, which damages trust at the first click. A list of features also earns fewer clicks than a snippet that states the benefit.
- Fix: Change it to something like "Free, open-source WooCommerce POS: sell in-store from your WooCommerce products and stock, with cash and card-terminal sales working offline. Register open/close and split payments free in 2.0." (about 155 characters). Update the nl and de versions to match.
- Scope: ok. This is a metadata copy change and adds no new claim. The home body line "Internet drops? Keep selling" is held separately, so this changes only the snippet.

## Runner-up notes (max 3 lines)
- /compare/square: the glance table lists 8 terminals plus Vipps, but the "How do card payments work?" text lists only 6 and leaves out Mercado Pago, PayArc and Windcave. With two lists that disagree on the same page, a buyer doesn't know which to believe.
- /downloads: "WordPress 5.6+ · WooCommerce 9.0+" is inconsistent, because WooCommerce 9.0 itself needs a much newer WordPress. Also, the 2.0.0 release note still says "till" twice and "card readers handled at the register itself", with no note that card readers need Pro.
- Home: the "New in 2.0" eyebrow sells features every rival already has free. The 2.0 story that sets WCPOS apart is its own checkout and offline cash and terminal sales, which a front-desk copy call would need to bring in.
