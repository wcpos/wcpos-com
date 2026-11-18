# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin that turns a tablet into a register selling from the WooCommerce store's own catalog, stock and prices, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (also the same line in the home pricing teaser, "More registers & multiple stores")
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users."
- Problem: The card never says what a "store" is or how stock works across stores. My client has two shops. I can't tell whether Pro "stores" are locations inside one WooCommerce site or separate WooCommerce sites, and whether the two stores share one stock pool. Lower on the same page, the license FAQ says "2 sites, intended for one live site and one development site", which reads as a contradiction if "stores" means sites. The answer exists (stores are locations in one WooCommerce site and share WooCommerce stock; per-location stock comes from the ATUM Integration extension listed on /extensions), but no page on the site puts those facts together.
- Why it costs: Multi-store stock is the first question an agency asks for a two-shop client. Without it on /pro I can't recommend the product without a support chat or a test install, and the ambiguity next to the "2 sites" FAQ could suggest a second license is needed, which makes Pro look more expensive than it is.
- Fix: Add one sentence to the card description in messages/*.json (pro features "More Registers & Multiple Stores"): "Stores are locations within one WooCommerce site and share its stock; for stock per location, add the ATUM Integration extension." Link "ATUM Integration" to /extensions.
- Scope: ok. This states existing behaviour from the wiki (product/features/pro-and-add-ons.md: multi-store management, ATUM add-on). It does not touch price or plan terms. All locales need the new string.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440 and phone 390
- Element: the link under every card, e.g. "Mercado Pago Terminal for WooCommerce documentation →" (from the `docsLink: "{name} documentation"` string)
- Problem: Each card repeats its own title as an accent-red link. On desktop the link wraps to two lines in all three of the first row's cards, at the same size as the description. Across 15 cards the page reads as a wall of red repeated names. The title, the "Pro" badge and the one-line description, which is what a visitor scans for, lose out to the link.
- Why it costs: When I scan for "which terminals and which stock plugins work", the cards are twice as noisy as they need to be. On phone each card grows by two lines, so the 15-card list scrolls much further.
- Fix: Show the link text as "Documentation" (one translated word per locale) and keep the full "{name} documentation" as a visually hidden span or aria-label, so screen readers and link text for crawlers stay unique.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (home), all viewports. features-section.tsx has zero links.
- Element: "Smooth checkout flow — … Pro connects card readers like Stripe Terminal and SumUp." and the pricing-teaser line "Payment terminal integration"
- Problem: The home page names specific terminals but links to none of them. /extensions ("WooCommerce POS Extensions & Card Terminals", ItemList JSON-LD) has no link from the home body. It is reachable only through the footer and one link on /pro. The whole home features grid (six cards, five marked Pro) carries no internal links.
- Why it costs: The strongest page passes no contextual link equity or anchor text ("card readers", "Stripe Terminal") to the page that targets card-terminal searches. A developer checking hardware support also hits a dead end on the home page.
- Fix: In the "Smooth checkout flow" card, make "card readers like Stripe Terminal and SumUp" a link to /extensions (the Square comparison page already uses this kind of inline link).
- Scope: ok. Changes one feature-card string and adds rich-text link rendering in features-section.tsx. It does not touch the scroll story.

## Runner-up notes (max 3 lines)
- /support: the H1 "How can we help?" has no keyword, the meta description is 104 chars, and the body is only the AI widget plus Discord. There is no link to docs topics a developer would want (REST API, hooks, requirements).
- /pro phone: the price card ($129/yr) renders above "What's included in Pro?", so phone visitors see the price before the features.
- No page says how POS orders appear in WooCommerce (order status, which taxes apply at the counter vs the shop base address shown in the mockup). For a developer this is the next question after stock.
