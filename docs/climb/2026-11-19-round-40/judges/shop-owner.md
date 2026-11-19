# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free point-of-sale for my WooCommerce shop that turns my tablet, phone or computer into a register using the same products, stock and prices as my website, and it keeps working offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales report, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare (hub), desktop and phone. On phone the Square card is the first thing under the hero (compare-phone-fold.jpg).
- Element: the Square card text, "Square's POS plus a sync extension, versus a register built on WooCommerce: where in-person sales are recorded, syncing, locations, offline payments, card fees, and where Square is genuinely better."
- Problem: I get here from the home link "Weighing up Square or FooSales?" with Square on my shortlist. The card lists what the page covers but never gives the answer. The deciding fact is already on /compare/square: sales made in Square's POS don't become WooCommerce orders, and stock catches up on an hourly check. Every WCPOS sale is a WooCommerce order. This card was my worst marketing defect last round too, and it hasn't changed.
- Why it costs: I skim. A card that promises answers without giving one is one more click before I learn the thing that would make me pick WCPOS over Square for my counter and my market stall. Many visitors won't make that click.
- Fix: Change `compare.hub.squareCard.description` (messages/en.json ~l.1960, plus the locale files) so the fact comes first, for example: "Square's POS sales don't become WooCommerce orders, and stock syncs on an hourly check; every WCPOS sale is a WooCommerce order. Plus fees, locations, offline, and where Square is genuinely better." Do the same for the other cards wherever no plan terms are involved.
- Scope: ok for the Square card, since it uses only facts already sourced on /compare/square. The FooSales card's deciding fact is its subscription and what happens when you stop paying, which is plan-term wording, so that card is needs-front-desk.

## Worst defect — UI
- Page/viewport: /compare/square, phone 390 px (compare-square-phone-fold.jpg and the full shot)
- Element: "The short answer" section. One unbroken paragraph of about 110 words about WCPOS ("WCPOS is a register built on WooCommerce itself: … for a one-time payment that never switches off.") is followed by one of about 90 words about Square ("Square for WooCommerce joins two systems: …"). Both come after a six-line grey hero subtitle.
- Problem: The first screen and a half on phone is all prose. Nothing marks which paragraph is about which product, and the first "Try Live Demo / Download Free" buttons and the "At a glance" table only appear about two screens down. This is still unchanged from round 39.
- Why it costs: A section headed "short answer" that takes 200 words to read gets skipped by a skimmer on a phone. The table, which is what I actually compare with, is buried under it.
- Fix: Label the two paragraphs with a bold lead-in ("WCPOS:" / "Square for WooCommerce:") and cut each to its first two sentences. The detail is repeated further down the page anyway.
- Scope: ok (copy and markup only, one section of an existing page)

## Worst defect — SEO
- Page/viewport: /compare/square, meta description (all viewports, facts.json)
- Element: "When Square for WooCommerce is the better choice, and when WCPOS is: where sales are recorded, syncing, locations and fees. Compared by the maker of WCPOS."
- Problem: The snippet lists topics but no facts. Someone searching "Square for WooCommerce sync orders" or "Square vs WooCommerce POS" sees no answer in the result. The page's strongest sourced finding is that Square POS sales aren't synced to WooCommerce as orders, while every WCPOS sale is one. That finding never appears in the snippet. The Oliver, Jovvie, Vitepos and WooCommerce-POS descriptions use the same topic-list pattern.
- Why it costs: A comparison page earns its click by answering in the snippet. A topic list looks like every other "X vs Y" result and loses the click to Square's own page.
- Fix: Rewrite `compare.square.metadata.description` (messages/en.json ~l.2371) in about 150 characters, for example: "Square POS sales don't become WooCommerce orders; every WCPOS sale does. Sync, locations, card fees and when Square is better, compared by WCPOS's maker."
- Scope: ok (one metadata field and its locale copies; the existing metadata-length test covers the length)

## Runner-up notes (max 3 lines)
- /compare/square: the Card payments row lists 8 Pro terminals plus Vipps (about 12 lines on phone), but the prose "How do card payments work?" lists six. The two lists disagree on Mercado Pago, PayArc and Windcave.
- Home desktop nav: "Pro" is drawn in white on the home page, as if it were the current page, while the other links are grey (home-desktop-fold.jpg).
- Home title "WCPOS - Point of Sale for WooCommerce" still lacks the head term "WooCommerce POS" and "free", and it has room for both.
