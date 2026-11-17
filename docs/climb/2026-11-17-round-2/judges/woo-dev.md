# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that runs the register off the store's own catalog, stock and prices, with web, desktop and mobile apps and offline selling.
Why version 2: Opening and closing the register, split payments and today's sales report are now free ("New in 2.0" line above the kicker), but it doesn't say whether any of that changes how WCPOS hooks into WooCommerce.

## Scores
| Track | Score |
|---|---|
| Marketing | 6 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (same on /nl/pro, /de/pro)
- Element: the "What's included in Pro?" list: "Payment Terminal Integration", "Stock & Price Editing", "Order Management", "Customer Management", "End-of-Day Reports", "Custom Payment Gateways"
- Problem: The page where I'd decide on Pro for a client with two stores never mentions multi-store, more registers, or reports across registers and stores. The site says these exist elsewhere: /compare/square says "Multiple stores / locations: Yes (Pro): per-store addresses, tax rates, receipt templates, pricing, and authorized users", and the Pro list on /compare/* starts with "multi-store management, more registers". The Pro FAQ then adds "Each license can be activated on 2 sites", which leaves me unsure whether two stores means two WooCommerce sites (two licences) or one site with WCPOS stores (one licence).
- Why it costs: For an agency, multi-store is the reason to buy Pro, and its only mention is on comparison pages a developer may never open. Without it on /pro I'd have to email before recommending Pro, and some readers will assume Pro has no multi-store support and pick a competitor.
- Fix: Add a "Multi-store & registers" item to `PRO_FEATURE_KEYS` and `pro.features.*` in all ten locales. Reuse the existing compare copy ("per-store addresses, tax rates, receipt templates, pricing, and authorized users; more registers") and add one FAQ line: several stores on one WooCommerce site need one licence.
- Scope: ok (the feature copy repeats claims the site already makes). The one-licence FAQ line is licensing wording, so that part is needs-front-desk.

## Worst defect — UI
- Page/viewport: /pro, phone 390x844 (also nl/de, where longer copy pushes it further down)
- Element: the "Get Pro" price box ("$129 USD /yr", "$399 USD once", "Get Started")
- Problem: On phone the single-column grid puts the buy box after the hero, the subtitle and all six feature blocks, about 1,400 px down (about 1,800 px in de). The first screen is the H1 and two paragraphs. Round 1 moved the box up on desktop only.
- Why it costs: Price is the first thing I check on a Pro page. On phone I scroll through two and a half screens of feature text before I see a price or a buy button, and many readers will leave before they get there.
- Fix: On small screens, put the offer column first (`order-first lg:order-none` on the offer wrapper), or show a compact "From $129/yr · See plans" anchor link under the hero subtitle.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, all viewports and locales
- Element: `<title>Downloads | WCPOS</title>`
- Problem: The title has no product-category words. It doesn't contain "WooCommerce", "POS" or "app", or the platforms the page serves (Windows, macOS, iOS, Android). /pro got a keyword title last round; /downloads still has a bare label.
- Why it costs: This page is the natural answer to searches like "WooCommerce POS app download" or "WooCommerce POS Windows app", but the title doesn't match those queries and the result looks generic in search listings next to competitors' descriptive titles.
- Fix: Set `downloads.metadata.title` to "Download the WooCommerce POS App – Windows, macOS, iOS, Android | WCPOS" (translated per locale, same pattern as the round-1 /pro title).
- Scope: ok

## Runner-up notes (max 3 lines)
- Home "Built for the demands of physical retail" grid tags "Smooth checkout flow" and "End-of-day reports" as Pro, but the 2.0 line above the hero says today's sales are free. This free/Pro conflict is pricing-adjacent (needs-front-desk); also, "TAP TO PAY" is still in the hero mockup (deferred to PR #204).
- Home still has two identical H1s, "Your WooCommerce store, at the counter.", and duplicate H2s (deferred to PR #204); the /extensions title and meta description ("The extensions available for WCPOS…") are thin.
- No page explains how WCPOS hooks into WooCommerce for a developer: orders created through the WooCommerce REST API, how tax is calculated, stock reduction, hooks and filters. A "For developers" link from /downloads ("How it fits together") to the docs would answer this without a sales call.
