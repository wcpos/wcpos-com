# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register and sells from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: The `/compare` hub (all viewports and locales) and three of its spokes: `/compare/oliver-pos`, `/compare/woocommerce-pos` and `/compare/jovvie`.
- Element: The hub's "Who runs this comparison" box says "every number is sourced and dated, we link to competitors' own pricing pages … Check everything." "How these comparisons work" adds "Facts come from vendors' own pricing pages and WordPress.org, fetched on a stated date".
- Problem: After #801, four of the seven comparisons have a Sources list: Square (15 distinct external URLs in `square/page.tsx`), FooSales (14), YITH (10) and Vitepos (7). Oliver POS, WooCommerce's official POS and Jovvie have none. Each of those three pages has exactly one external URL, the demo, so their prices, free-tier limits and per-transaction fees can't be checked. The hub's "Check everything" promise therefore covers only some of the comparisons it lists, and Oliver POS is one of the three competitors the hub subtitle names.
- Why it costs: A shop owner who arrives from "Oliver POS vs …" or "Jovvie alternative" lands on one of the unsourced pages. That reader is the most likely to doubt a vendor's numbers about a rival, and the hub has just told them to check. Outbound primary-source citations are also the trust signal that search and AI answer engines reward on "X vs Y" pages, and the other four pages now carry it.
- Fix: Copy the `SOURCES` + `compare.<page>.sources.*` pattern (as in `foosales/page.tsx`) into `/compare/oliver-pos` first, then `woocommerce-pos` and `jovvie`. Take the URLs from each page's own "verified on" notes and don't guess them.
- Scope: ok. It links sources for claims the pages already make, adds no new claims or numbers, and touches one existing page per fix.

## Worst defect — UI
- Page/viewport: `/extensions` on phone (390 px), "Card terminals and payments". In `extensions-phone-full.jpg` at y ≈ 1,750–2,300 (2× scale).
- Element: The card titles "Mollie Terminal for WooCommerce" and "PayArc Terminal for WooCommerce", each followed by the "Pro" chip.
- Problem: The chip still drops onto a line of its own under the title. Because of its `ml-2`, it starts indented from the title's left edge, so it looks misplaced rather than attached. "Mercado Pago Terminal for WooCommerce" happens to keep the chip on its last line, so neighbouring cards in the same list are inconsistent. The cause is `extensions/page.tsx:112-121`: an `inline` H3 followed by an inline `Badge` with `ml-2`, with nothing keeping the chip on the same line as the title's last word. This was reported in round 23 and is still not fixed.
- Why it costs: The Pro chip is the only cue on the card for which extensions need a paid licence. On phone it reads as a stray tag, and the uneven, indented wraps make this commercially important list (the card-terminal integrations) look unpolished.
- Fix: Wrap the title's last word and the badge together in a `whitespace-nowrap` span. Alternatively, make the title row `flex flex-wrap items-center gap-x-2` and drop `ml-2`, so a wrapped chip starts flush left.
- Scope: ok. It changes one component's markup and styling.

## Worst defect — SEO
- Page/viewport: The `/compare` hub, all viewports. All seven Latin-script locales are affected.
- Element: `<meta name="description">` "Honest, sourced comparisons of point of sale systems for WooCommerce — architecture, real free-tier limits, pricing, offline support, and when to choose each one." (en, 162 characters).
- Problem: The description is over the site's own limits in every Latin locale: en 162 (limit 155), it 172, pt 184, de 187, nl 192, es 202, fr 204 (limit 160 each). `meta-description-length.test.ts` checks home, /downloads, /pro and /support, but not `compare.hub.metadata.description`, so the overrun goes unnoticed. The description also names no competitor, while the H1 subtitle names Square, FooSales and Oliver POS. Searchers looking for "Square vs WooCommerce POS" or "FooSales alternative" therefore see generic words ("architecture", "free-tier limits") and a cut-off tail, not the names they searched for. This was raised in round 23 and is not fixed.
- Why it costs: The hub is the head of the seven-page comparison cluster and the only URL that can rank for "compare WooCommerce POS" and "best WooCommerce POS". In fr and es Google truncates a quarter of the snippet, and a description that leaves out the competitor names gives up both bolded query matches and CTR on the site's highest-intent queries.
- Fix: Rewrite `compare.hub.metadata.description` in every locale to fit 155/160 characters and lead with the named competitors. For example: "Sourced, dated comparisons of WCPOS with Square, FooSales, Oliver POS, Jovvie, Vitepos and YITH: pricing, free-tier limits, offline use, and when each wins." Then add the key to `meta-description-length.test.ts`.
- Scope: ok. It is a metadata string per locale plus a test entry, with no new claims (the names are already on the page).

## Runner-up notes (max 3 lines)
- The spoke titles repeat the brand, as in "WCPOS vs Square for WooCommerce (2026) | WCPOS", which wastes about 8 characters of SERP title on all seven pages. A title-template opt-out for `/compare/*` would fix it.
- The home `<title>` "WCPOS - Point of Sale for WooCommerce" still lacks "WooCommerce POS" and "Free". This is held with the front desk since round 11.
- `/compare/square` on phone has a gap of about 200 px between the intro and "The short answer". In en, "One store at the centre." on /downloads uses British spelling, while the rest of the site writes "license" and "catalog".
