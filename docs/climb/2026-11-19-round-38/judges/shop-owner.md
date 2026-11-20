# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free app that turns my tablet, phone or computer into a till for my WooCommerce shop, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: The small "New in 2.0" line says I now get open/close the register, split payments and today's sales for free. It is answered, but it sits in small type above the headline and is easy to skim past.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square (and the same cell on every /compare/* page), the "At a glance" table, desktop and phone
- Element: Card payments row, WCPOS cell: "Pro terminal integrations: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Mercado Pago, PayArc, Windcave; Vipps MobilePay by QR code or push"
- Problem: The table is the part I actually read, and the only card answer it gives for WCPOS is the Pro integrations. The Square column next to it reads "Square payments, including Tap to Pay on iPhone and Android". Nothing in the row says that free WCPOS already takes card payments on my own standalone terminal and records them on the order. The home page says this ("Cash or card on your own terminal" in the Free list), and so does the Offline row two lines further down.
- Why it costs: For my counter and market stall, card payments decide it. Skimming this row, I conclude that WCPOS can't take a card until I pay for Pro, while Square can for free. That pushes me to Square or makes the Pro price look mandatory. On the FooSales page the same cell gives the same wrong impression.
- Fix: Start the WCPOS cell (messages key `…cardPayments.wcpos` in each compare page) with "Free: cash, and cards on your own separate terminal, recorded on the order. Pro adds terminal integrations: …". This only restates a fact the site already gives.
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare/square, "At a glance" table, phone (390px)
- Element: The column label "Square POS + Square for WooCommerce", repeated above the Square value in every one of the 9 stacked rows
- Problem: On phone each row stacks the two columns, and each cell repeats its column label. The Square label wraps to two lines while "WCPOS" is one, so in every row the Square value starts about a line lower than the WCPOS value (see In-person sales, Price, Card fees). That adds roughly 18 lines of grey label noise to a table that is already about two and a half screens long.
- Why it costs: The table is the fastest answer on the page, but on phone the two sides don't line up and the label noise is louder than the facts. I end up scrolling through repeated grey text instead of comparing values side by side.
- Fix: In `src/components/compare/glance-table.tsx`, show a short column label on phone (e.g. "Square", via a `colSquareShort` message shown below `sm`), or align both value blocks to a shared label row, so both values start on the same line.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (home), `<title>`, all viewports
- Element: "WCPOS - Point of Sale for WooCommerce"
- Problem: The home page title (37 characters, with roughly 20 to spare) never uses the head term "WooCommerce POS", and neither does the H1 ("Your WooCommerce store, at the counter."). Every other page title does: "… for WooCommerce POS | WCPOS", "Download WooCommerce POS …", "Compare WooCommerce POS …". The title also leaves out "free", the strongest search hook and the first word of the meta description.
- Why it costs: "WooCommerce POS" and "free WooCommerce POS" are what a shop owner like me types. The strongest page on the site matches that phrase only in its meta description, which Google gives little weight. The SERP line also gives no reason to pick WCPOS over the Square and FooSales results next to it.
- Fix: Change the home metadata title to "WCPOS – Free WooCommerce POS for Web, Desktop & Mobile" (or similar, at most 60 characters) and update the localized titles to match.
- Scope: ok

## Runner-up notes (max 3 lines)
- /compare/square lists 8 Pro terminal integrations in the table but 6 in "How do card payments work?" (no Mercado Pago, PayArc or Windcave), so a visitor can't tell which list is right.
- /compare/square "What Square for WooCommerce doesn't do" still says "As verified on 2026-10-06", while the table caption and footer say the facts were checked again on 2026-11-18. The stale date undercuts the "sourced and dated" promise.
- /compare hub on phone: the Square card fills the whole first screen, and FooSales, the other product on my shortlist, only appears after a scroll. Shorter card blurbs on phone would show both.
