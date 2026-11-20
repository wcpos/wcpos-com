# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce. It turns a tablet, phone or computer into a register that sells from the store's own catalog, stock and prices, even offline.
Why version 2: the red "New in 2.0" line above the kicker says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, all viewports, step 3 of "Three steps to your first sale".
- Element: the step body says "A licensed plugin that adds more registers and stores, terminal payments, refunds and stock control on the same foundation." The card directly below it, "Unlock more registers", repeats it: "More registers & stores, terminal payments, refunds, stock & pricing, order management, full reports and priority Discord support." (`downloads.page.steps.pro.body` and `.cardBody` in `messages/en.json`; the other locales repeat it the same way).
- Problem: the same feature list appears twice in a row, about 40 px apart, and the first four items are identical. The card's heading, "Unlock more registers", repeats the first item a third time. This is the one place on /downloads that sells Pro, and two thirds of its words are spent saying the same thing twice.
- Why it costs: a visitor on /downloads is about to install, and step 3 is the only upsell they see before leaving for wordpress.org. Copy that repeats itself reads as filler, so they skim past the new items (order management, full reports, priority support), which are the reason to click "View Pro plans".
- Fix: make the step body a single line saying why someone would upgrade, for example "When one register isn't enough, Pro adds to the same plugin.". Keep the full list in `cardBody` only. Do the same in each locale.
- Scope: ok (copy only; no new claims, every item is already on /pro).

## Worst defect — UI
- Page/viewport: /pro, desktop 1440×900, buy box on the first screen; /de/pro (and other long locales) desktop is worse.
- Element: the Yearly plan option. In en its subtitle wraps to "Updates & support for 1" / "year". In de, "Am beliebtesten" drops onto its own line under "Jährlich" and the subtitle wraps to "Updates & Support für" / "1 Jahr". The option grows to four lines while the Lifetime option beside it stays at two.
- Problem: from `lg` up, the buy box sits in the narrow column of `lg:grid-cols-[1.5fr_1fr]` (about 340 px per option). `pro-buy-box.tsx` still sets the price beside the label in that column, so the label gets about 150 px. #740 already gives the price its own row on phone, but the layout switches back to side by side at the width where the column narrows again.
- Why it costs: this is the purchase decision on the page with the most commercial intent. The plan the page wants people to pick ("Most Popular") is the one that looks broken, with "1" orphaned from "year", and in de the two options no longer line up.
- Fix: in `src/components/pro/pro-buy-box.tsx`, keep the phone layout (price on its own row under the label) at `lg` and up as well, for example `sm:flex-row lg:flex-col`. Alternatively, widen the buy-box column to `lg:grid-cols-[1.2fr_1fr]`.
- Scope: ok. This is layout only: the plan wording, prices and their formatting stay exactly as they are.

## Worst defect — SEO
- Page/viewport: `/sitemap.xml`, in `src/app/sitemap.ts` (`CONTENT_UPDATED_AT`). It affects /compare, /pro and /about-us in all 10 locales, so 30 URLs.
- Element: `'/compare': '2026-11-18'`, `'/pro': '2026-11-19'`, `'/about-us': '2026-10-06'`. Round 40's merges changed all three pages on 2026-11-20 without bumping these dates:
  - #879 rewrote all seven /compare hub card blurbs in every locale.
  - #880 changed the /pro gateways card.
  - #878 replaced the /about-us `<title>`.

  None of the three touched `sitemap.ts`. The file's own comment says "Bump a route's date when its content changes". The same drift was noted in round 34.
- Problem: the sitemap tells crawlers that the /compare hub has not changed since 18 Nov. The verdict-led card copy was written to change what searchers see for "WooCommerce POS comparison", and the /about-us title fix only counts once Google re-reads the page. Both are now hidden behind an old `lastmod`.
- Why it costs: Google uses `lastmod` as a recrawl signal only while it stays consistently accurate. Each round that ships content without bumping it delays recrawl of the fixed pages, and it teaches Google to ignore this site's `lastmod`. That includes /downloads and /changelog, whose dates come correctly from releases. Every SEO fix in this climb pays off later than it should.
- Fix: set `/compare`, `/pro` and `/about-us` to `'2026-11-20'`. Make bumping `CONTENT_UPDATED_AT` an acceptance item in every climb fix spec that changes page copy or metadata.
- Scope: ok (three date strings in one file; no copy, claim or page change).

## Runner-up notes (max 3 lines)
- /extensions: six of the eight terminal cards share the same boilerplate, "Adds X Terminal support to WooCommerce for in-person payments.", and the text is English in all ten locales. That makes it thin, near-duplicate content on the "WooCommerce card terminal" page. The fix is in the wcpos/extensions `catalog.json` (cross-repo).
- The desktop header nav shows "Pro" in white on every page, so on /, /downloads and /compare it looks like the active item next to the real active pill.
- `metadata.siteDescription` ("Fast, reliable POS system for your WooCommerce store.") is still the stale layout fallback (from round 40's runner-up notes).
