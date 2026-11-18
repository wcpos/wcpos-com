# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce plus apps that turns a tablet into the store's register, selling from the same catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free (the "New in 2.0" line above the H1).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports and locales (en, nl, de checked). The home Pro list has the same gap ("More registers & multiple stores").
- Element: the card "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users."
- Problem: The card lists what each store gets, and stock is not on the list. It never says whether a "store" is a location inside one WooCommerce site or a second WooCommerce site. It also never says whether the stores share one stock count or keep their own. The answer is on the site, but only by inference: /extensions lists "WCPOS ATUM Integration — ATUM Multi-Inventory integration for WCPOS, linking inventory locations to POS stores". That implies per-store stock needs ATUM Multi-Inventory plus that extension; without them, every store sells from the one WooCommerce stock. The /pro FAQ adds to the confusion: "Each license can be activated on 2 sites, intended for one live site and one development site". A reader can't tell whether a client with two shops needs one licence or two.
- Why it costs: "Client has two stores" is exactly my brief, and the first questions are "one Woo site or two?" and "does each shop keep its own stock?" Today I can only answer those by joining a /pro card, an /extensions card and a FAQ entry. That's the point where I'd book the sales call or move to a competitor whose page says "per-store stock" outright (the /compare/yith page credits YITH with it).
- Fix: Add one sentence to the card in every locale: "Stores are locations within one WooCommerce site and share its stock; for stock per location, add the ATUM Multi-Inventory integration." Link "ATUM Multi-Inventory integration" to /extensions.
- Scope: ok. It restates what /extensions and the product docs already say (wiki architecture/plugin-atum.md: location-specific stock per POS store comes through wcpos-atum). No price or licence wording changes, and the FAQ stays untouched.

## Worst defect — UI
- Page/viewport: /extensions, phone 390x844 (desktop shares the cause).
- Element: one flat, alphabetical list of 15 cards that opens with "Email Invoice Gateway". Then "Mercado Pago Terminal…", "Mollie Terminal…", "PayArc…", "PayPal Reader…", "Square…", "Stripe…" and "SumUp…" are interleaved with "WCPOS ATUM Integration", "WCPOS Polylang", "WCPOS StoreApps Smart Coupons", "WCPOS Vipps MobilePay", "WCPOS WP Multilang" and "WCPOS WPML", and "Windcave Terminal" comes last.
- Problem: Since #743, the /pro terminal card sends visitors here ("See all terminal extensions"). They land on a list with no grouping, so they have to read every one of the ~5 phone screens to find the payment options. The alphabetical sort splits the terminals in two: "Windcave" ends up after six unrelated "WCPOS …" add-ons, and "Vipps MobilePay" sits among the language plugins. The free extensions (Polylang, WP Multilang, WPML) only show up by the missing "Pro" pill.
- Why it costs: The page's job is "is my client's processor or language plugin covered?" On a phone, that check is a scroll-and-read through 10,000 px. A grouped list answers it in one screen per group.
- Fix: Render the same catalog entries under three H2 groups, "Card terminals & payments", "Multilingual" and "Inventory & coupons", sorted within each group. Demote the card titles to H3.
- Scope: ok. It's a component and markup change on an existing page; the copy stays the same apart from three group labels.

## Worst defect — SEO
- Page/viewport: /downloads, all viewports and locales.
- Element: `<h1>One till, every device.</h1>` (H2s: "One store at the centre. Every till in sync.", "Three steps to your first sale", "What's new")
- Problem: The title is strong ("Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS"), but the H1 and every H2 on the page avoid both "WooCommerce POS" and "download". "Till" is also British, while the rest of the en site says "register". The page that should rank for "WooCommerce POS download / desktop app / Windows" has no heading that names any of those words.
- Why it costs: The H1 is the strongest on-page signal after the title. A mismatch between the two weakens the page for its main query, and a visitor who lands from search on "One till, every device." gets no confirmation that this is the WooCommerce POS download page.
- Fix: Change the H1 to "Download WooCommerce POS for every device" and keep "One till, every device." as the eyebrow or subtitle. Localise the H1 the way the /downloads titles already are.
- Scope: ok. One heading string per locale.

## Runner-up notes (max 3 lines)
- /pro on phone still shows the "Hol dir Pro"/"Get Pro" buy box before "What's included in Pro?" (en and de), so a price appears before any feature (named by others in rounds 7–9, still open).
- The /downloads plugin card's "WordPress 5.6+ · WooCommerce 5.3+ · PHP 7.4+" is a hard-coded string in messages/*.json, not read from the 2.0.4 readme. Worth checking it against the 2.0 plugin header, because a dev reads it as the support floor.
- /downloads still says "Ring up a sale on the desktop, refund it on your phone". Refunds are Pro and the phone apps are beta, and the line doesn't say either.
