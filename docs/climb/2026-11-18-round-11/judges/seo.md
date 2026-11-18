# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, with the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/pro`, all locales, desktop and phone ("What's included in Pro?" grid, "Order Management" card).
- Element: "Order Management — Browse order history, open past orders, and manage them without leaving the register." (`messages/en.json:443`)
- Problem: Other pages sell refunds at the register as a Pro feature, but the page that sells Pro never mentions them. `/downloads` says Pro "adds terminal payments, refunds and stock control", and its "Unlock the full till" card starts with "Payments, refunds, …". `/compare/square` lists "refunds at the register" under "Pro adds", and the other `/compare/*` pages do too. On `/pro`, none of the seven feature cards or five FAQ answers contains "refund"; the word appears only in the footer's Refunds policy link. I named this in round 10 and it is still live.
- Why it costs: Refunding a customer at the counter is one of the first things a shop owner checks a POS for. A promise made on `/downloads` that is missing from the page with the price reads as either an upsell or a missing feature, and the buyer stops at the price. `/pro` also misses the "WooCommerce POS refunds" query that the other pages already cover.
- Fix: Change the card to "Browse order history, open past orders, and refund them without leaving the register." in all ten locales. Optionally retitle it "Orders & Refunds".
- Scope: ok. The site already makes this claim on `/downloads` and `/compare/*`. Prices and plans do not change.

## Worst defect — UI
- Page/viewport: `/compare` hub, phone (390×844); see `compare-phone-fold.jpg`.
- Element: The H1 "Compare WooCommerce POS systems" wraps to three lines. A seven-line intro follows ("Every WooCommerce POS roundup on the web is written by a vendor…"), then the "Who runs this comparison" disclosure card. The first screen ends inside that card, and no competitor name or link is visible.
- Problem: The hub exists to send the visitor to a comparison, but the phone fold has only meta-text about honesty. The seven "WCPOS vs …" cards start about two screens down. Round 9 (#744) moved each `/compare/*` page's answer above its disclosure, but not on the hub.
- Why it costs: A phone visitor from a "WooCommerce POS alternatives" search has to scroll past two blocks about the page before seeing a name they recognise, and many leave first. The comparison pages are the hub's internal-link targets, and fewer clicks on them means weaker engagement signals on the pages built to rank.
- Fix: On the hub, render the competitor card grid (or a one-line row of "WCPOS vs Oliver · Square · Jovvie …" links) before the disclosure card. Leave the disclosure directly above "How these comparisons work" or immediately after the grid.
- Scope: ok. This reorders existing blocks on one page; the copy does not change.

## Worst defect — SEO
- Page/viewport: home (`/`), all viewports, `<title>` (search result headline); the same pattern appears in the other locales.
- Element: `<title>WCPOS - Point of Sale for WooCommerce</title>`. This is the layout default `metadata.siteTitle` (`messages/en.json:1175`, used by `src/app/[locale]/layout.tsx:38`). Home sets no title of its own.
- Problem: The site's highest-priority URL (sitemap priority 1) has a 37-character title with no "WooCommerce POS". That phrase is the plugin's own name on wordpress.org (`woocommerce-pos`) and the head query for this market. The home H1 ("Your WooCommerce store, at the counter.") doesn't contain it either, and "WCPOS" leads, which Google does not read as the same thing. Every other money page now uses the head term: "Download WooCommerce POS…", "Pro Features & Pricing for WooCommerce POS", "Compare WooCommerce POS Systems", "WooCommerce POS Extensions…", "WooCommerce POS Help & Support". Home is also the only page with "WCPOS - …" first, where the others end in "| WCPOS". About 20 characters of the title are unused.
- Why it costs: The title is the strongest on-page ranking signal and the headline searchers click. Home is the page that should rank for "WooCommerce POS" and "free WooCommerce POS", but only its meta description contains the phrase. The H1 can't help, because it is tied up in the owner's open PR.
- Fix: Give the home page its own `generateMetadata` title, e.g. "WooCommerce POS – Free Point of Sale Plugin & Apps | WCPOS" (57 characters), with each locale keeping its own term ("Kassensystem", "Kassasysteem", …) plus "WooCommerce POS". Leave `siteTitle` as the fallback for other pages.
- Scope: ok. This is a metadata field, and "free" and the apps are already stated on the page. The H1 is not touched, so the change stays clear of the blocked duplicate-H1 PR.

## Runner-up notes (max 3 lines)
- The sitemap `lastmod` dates (`src/app/sitemap.ts` `CONTENT_UPDATED_AT`) are still 2026-10-05 to 10-07 for `/`, `/pro`, `/extensions` and `/compare*`. Rounds 1–10 and the 2.0 launch on 9 Nov changed those pages, and `/compare/foosales` has no date. Google stops trusting `lastmod` values that prove inaccurate.
- `/compare/square`'s title is 68 characters and says WCPOS twice, so Google truncates it. `/pro` shows five FAQ questions with no `FAQPage` JSON-LD, although every `/compare/*` page has it.
- `/extensions`: under the new H2 "Card terminals and payments", the first card is "Email Invoice Gateway", which is not a terminal. Sorting terminals first within the group would match the heading and the page title.
