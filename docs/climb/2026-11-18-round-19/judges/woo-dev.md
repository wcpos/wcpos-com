# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source point-of-sale plugin for WooCommerce plus apps; it turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports. The first feature card and the FAQ "How many sites can I use my license on?". nl and de are the same.
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." Further down: "Each license can be activated on 2 sites, intended for one live site and one development site."
- Problem: My client has two stores. Nothing on the site tells me whether a Pro "store" is a location inside one WooCommerce site or a separate WooCommerce install. It also doesn't say whether the stores share one catalog and one stock pool. Read next to "2 sites = live + dev", the page suggests a second shop means a second licence, which is the opposite of what the feature does. This has been open since round 13 and is still waiting on a "plugin fact check". The wiki already has the facts: `~/Projects/wiki/product/features/pro-and-add-ons.md:14` says multi-store creates "store locations" in the Pro settings, and `:28` says location-specific stock, pricing and SKUs come from the ATUM Multi-Inventory add-on. The site's own /extensions ATUM card says the same thing ("linking inventory locations to POS stores").
- Why it costs: This is the first architecture question I get asked, and it decides both the quote (one licence or two) and the build (one site or a multisite). If the page can't answer it, I have to email sales before I can recommend WCPOS, which the site exists to prevent.
- Fix: Add one sentence to the card body, in all locales: "Stores are locations inside one WooCommerce site and sell from its products and stock; per-location stock comes with the ATUM extension." Link "ATUM extension" to /extensions.
- Scope: needs-front-desk (already queued as the multi-store fact check; the wiki lines above should close that check. If the front desk wants to state the licence consequence, that it is one licence for all stores, that wording is theirs to approve)

## Worst defect — UI
- Page/viewport: /compare/square at phone 390, and the other six /compare/* detail pages, which share `CompareBreadcrumb`. A side effect of round 18's #781.
- Element: the breadcrumb "‹ Compare WooCommerce POS systems" is centred above "WCPOS vs Square for WooCommerce", which is now left-aligned (`className="max-sm:text-left"` on the `SectionHeading` in `compare/square/page.tsx:155`).
- Problem: The first two elements on screen use different alignments. The red back-link floats in the middle while the H1 and lead start at the left edge. It looks like a half-finished layout change, and it is the first thing a phone visitor sees on every comparison page.
- Why it costs: These comparison pages are where I check the vendor's honesty and care. A visibly misaligned header at the top makes the work look rushed, on the pages meant to show the opposite.
- Fix: Give `CompareBreadcrumb` the same breakpoint rule (`max-sm:justify-start` / `max-sm:text-left`), so it left-aligns on phone and stays centred from `sm` up.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /support, all viewports and locales.
- Element: H1 "How can we help?". Meta description "Ask anything about WCPOS and get an instant answer from our docs, or chat with the community on Discord." (104 chars). The only JSON-LD is `Organization`. There is one H2 ("Prefer to talk to a human?").
- Problem: The H1 has no topic words, and the description is short and generic. The body has no links into the documentation, GitHub issues or the WordPress.org forum. It has only the Aide box and Discord. For queries like "WooCommerce POS support" or "WCPOS documentation", this page offers almost nothing to rank on or to send link equity to the docs.
- Why it costs: When I evaluate a plugin for a client, I look for how bugs get reported and where the docs live. If the support page has no direct docs or issue-tracker links, the project looks harder to support than it is. Search engines see a thin page with a vague heading.
- Fix: Change the H1 to "WCPOS help & support" and keep "How can we help?" as the lead. Extend the description to about 150 characters, naming the docs, Discord and the forum. Add one line of body links: Documentation · GitHub issues · WordPress.org forum.
- Scope: ok

## Runner-up notes (max 3 lines)
- Correction to round 18's deferred "coupons in the Pro list": in 2.0, applying a coupon in the cart is free, and only the Coupons screen is Pro (wiki comparison-and-pricing.md:46-47). Don't add "coupons at the register" to the Pro lists. The current home "apply discounts" wording is right.
- The /downloads step 3 says Pro "adds terminal payments, refunds and stock control". Free already syncs stock ("What stays in sync: Stock levels"); say "stock & price editing", as /pro does.
- The /downloads "Web" option only offers "Open the live demo". It never says that the web register for my own store opens from the store once the plugin is installed.
