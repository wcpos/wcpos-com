# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, selling from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, and the same block on all seven /compare spokes. Phone and desktop.
- Element: In "Which should you choose?", the "Choose WCPOS if:" card ("You want every sale, online and in person, to be a WooCommerce order sold from one catalog…") is text only, with no button or link.
- Problem: The page's verdict is where a visitor makes the decision, and nothing on it can be clicked. The next call to action is "Try Live Demo / Download Free" in the closing CTA (text line 147). To reach it, the visitor scrolls past five FAQ answers, a 14-item Sources list and "More comparisons", about 1,500 px further down on phone. The source confirms the cards are only an `<h3>` and a `<p>` (`compare/square/page.tsx:305-315`). This is the third round it has been deferred.
- Why it costs: The comparison spokes are the site's commercial-investigation landing pages ("Square for WooCommerce vs …", "WooCommerce POS comparison"). Searchers arrive ready to decide. When the verdict has no next step, the decision moment is lost and the session is likely to end on a source link to squareup.com.
- Fix: Add the existing "Try Live Demo" and "Download Free" buttons (the same labels and hrefs as the closing `CtaSection`) under the "Choose WCPOS if:" card body, in the shared spoke layout, so all seven spokes get them.
- Scope: ok. This reuses existing labels and links on an existing page, with no new claim.

## Worst defect — UI
- Page/viewport: /compare/square at phone 390×844, and the same layout on all seven spokes. Desktop has it too.
- Element: The gap between the intro paragraph ("…and when Square is the better choice.") and the "The short answer" H2.
- Problem: There are about 100 CSS px of empty space on phone, and about 130 px on desktop. Every other paragraph gap on the page is about 16 to 24 px. The cause is stacked padding: the hero `Section` ends with `pb-6` and the next `Section spacing="compact"` adds `py-16` (`compare/square/page.tsx:176,192`; `ui/section.tsx:22`). The fold shows a dark band where the answer should start, and "The short answer" is cut off by the cookie banner. This is the sixth round it has been raised.
- Why it costs: "The short answer" is the paragraph that tells a comparison visitor why to stay. A large dead band right after the intro looks like the end of the page on phone and pushes the answer down by a sixth of the screen.
- Fix: Give the short-answer `Section` `pt-0`, or `pt-2 md:pt-4`, and keep `pb-16`, in each spoke page, or once in a shared spoke wrapper.
- Scope: ok. This is a spacing change only.

## Worst defect — SEO
- Page/viewport: /compare/square in all locales: JSON-LD, the visible caption and footer, and the sitemap.
- Element: The `WebPage.dateModified` is "2026-10-06" (`COMPARE_FACTS_VERIFIED.square`, `src/lib/compare-page-json-ld.ts:12`). The "At a glance" caption says "Square facts verified 2026-10-06…", and the footer says "Facts about Square verified 2026-10-06… We re-verify every quarter." But the Sources intro says "read on 2026-10-06 and checked again on 2026-11-18", and the sitemap `lastmod` for /compare/square is 2026-11-18 (`src/app/sitemap.ts:52`).
- Problem: The page gives search engines two different freshness dates. The structured date that Google most often shows in the snippet (`dateModified`), and the page's own byline-style caption, both report the older check. The newer check appears only in one sentence near the bottom. The title promises "(2026)", and Google tends to discount dates that disagree between markup, visible text and the sitemap.
- Why it costs: "Square for WooCommerce" comparison results are date-sensitive, because fees and offline rules change. A snippet dated 6 Oct 2026, next to competitors' newer dates, lowers click-through. Mismatched freshness signals also weaken the trust that this page's whole "sourced and dated" positioning depends on.
- Fix: Set `COMPARE_FACTS_VERIFIED.square` to "2026-11-18", and change the caption and footer copy in all ten locales to "checked 2026-11-18". The existing `compare-page-json-ld.test.ts` already keeps the JSON-LD and the footer in lockstep. Leave the "As verified on 2026-10-06" limits line alone, or reword it the same way.
- Scope: ok. The date already appears on the page as a completed check, so no new claim is added.

## Runner-up notes (max 3 lines)
- The /pro `SoftwareApplication` still has `operatingSystem: "Windows, macOS, Linux, iOS, Android"`, with no Web and no `softwareRequirements` (`pro-product-json-ld.tsx:49`). Home and /downloads use the shared `wcposSoftwareApplication` helper, which has both.
- On /pro phone, about 88 px of `hero` top padding sits above the H1 "WCPOS Pro for WooCommerce POS". On de /pro this pushes "Lebenslang" under the cookie banner on the first screen.
- /support phone: the only indexable text below the H1 is the widget prompts and "Prefer to talk to a human?". A short crawlable FAQ list, or direct Discord and docs links, would give the "WooCommerce POS help" title something to rank on.
