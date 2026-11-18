# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the store's register, selling from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/compare/oliver-pos`, all viewports and locales.
- Element: The short answer reads "the free version is truly unlimited (products, customers, cash sales — no caps on anything)" (`compare.oliver.shortAnswer.wcpos`). The FAQ answer reads "Yes. WCPOS's free plugin is unlimited, …" (`compare.oliver.faq.trial.answer`).
- Problem: The same page's free-tier table says "Unlimited devices and cashiers; one register in the free version, more with Pro" (`compare.oliver.freeTier.rows.devices.wcpos`). The /pro FAQ says the free plugin "runs one register, and more registers … need Pro". So "no caps on anything" is contradicted twice by the site itself. Round 6 (#733) removed this wording from home and /pro for exactly this reason, but the Oliver comparison still has it in its first paragraph. The other spokes say "no caps on products, orders, customers, or cash sales" (Jovvie) or "no caps" with the one-register row nearby, and none of them claims "anything".
- Why it costs: On a vendor-written "X vs Y" page, the reader's first question is whether the maker is overselling. Here the opening claim is disproved by a table row a scroll later. Oliver's free plan is described as capped at "20 products and 50 transactions", so the comparison is about caps, which makes the overclaim stand out more. A visitor who catches it stops trusting the rest of the sourced numbers.
- Fix: Change both strings to name the real limits, in every locale. For example: "the free version has no caps on products, customers or cash sales, and runs one register (more with Pro)". Change the FAQ to "WCPOS's free plugin has no caps on products, orders or customers, …".
- Scope: ok. It is a copy correction with no new claim; the one-register fact is already on the page.

## Worst defect — UI
- Page/viewport: `/compare/square`, `/compare/foosales`, `/compare/vitepos` and `/compare/yith-pos` on phone (390 px), in the "Sources" list.
- Element: Items like "Offline payments: the 72-hour upload, who is responsible, and what is not available offline: https://squareup.com/help/us/en/article/7777-process-card-payments-with-offline-mode".
- Problem: The link text is the raw URL with `break-all` (`square/page.tsx:341`, `foosales/page.tsx:288`, `vitepos/page.tsx:275`, `yith-pos/page.tsx:278`). On phone the URLs split mid-word and fill several lines of underlined characters. The source list ends up longer than the content it supports, and the descriptive label is visually lost in the URL. This was deferred in rounds 23 and 24.
- Why it costs: The Sources list is the page's proof, and it looks like a debug dump on the screen where most shop owners read it. The ragged, underlined block also reads as unfinished next to the clean comparison tables above it.
- Fix: Make the descriptive label the link and show only the hostname after it in muted text (e.g. "Offline payments: … (squareup.com)"). Drop `break-all`. Put the change in one shared list component used by all four pages.
- Scope: ok. It changes the markup and styling of one existing list pattern, and every URL stays linked.

## Worst defect — SEO
- Page/viewport: `/compare/jovvie`, `/compare/foosales`, `/compare/vitepos` and `/compare/oliver-pos`, all locales (search result titles).
- Element: `<title>` "WCPOS vs Jovvie (2026) | WCPOS". The others are "WCPOS vs FooSales (2026) | WCPOS", "WCPOS vs Vitepos (2026) | WCPOS" and "WCPOS vs Oliver POS (2026) | WCPOS".
- Problem: The `%s | WCPOS` template in `[locale]/layout.tsx:37` repeats the brand that `compare.<slug>.metadata.title` already starts with. Four of the seven spoke titles therefore spend 8 of 22 to 26 characters on a second "WCPOS" and never say "WooCommerce" or "POS". Oliver is the exception: "POS" appears only as part of the rival's name. The Square spoke gets "WooCommerce" only because the rival's name contains it. The hub and the H1 subtitles do target "WooCommerce POS", but the spokes' titles don't.
- Why it costs: These pages target "Jovvie alternative", "FooSales vs", "Vitepos alternative" and "best WooCommerce POS". A searcher who doesn't know the brand WCPOS sees "WCPOS vs Jovvie (2026) | WCPOS" in the results with no hint that WCPOS is a WooCommerce point of sale. The title is the strongest on-page ranking signal, and these four leave out the category term with the most search volume while having more than 30 characters free.
- Fix: Give each spoke an absolute title (`title: { absolute: … }`) that drops the duplicate brand and adds the category, e.g. "WCPOS vs Jovvie: WooCommerce POS Compared (2026)". Apply it to all seven spokes for consistency, in every locale, keeping each under about 60 characters.
- Scope: ok. It is a metadata string and a one-line `absolute` change per spoke, with no new claims.

## Runner-up notes (max 3 lines)
- The `WebPage.dateModified` in the Oliver and Jovvie JSON-LD is 2026-07-08/09 (the date competitor facts were verified), while the sitemap lastmod is 2026-11-18 and the pages state WCPOS 2.0 facts. The date signals conflict, and the snippet may show a July date. Both rivals' facts are over four months old.
- The /pro `SoftwareApplication.operatingSystem` leaves out "Web", while home and /downloads include it. The fr, pt and es /pro titles run 68 to 73 characters with the suffix.
- The de spoke titles are inconsistent: "WCPOS vs. Jovvie" but "WCPOS vs FooSales".
