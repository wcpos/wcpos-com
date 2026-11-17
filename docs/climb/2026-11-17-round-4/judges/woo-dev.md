# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin and app for WooCommerce that runs the counter from the store's own catalogue, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone. Also the home "Start free. Upgrade when you need more." Pro card.
- Element: The "What's included in Pro?" list ("Payment Terminal Integration · Stock & Price Editing · Order Management · Customer Management · Reports Across Days, Registers & Stores · Custom Payment Gateways"), and the home Free card's "Free forever. No transaction fees. No limits."
- Problem: Neither sales page says that Pro is what adds more stores and more registers. Other pages on the site do say it: /compare/square has "Pro adds: multi-store management, more registers…", "Multiple stores / locations — Yes (Pro): per-store addresses, tax rates, receipt templates, pricing, and authorized users", and "the free version also includes one register". /downloads has "…full reports, multi-store and priority Discord support". On /pro, stores only show up inside a reports line, and the only licence FAQ is "activated on 2 sites, intended for one live site and one development site". The home Free card says "No limits." even though Free has one register.
- Why it costs: My client has two stores, so this is the first thing I check. From /pro I can't tell whether that needs one Pro licence, two licences, or nothing at all, and "No limits" suggests Free already covers it. I'd have to ask before recommending WCPOS, which is the sales call the site should save me. It also leaves out the Pro feature most likely to win an agency. This was my worst defect in round 3 too, and it is still there.
- Fix: Add a "Multiple Stores & Registers" item to the /pro feature list and to the home Pro card, reusing the /compare wording: "More registers, and more than one store on one WooCommerce site, each with its own address, tax rates, receipt template, pricing and staff." Add one /pro FAQ line saying the 2-site activation counts WordPress sites, not stores.
- Scope: ok. The claim already appears on /compare and /downloads; price and terms are unchanged. Front desk: the FAQ line on how sites are counted should be checked against licensing before it ships.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440 and phone 390
- Element: The link at the bottom of each card repeats the full product name, for example "Mercado Pago Terminal for WooCommerce documentation →", "Stripe Terminal for WooCommerce documentation →" and "WCPOS StoreApps Smart Coupons documentation →". On the "Windcave Terminal for WooCommerce" card, the Pro badge wraps onto a line of its own.
- Problem: Round 3 put the badge inline, but the link text is unchanged. On 9 of the 15 cards in the 3-column desktop grid, the red link runs to two lines and its arrow is pushed to the card's far edge, away from the text (`justify-between`). On phone, every long name makes the card taller again. The repeated red names are the loudest text on the page, louder than the descriptions I came to read, and the orphaned "Pro" badge on Windcave looks like a stray chip.
- Why it costs: I open this page to compare which terminals and multilingual plugins are supported. Instead I'm reading every product name twice in accent red, and the cards are uneven heights, so scanning the grid is slow.
- Fix: Make the visible link text "Documentation →", keep the full name in `aria-label` (`messages/*.json` `docsLink`), and keep the arrow inline with the text rather than justified to the card edge.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home "Works with the equipment you already have." block and the /pro "Payment Terminal Integration" item, all viewports
- Element: "Card terminals, thermal receipt printers, barcode scanners — WCPOS doesn't lock you into proprietary hardware." and "Connect card readers and payment terminals for fast, accurate in-person payments." Neither has a link. facts.json counts 13 internal links on home and 14 on /pro, almost all from the nav and footer.
- Problem: In round 3, /extensions was retitled "WooCommerce POS Extensions & Card Terminals" so that it can rank for terminal searches. But the only links to it are the footer "Extensions" link on every page and nothing in a page body. The two passages that talk about card terminals, on the two strongest pages, don't link to the page that lists them (Stripe Terminal, Square, SumUp, PayPal Reader, Mollie, Windcave, Mercado Pago, PayArc, Vipps), and they don't name a single terminal.
- Why it costs: A footer-only link carries little weight and has no descriptive anchor, so the retitled page gets little help from the home page and /pro, which hold the site's authority. Visitors who want to know whether their client's reader is supported hit a dead end, or have to go to the docs.
- Fix: Add a contextual link "See supported card terminals →" (to /extensions) after the home hardware paragraph and in the /pro "Payment Terminal Integration" item, in all locales.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro H1 is just "WCPOS Pro" (the /de and /nl pages are the same), and the page has only two H2s. Something like "WCPOS Pro for WooCommerce POS" would carry the query the title already targets.
- /downloads still says "Offline-first, so the till never stops". Under the 2.0 facts, integrated readers and online gateways need a connection, so the line overstates it.
- Nothing on the site says how taxes are handled (WooCommerce tax settings, per-store tax location). The only mention is the mockup's "Tax based on: Shop base address", and a developer asks this before stock.
