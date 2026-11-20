# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns the tablet, phone or computer I already have into a register selling from my WooCommerce store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line says register open/close, split payments and today's sales are now free, but it reads like a caption over the H1, not a reason to switch.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, all viewports, the "At a glance" table, "Countries" row (`compare.square…countries.wcpos`, messages/en.json:2406). The same cell is on /compare/woocommerce-pos (en.json:2247), and its FAQ says "WCPOS has no country restriction" (en.json:2344).
- Element: WCPOS "No country restriction" set against Square's "8 countries: US, Canada, Australia, Japan, UK, Ireland, France, Spain — and WooCommerce must use the same currency as the Square account"; then "Choose WCPOS if: … sell outside Square's eight countries".
- Problem: The comparison isn't like-for-like. Square's eight countries are where Square takes card payments. WCPOS's "no restriction" only covers the plugin itself. Every card integration WCPOS sells as Pro (Stripe Terminal, SumUp, Mollie, Windcave, Mercado Pago and others) only works where its provider operates. The same page also sells Pro's Square Terminal integration, which is limited to the same eight countries. So the page contradicts itself: a Square Terminal user outside those countries gets nothing from that row.
- Why it costs: A buyer outside the US or EU (South Africa, India, Latin America) reads this row as "WCPOS takes cards anywhere". They find out otherwise when their terminal provider isn't available, after paying $129. The page promises "every number is sourced… check everything", and this is the one row where WCPOS gives itself a win it hasn't earned. A sceptic who catches it starts discounting the rest of the table.
- Fix: Change the WCPOS cell (both pages) to "The plugin works in any country; cash and your own card terminal everywhere, and each Pro terminal integration where its provider operates". Qualify the "Choose WCPOS if" clause and the woocommerce-pos FAQ sentence the same way.
- Scope: ok (copy qualifier in all locales; no new claim, it narrows an existing one)

## Worst defect — UI
- Page/viewport: /downloads, phone (390 px), step 2 "Pick your device" cards (`src/app/[locale]/(main)/downloads/page.tsx:303` and `:317`).
- Element: Desktop app links "macOS (Apple Silicon) · / macOS (Intel) · Windows · Linux" and Web links "Set up on your store · / Open the live demo".
- Problem: The "·" separators are their own inline spans. At 390 px the links wrap, so a dot is left hanging at the end of the line ("macOS (Apple Silicon) ·", "Set up on your store ·"), with nothing after it on that line. The links read as a broken inline list rather than a set of choices, on the page where the visitor actually downloads.
- Why it costs: /downloads is the conversion page. Stray punctuation next to the download links looks unfinished, which a buyer comparing polished app-store products (Square, Oliver) notices. The links are also small, crowded tap targets on phone.
- Fix: Below `sm`, stack the links one per line and hide the separators (`hidden sm:inline` on the "·" spans, `flex-col sm:flex-row` on the wrapper). Alternatively, render the dot as a `::before` on every link except the first, so it never ends a line.
- Scope: ok (one component's markup and styling)

## Worst defect — SEO
- Page/viewport: /compare/square, search snippet (meta description, messages/en.json:2371; same pattern in the other locales).
- Element: "When Square for WooCommerce is the better choice, and when WCPOS is: where sales are recorded, syncing, locations and fees. Compared by the maker of WCPOS."
- Problem: The snippet lists topics but gives no answer. The hub card for the same page now leads with the verdict (en.json:1960: "Sales made in Square's POS don't become WooCommerce orders, and their stock changes sync on a schedule (hourly by default); every WCPOS sale is a WooCommerce order"). The page that ranks for "Square for WooCommerce vs …" doesn't. "Compared by the maker of WCPOS" also spends the snippet's last words telling a searcher to discount the page before they click.
- Why it costs: Searchers comparing Square with alternatives pick a result from the snippet. A snippet with a concrete, checkable difference (POS sales don't become Woo orders, hourly stock sync) gets the click. A topic list reads like every other affiliate listicle. This is WCPOS's highest-intent comparison query.
- Fix: Lead with the hub verdict, for example "Square POS sales don't become WooCommerce orders and stock syncs hourly; every WCPOS sale is a WooCommerce order. Sourced, dated, and when Square is better." (≤160 chars). Do the same in each locale.
- Scope: ok (one metadata string per locale, reusing shipped copy)

## Runner-up notes (max 3 lines)
- /de home on phone: the balanced H1 breaks "Dein WooCommerce- / Shop an / der Ladentheke.", which splits "an der Ladentheke". The "Neu in 2.0" line leaves "kostenlos." alone on its last line.
- /compare/square: the glance "Card payments" cell names 8 Pro terminals, but the "How do card payments work?" prose names 6 (Mercado Pago, PayArc and Windcave are missing). A sceptic will count them.
- /downloads "It takes about two minutes, start to finish." is an unsourced number on a site that promises "every number is sourced".
