# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce. It turns a tablet into the register and uses the store's own catalog, stock and prices, even offline.
Why version 2: the "New in 2.0" line above the H1 says you can now open and close the register, split payments and see today's sales, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all locales, desktop and phone.
- Element: the "What's included in Pro?" grid has six cards: "Payment Terminal Integration", "Stock & Price Editing", "Order Management", "Customer Management", "Reports Across Days, Registers & Stores" and "Custom Payment Gateways". None of them is about more registers or more than one store.
- Problem: Since #733, the first FAQ answer on this page says the free plugin "runs one register, and more registers and the tools listed above need Pro". But no tool listed above is a register or a store. /downloads ("Unlock the full till … multi-store …"), every /compare page ("Pro adds multi-store management, more registers") and /compare/square's FAQ all sell multi-store and extra registers as Pro features. Only the page that sells Pro leaves them out.
- Why it costs: A shop opening a second till or a second location is the clearest buyer Pro has. That visitor reaches /pro and finds the limit in the FAQ, but no feature that lifts it. /pro also misses "WooCommerce POS multiple registers" and "multi-store", because neither term appears in a heading or a card.
- Fix: Add a seventh card, "Multiple Registers & Stores", with this body: "Run more than one register, and manage several stores with their own addresses, tax rates, receipt templates, pricing and users." The wording is reused from /compare. Add the card to all ten locales, and add the line to the home Pro list.
- Scope: ok. The site already publishes this claim. No price or plan wording changes.

## Worst defect — UI
- Page/viewport: /pro and every /xx/pro, phone (390×844). /de/pro and /nl/pro show it the same way.
- Element: the "Get Pro" buy box ("Yearly … $129 USD /yr", "Lifetime … $399 USD once", "Get Started") comes straight after the hero. The "What's included in Pro?" H2 and its six feature cards start below it, about two screens down.
- Problem: On desktop the features sit on the left and the buy box on the right, so both are in view together. On phone the column order puts the price and the checkout button first. A visitor sees the price before reading anything about what it buys. The cookie banner also covers the bottom of the box, so the first screen is a price list with no feature list.
- Why it costs: Showing the price before the value hurts the one conversion page on the site. Many phone visitors leave before scrolling past a price they have no reason yet to accept. On phone, the H2 that defines the page's topic also lands well below the fold.
- Fix: On phone, show the feature column first and the buy box after it (for example `order-2 lg:order-1` / `order-1 lg:order-2` on the two grid columns, or the reverse DOM order with `lg:` placement). Leave the desktop layout unchanged.
- Scope: ok. This moves the box's position only; the price and terms wording do not change.

## Worst defect — SEO
- Page/viewport: /downloads, all ten locales, desktop and phone.
- Element: `<h1>One till, every device.</h1>` (`messages/en.json:1626`, `downloads.hero.title`). Above it, the eyebrow "DOWNLOADS" is a `<p>`. The H2s are "One store at the centre. Every till in sync.", "Three steps to your first sale" and "What's new".
- Problem: This is the third round this has been flagged, and it is unchanged. The H1 of the download page has no "download", "WooCommerce", "POS" or platform name. "Till" is British; US owners search "register" or "POS". The title is "Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS", so the title and the H1 don't match. Every other money page names WooCommerce or POS in its H1: home, /compare, /compare/square and /extensions.
- Why it costs: /downloads is the page that should rank for "WooCommerce POS app", "download WooCommerce POS" and "WooCommerce POS for Windows/Mac". The page already has `SoftwareApplication` JSON-LD and a good title. The H1 is the main on-page signal still missing, and a title the headings don't support is more likely to be rewritten in the SERP.
- Fix: Set `downloads.hero.title` to "Download WooCommerce POS for every device". In de and nl, use "Kassensystem" and "Kassasysteem", as the home titles do. Keep "One till, every device." as the line under the H1, and update the H1 assertion in the downloads page test.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro shows five FAQ questions but has no `FAQPage` JSON-LD, while all seven /compare/* pages have it. The /pro H1 "WCPOS Pro" also has no "WooCommerce POS" term.
- The home body has no link to /compare; only the footer links there. A "How WCPOS compares →" link beside "See Full Pricing & Features" would send authority from the strongest page to the competitor-query pages.
- The seven /compare hub links all say "Read the comparison". "Support | WCPOS" is still a thin title with no keyword.
