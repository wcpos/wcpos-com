# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A point-of-sale plugin for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: Opening and closing the register, split payments and today's sales report are now in the free version ("New in 2.0 · … — free").

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports (also the home "Pro" plan card)
- Element: "What's included in Pro?" list: Payment Terminal Integration, Stock & Price Editing, Order Management, Customer Management, Reports Across Days, Registers & Stores, Custom Payment Gateways (six cards; no multi-store item)
- Problem: The page that sells Pro never says Pro manages multiple stores or adds registers. Other pages on the site do: /downloads ("…full reports, multi-store and priority Discord support"), every /compare page ("Pro adds: multi-store management, more registers, …"; "WCPOS Pro manages multiple stores, with per-store addresses, tax rates, receipt templates, pricing, and authorized users"), and the YITH/Vitepos tables ("One register in the free version; more registers and multi-store management in Pro"). On /pro the word "stores" only shows up in the reports card. The FAQ makes it worse: "Each license can be activated on 2 sites, intended for one live site and one development site" reads like two stores would need two licenses.
- Why it costs: For an agency with a two-store client, multi-store is the feature that decides the purchase. I had to find it on a competitor-comparison page, and /pro still never tells me whether two stores need one WooCommerce site and one licence. If the buying page leaves that open, I either book a sales call or recommend something else.
- Fix: Add a seventh card to `pro.features` called "Multiple Stores & Registers". Reuse the site's existing wording: "Run more than one store and register from one WooCommerce site, each store with its own address, tax rates, receipt template, pricing and authorized users." Mirror it in the home Pro plan list.
- Scope: ok. The claim is already made on /downloads and /compare. This adds no new claim and touches no price or licence term.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440 and phone 390
- Element: Every card's link repeats the full product name, e.g. "Mercado Pago Terminal for WooCommerce documentation →", "WCPOS StoreApps Smart Coupons documentation →", "Windcave Terminal for WooCommerce documentation →"
- Problem: The repeated name wraps to two lines in 8 of the 15 cards. Card heights go uneven, and the red links end up louder than the card titles. On the Windcave card the long title also pushes the "Pro" badge onto a line of its own. Scanning the grid, you read each terminal name twice before you find which ones are free (Polylang, WPML, WP Multilang) and which are Pro.
- Why it costs: This is the page where I check hardware support ("does it work with the client's SumUp/Square terminal?"). The grid feels noisy and is slow to scan, and the Free/Pro split, which matters most here, gets lost.
- Fix: Change the visible link text to "Documentation →" and keep the full name in an `aria-label` (or `sr-only` span), so links stay descriptive for Lighthouse and screen readers.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro (and /de/pro, /nl/pro…), all viewports
- Element: "Frequently Asked Questions" (5 Q&As: "Is the free plugin limited?", "What's the difference between Yearly and Lifetime?", "What happens when my license expires?", "How many sites can I use my license on?", "What payment methods do you accept?")
- Problem: facts.json lists only `Organization, SoftwareApplication` for /pro. The page shows a full FAQ but outputs no `FAQPage` JSON-LD, while every /compare/* page does (compare-square: `FAQPage, BreadcrumbList`). These are exactly the pre-purchase questions people search ("wcpos pro license sites", "wcpos license expires"), and the page answering them doesn't mark them up.
- Why it costs: Search engines and AI answer engines get no structured Q&A from the page that converts. A query about licence terms is more likely to surface a forum thread or a competitor than the official answer.
- Fix: Output a `FAQPage` script on /pro from the same `pro.faq` messages, using the helper the compare pages already use, per locale.
- Scope: ok. This is markup only and leaves the FAQ text unchanged.

## Runner-up notes (max 3 lines)
- /pro FAQ "Is the free plugin limited? No." contradicts the compare tables ("One register in the free version"). That is plan-terms wording, so it needs the front desk.
- /support title is just "Support | WCPOS" (15 chars). Something like "WCPOS Support – WooCommerce POS Help & Docs" would rank for help queries.
- /compare/square meta description is 219 chars and gets cut off before "when Square is the better choice".
