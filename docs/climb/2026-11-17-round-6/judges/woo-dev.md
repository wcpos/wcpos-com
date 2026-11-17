# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A point-of-sale plugin for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: The free version now includes opening and closing the register, split payments and today's sales ("New in 2.0 · Open and close your register, split payments and see today's sales — free.").

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports (also the home "Pro" plan list, "Everything in Free, plus:")
- Element: "What's included in Pro?" has six cards: "Payment Terminal Integration", "Stock & Price Editing", "Order Management", "Customer Management", "Reports Across Days, Registers & Stores", "Custom Payment Gateways". None of them is about multiple stores or more registers.
- Problem: This was flagged in round 5 and is still there. The page that sells Pro never says Pro manages multiple stores or adds registers. On /pro, "stores" appears only inside the reports card. Other pages say it plainly. /compare/square: "Pro adds: multi-store management, more registers, …" and "WCPOS Pro manages multiple stores, with per-store addresses, tax rates, receipt templates, pricing, and authorized users". The glance table: "Multiple stores / locations — Yes (Pro)". The /pro FAQ then says "Each license can be activated on 2 sites, intended for one live site and one development site", and with nothing about stores above it, that reads as if two stores would need two licences.
- Why it costs: My client has two stores, so multi-store is the feature that decides the purchase. I found it only on a competitor-comparison page. The buying page never tells me that two stores can run from one WooCommerce site on one licence. With that left open, I either book a sales call or recommend something else.
- Fix: Add a seventh card to `pro.features`, "Multiple Stores & Registers", reusing the /compare wording: "Run more than one store and register from one WooCommerce site, each store with its own address, tax rates, receipt template, pricing and authorized users." Add the same line to the home Pro plan list, in all locales.
- Scope: ok. The site already makes this claim on /compare and /downloads. No new claim, and no price or licence term changes.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440 (and phone 390)
- Element: Every card's link repeats the full product name: "Mercado Pago Terminal for WooCommerce documentation →", "Windcave Terminal for WooCommerce documentation →", "WCPOS StoreApps Smart Coupons documentation →"
- Problem: Also flagged in round 5 and unchanged. At 1440, the link wraps to two lines in 8 of the 15 cards, so the cards have uneven bottoms. The red links outweigh the white card titles. On the Windcave card, the long title pushes the "Pro" badge onto a line of its own. Each terminal name gets read twice before you can tell which extensions are free (Polylang, WPML, WP Multilang) and which are Pro.
- Why it costs: I come to this page to check hardware ("does it work with the client's SumUp or Square terminal?"). The noisy grid is slow to scan, and the Free/Pro split, the thing I need from it, gets lost.
- Fix: Make the visible link text "Documentation →" and keep the full name in an `aria-label` (or an `sr-only` span), so the link stays descriptive for screen readers and Lighthouse.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro and its locale versions (/de/pro, /nl/pro, …), all viewports
- Element: "Frequently Asked Questions": five Q&As ("Is the free plugin limited?", "What's the difference between Yearly and Lifetime?", "What happens when my license expires?", "How many sites can I use my license on?", "What payment methods do you accept?")
- Problem: Unchanged since round 5. facts.json still lists only `Organization, SoftwareApplication` for /pro, /de/pro and /nl/pro. The page shows a full FAQ but outputs no `FAQPage` JSON-LD. /compare/square outputs `FAQPage` and `BreadcrumbList` through an existing helper.
- Why it costs: These are the pre-purchase questions people search for ("wcpos pro license how many sites", "wcpos license expires"). Without markup, search and AI answer engines get no structured answer from the page that converts. A forum thread or a competitor is more likely to answer that query than the official page.
- Fix: Output a `FAQPage` script on /pro from the same `pro.faq` messages, using the helper the compare pages already use, per locale.
- Scope: ok. This is markup only, and the FAQ text stays as it is.

## Runner-up notes (max 3 lines)
- /pro FAQ "Is the free plugin limited? No." contradicts "one register in the free version" on /compare. That is plan-terms wording, so it needs the front desk.
- /support's title is just "Support | WCPOS", and its JSON-LD is only `Organization`. A title like "WCPOS Support – WooCommerce POS Help & Docs" would compete for help queries.
- The nav "Pro" link stays red on every page (e.g. /extensions), so it reads as the current page and makes the real location unclear.
