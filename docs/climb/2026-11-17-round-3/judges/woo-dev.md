# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that turns a tablet into a register selling from the store's own catalogue, stock and prices, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro (and the home "Start free. Upgrade when you need more." Pro card), desktop and phone
- Element: the "What's included in Pro?" list: "Payment Terminal Integration · Stock & Price Editing · Order Management · Customer Management · Reports Across Days, Registers & Stores · Custom Payment Gateways". There is no entry for multiple stores or extra registers.
- Problem: The pages that sell Pro never say that Pro adds stores and registers. Other pages do: /downloads ("…full reports, multi-store and priority Discord support"), every /compare page ("Pro adds: multi-store management, more registers…"; "One register in the free version; more registers and multi-store management in Pro"), and the /compare FAQ ("per-store addresses, tax rates, receipt templates, pricing, and authorized users"). Meanwhile the home Free card says "No limits." and the /pro FAQ only answers "How many sites… 2 sites… one live site and one development site". Someone reading /pro would think two stores means two licences, or that Free already covers it.
- Why it costs: My client has two stores, so this is the first thing I check. I can't tell from /pro whether that is one Pro licence, two licences, or free. I would have to ask before recommending WCPOS, which is the sales call the site should save me. It also leaves out the Pro feature most likely to win an agency.
- Fix: Add a "Multiple Stores & Registers" item to the /pro feature list and the home Pro card. Reuse the existing compare wording: "Run more than one store and more registers from one WooCommerce site, each with its own address, tax rates, receipt template, pricing and staff." Add one /pro FAQ line saying the 2-site licence counts WordPress sites, not stores.
- Scope: ok (the claim is already on /downloads and /compare; no change to price or terms)

## Worst defect — UI
- Page/viewport: /extensions, phone (390px), also visible at desktop width
- Element: the link on each card repeats the full product name, e.g. "Mercado Pago Terminal for WooCommerce documentation →" and "Square Terminal for WooCommerce documentation". The "Pro" badge sits at the far right, apart from the wrapped title.
- Problem: All 15 cards repeat the title in their link, so each wraps to two lines in accent red. That makes every card about twice as tall, and the page runs to about 10,000px on a phone (shots/extensions-phone-full.jpg). The red links are the loudest text on the page and drown out the descriptions. Because the badge floats right on its own, it is unclear which line it labels, and the one free item (WCPOS Polylang) is hard to spot.
- Why it costs: I open this page to check which card terminals and multilingual plugins are supported. Here I'm scrolling a wall of near-identical red links when I want to compare terminals at a glance.
- Fix: Change the visible link text to "Documentation →" and keep the full name in `aria-label`. Put the Pro badge inline right after the title, not justified to the far edge.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /extensions, all viewports
- Element: `<title>` "Extensions | WCPOS", meta description "The extensions available for WCPOS, each with a link to its documentation.", H1 "Extensions"
- Problem: This is the only page that lists the card-terminal integrations (Stripe Terminal, Square Terminal, SumUp, Mollie, PayPal Reader, Mercado Pago, Windcave) and the WPML, Polylang and ATUM integrations. Its title, description and H1 contain none of those terms, and not even "WooCommerce" or "POS". It can't rank for "WooCommerce POS Stripe Terminal" or "WooCommerce POS card reader", even though those are high-intent searches.
- Why it costs: Developers search for the integration, not the brand. The page with the answer is indexed under a generic title and loses those clicks to competitors' integration pages.
- Fix: Change the title to "WooCommerce POS Extensions: Card Terminals, WPML & More | WCPOS". Change the description to "Card terminal and plugin integrations for WCPOS: Stripe Terminal, Square, SumUp, Mollie, PayPal Reader, Mercado Pago, Windcave, WPML, Polylang and ATUM." Change the H1 to "WCPOS extensions for WooCommerce".
- Scope: ok

## Runner-up notes (max 3 lines)
- Home "Built for the demands of physical retail": "Smooth checkout flow" carries a Pro badge, while the Free card lists "Basic checkout", so it reads as if checkout itself is paid. Retitle it "Card terminals & gateways at checkout" or drop the badge.
- Home "Bring your own hardware": "Card terminals… Plug in what's already on your counter" doesn't say that terminal integration is Pro. Add "(card terminal integration with Pro)".
- /support title "Support | WCPOS" is just as generic as /extensions. Use "WCPOS Support: WooCommerce POS Help & Docs".
