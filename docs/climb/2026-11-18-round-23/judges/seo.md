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
- Page/viewport: `/compare/square`, all viewports and locales. The same gap is on `/compare/oliver-pos`, `/compare/woocommerce-pos` and `/compare/jovvie`. `/compare/foosales`, `/compare/vitepos` and `/compare/yith-pos` each have a "Sources" section, a `SOURCES` array rendered at `foosales/page.tsx:43` and `:281-292`.
- Element: The disclosure box on the page says "every number is sourced and dated, we link to competitors' own pricing pages … Check everything." The footer says "Facts about Square verified 2026-10-06 against Square's own pages (its fees page, its pricing announcement, and its help articles on offline payments, Tap to Pay, devices, and international availability)…". The page has no outbound link to any of them. Its only external link is the demo.
- Problem: The page promises citations and gives none. It quotes exact numbers ("2.6% + 15¢", "uploaded within 72 hours", "default sync interval one hour", "8 countries") but never lets the reader check them. Three of the seven comparisons already have the Sources list, so this reads as an omission, not as how the site works. Square is also the hub's first card and the competitor named in home's "Weighing up Square or FooSales?" link.
- Why it costs: A shop owner who is comparing vendor pages discounts a vendor's claims about a rival unless they can check them, and here the page's own disclosure tells them to check. Outbound citations to primary sources are also the trust signal that search and AI answer engines look for on "X vs Y" pages, and the FooSales page already earns it.
- Fix: Copy the FooSales `SOURCES` + `compare.<page>.sources.*` pattern into `/compare/square`. Use the exact Square and WooCommerce pages the 2026-10-06 verification used: fees, Square Free pricing, offline payments, Tap to Pay, devices, international availability, and the Square for WooCommerce FAQ. Then do the same for oliver-pos, woocommerce-pos and jovvie.
- Scope: ok. It links sources for claims the page already makes and adds no new claims or numbers. The URLs must come from the verification notes, not be guessed.

## Worst defect — UI
- Page/viewport: `/downloads` on phone (390 px), the "What's new" release history. In `downloads-phone-full.jpg`, 2.0.0 opens at about y 8,300 and the footer starts at about y 12,200, at 2× scale.
- Element: The open "2.0.0 · Nov 9, 2026" entry, which starts "WCPOS 2.0 is a major update…" and then runs through "Developers: sync protocol 3…" and "Since beta 3, for testers on the 2.0 beta: …". One of its links is shown as the bare URL "https://docs.wcpos.com/getting-started/whats-new".
- Problem: `openFeatureRelease` (`release-history.tsx:41-56`) deliberately opens the 2.0.0 release. That choice is right, because its first two paragraphs carry the "Sync every till before upgrading" warning. But it opens all of the notes, about 2,000 CSS px or more than two phone screens of dense text. That covers developer hooks, beta-3 tester notes and a translations-pin correction, and the "Latest" 2.0.4 row sits closed above it. This has been deferred since round 22.
- Why it costs: On the download page, the last thing a phone visitor scrolls through is a changelog wall written for developers and beta testers, which makes the product look harder to adopt than it is. The bare URL wraps across lines. On a page that Lighthouse already scores 90 on mobile with a 3.5 s LCP, it also adds DOM and paint weight.
- Fix: Keep 2.0.0 open, but clamp the open notes body (e.g. `max-h` with a fade) to the first two paragraphs plus a "Show all 2.0.0 notes" toggle. Render the docs link with its label ("What's new in 2.0") instead of the raw URL.
- Scope: ok. This is one component's styling and a toggle, and it keeps the author's choice to open the feature release.

## Worst defect — SEO
- Page/viewport: All seven `/compare/*` spoke pages on every locale (70 URLs in the sitemap), both viewports. For example, `/compare/square`, where facts.json shows `internalLinks: 13`, the same set as home.
- Element: The only links on a spoke that point to other comparisons are "‹ Compare WooCommerce POS systems" (breadcrumb) and the "Compare WooCommerce POS systems" link before the footer, and both go up to the hub. No spoke links to any sibling. `grep` finds `/compare/square` linked only from `compare/page.tsx` (the hub cards), `sitemap.ts`, `seo.ts` and `llms-pages.ts`, and the same holds for every other spoke.
- Problem: Each competitor page gets exactly one in-content internal link, the hub card, at crawl depth 2 from a hub that is itself linked only from the footer and one home line. The cluster is hub-and-spoke with no lateral links. So the "WCPOS vs FooSales" page passes no relevance to "WCPOS vs Square" and does not help it rank, even though the two target the same intent ("WooCommerce POS alternative", "Square for WooCommerce vs …"). A reader at the end of one comparison who is weighing a second competitor has to go back to the hub.
- Why it costs: These seven pages are the site's main bet on high-intent, bottom-of-funnel queries. Internal links are the cheapest signal for "these pages are important and related". Each spoke currently gets the least internal link equity of any indexed marketing page apart from the legal pages, and a visitor who reads one comparison has no in-content path to the next.
- Fix: Export the hub's `COMPARISONS` list and add a "More comparisons" block before `<CtaSection />` on every spoke. It should list the other six, with their existing localized `hub.<key>.title` as anchor text (for example "WCPOS vs FooSales").
- Scope: ok. It adds one shared component to existing pages and reuses strings that already exist in every locale. It is not a new page and adds no claims.

## Runner-up notes (max 3 lines)
- The /compare hub meta description is 162 characters, so Google cuts it. It names no competitor, while the subtitle names Square, FooSales and Oliver POS. Leading with those names would match "X vs WooCommerce POS" queries.
- In en, "till" survives on /pro ("pair it to a till with a code", `messages/en.json:440`) and in two compare glance rows (`:2043`, `:2664`). Every other mention says "register".
- On /support at phone width, the H1 leaves "& support" on its own line. The chip says "licence", while /pro and the FAQ say "license".
