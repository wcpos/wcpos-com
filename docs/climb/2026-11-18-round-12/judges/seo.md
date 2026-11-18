# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, with the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/pro`, all ten locales, desktop and phone ("What's included in Pro?" grid).
- Element: The seven Pro feature cards are "More Registers & Multiple Stores", "Payment Terminal Integration", "Stock & Price Editing", "Order Management", "Customer Management", "Reports Across Days, Registers & Stores" and "Custom Payment Gateways". None of them is a customer-facing display.
- Problem: Every `/compare/*` page sells "a customer-facing display" in its "Pro adds:" list (`messages/en.json` `*.proAdds`). The `/compare/oliver-pos` glance table has a "Customer-facing display" row: "Yes, with Pro: open it in any browser and pair it to a till with a code". The wiki lists it as a WCPOS 2.0 Pro feature too. But the page that sells Pro never mentions it, in the cards, the subtitle or the FAQ. This is the same gap that refunds had before #753. The Coupons screen, also listed in "Pro adds", is missing from `/pro` as well.
- Why it costs: A screen facing the customer is one of the hardware features shop owners check for, and Oliver and Square list it. A visitor arriving from a comparison page, or searching "WooCommerce POS customer display", finds the feature missing from the price page and reads that as "not included". That works against the purchase at the point of decision.
- Fix: Add an eighth card to the `/pro` grid in all ten locales: "Customer-Facing Display: Show customers their order on a second screen; open it in any browser and pair it to a register with a code." The wording reuses the oliver glance row.
- Scope: ok. The site already makes this claim on every `/compare/*` page, and nothing about prices or plans changes.

## Worst defect — UI
- Page/viewport: `/extensions`, phone (390×844), all locales; see `extensions-phone-fold.jpg`.
- Element: The H2 "Card terminals and payments" is followed by the first card, "Email Invoice Gateway (Pro): Send an invoice email to the customer with a link to pay for the order." That card fills the bottom of the first screen.
- Problem: The page's title ("WooCommerce POS Extensions & Card Terminals") and its first H2 both promise card terminals. On phone, the only item visible under that heading is an emailed payment link, which is not a terminal. Stripe, Square, SumUp, PayPal, Mollie and Windcave come one or more scrolls later. #749 put the group first, but the cards inside it stayed in catalog order. Two judges listed this as a runner-up in round 11.
- Why it costs: A visitor sent here by the `/pro` card's "See all terminal extensions" link, or by a "Stripe Terminal WooCommerce POS" search, scans the first card, sees no terminal, and may conclude theirs isn't supported. The section's visual hierarchy contradicts its own heading.
- Fix: Inside the "Card terminals and payments" group, sort the cards so terminal integrations come first (for example by a `kind: 'terminal'` flag or an explicit order list) and gateways such as Email Invoice come after them. Change nothing else on the page.
- Scope: ok. This only changes the order of existing cards on one page.

## Worst defect — SEO
- Page/viewport: All seven `/compare/*` pages (e.g. `/compare/square`), all locales, desktop and phone.
- Element: In the body of `/compare/square`, the text "Pro adds: multi-store management, more registers, card-terminal integrations, …", "Pro is $129 — a one-time payment…" and "card-terminal integrations for Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, and Vipps MobilePay, installable one-click from the extension catalog" are all plain text. Across `src/app/[locale]/(main)/compare/*/page.tsx`, the only body links are the external demo link, the CTA band (demo, `/downloads`) and the "Compare WooCommerce POS systems" link back to the hub. No comparison page links to `/pro` or `/extensions` in its body. `facts.json` agrees: `/compare/square` has 13 internal links, exactly the header and footer set.
- Problem: The comparison pages are the site's bottom-of-funnel ranking pages ("Square for WooCommerce alternative", "Oliver POS vs …"), and they are the pages most likely to earn outside links. They name the product being sold (Pro) and the integrations (the extensions) several times, but they pass no contextual link equity or descriptive anchor text to either page. `/pro` and `/extensions` get only footer links from them, and Google weights sitewide footer links least. A visitor who reads the Pro price and wants detail has no link to follow, except the footer.
- Why it costs: In-body links with descriptive anchors ("WCPOS Pro", "card-terminal extensions") are the main way Google learns what `/pro` and `/extensions` are about and how important they are. `/extensions` has sitemap priority 0.6 and targets "WooCommerce POS card terminal" queries, and its internal links from content pages are almost all footer links. The missing links also drop engaged comparison readers before they reach the page with the price.
- Fix: On each `/compare/*` page, link "Pro" in the "What does it cost?" paragraph (or the "Pro adds:" line) to `/pro`, and link "extension catalog" (or "card-terminal integrations") in the card-payments paragraph to `/extensions`. Use `t.rich` with locale-aware `Link`, two links per page.
- Scope: ok. These are links on copy that already exists, with no new claims and no changes to prices or plans.

## Runner-up notes (max 3 lines)
- The home `<title>` is still the layout default "WCPOS - Point of Sale for WooCommerce", without "WooCommerce POS". It is with the front desk since round 11 and still the biggest single on-page gap on the site's top URL.
- The sitemap `lastmod` (`src/app/sitemap.ts` `CONTENT_UPDATED_AT`) still says 2026-10-07 for `/`, `/pro` and `/compare`, after #751 and #752 changed those pages today. Google ignores `lastmod` values that prove inaccurate, so recrawls of those fixes get no help.
- The `/compare/*` titles run 68–72 characters with WCPOS twice ("WCPOS vs WooCommerce's Official POS (2026): An Honest Comparison | WCPOS"), so results truncate them. Dropping the `| WCPOS` suffix on these pages (`title.absolute`) would fix both.
