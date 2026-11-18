# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into your store's register, selling from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home (`/`), all viewports and locales. It is the line under the pricing teaser's "Get Pro" button (`src/components/home/pricing-teaser-section.tsx:151-157`, `home…compareLine` in `messages/*.json`).
- Element: "Weighing up Square or FooSales? See how WCPOS compares". Only "See how WCPOS compares" is a link, and it goes to the `/compare` hub.
- Problem: The line names the two rivals a shop owner is most likely weighing up, and the site has a dedicated page for each (`/compare/square`, `/compare/foosales`). Neither name is linked. A visitor who clicks lands on a hub listing seven comparisons and has to find Square again. The home page is also the site's strongest page, yet it sends no link with descriptive anchor text to either spoke, so both spokes stay two clicks deep.
- Why it costs: These visitors are about to switch, and this is the moment the page should answer "why not Square?" for them. An extra hop loses some of them. It also costs ranking: "Square" and "FooSales" are the exact anchors that `/compare/square` and `/compare/foosales` want to rank for ("Square for WooCommerce alternative", "FooSales vs"). The shop-owner and designer judges both named this in round 25, and it is still unfixed.
- Fix: In every locale, wrap "Square" in `<square>` linking `/compare/square` and "FooSales" in `<foosales>` linking `/compare/foosales`. Keep "See how WCPOS compares" on the hub.
- Scope: ok. It is markup on an existing line, with no new copy or claim.

## Worst defect — UI
- Page/viewport: `/compare/square` at 390 px, and the six sibling spokes, which use the same hero-then-short-answer structure.
- Element: The gap between the hero lede ("…and when Square is the better choice.") and the H2 "The short answer".
- Problem: The phone fold shows about 95 CSS px of empty space. The hero `Section` adds `pb-6` (`compare/square/page.tsx:176`), and the next `Section spacing="compact"` (line 191) adds its own top padding. The page's answer-first block, which is its reason to exist, starts below the fold; only its first two lines are visible above the cookie bar. This was deferred in rounds 23, 24 and 25.
- Why it costs: A phone visitor from a "Square vs …" search sees a breadcrumb, a large H1, a five-line grey lede and then blank space. The one paragraph that answers their query is pushed off screen, and the blank space makes the page look unfinished.
- Fix: Remove the stacked padding on phone, for example `max-sm:pt-0` (or `max-sm:pt-2`) on the short-answer `Section`. Apply it in one place for all seven spokes, or to each spoke page.
- Scope: ok. It is a spacing class on an existing component.

## Worst defect — SEO
- Page/viewport: `/downloads` in de, es, fr, it, nl and pt, and `/pro` in es, fr and pt. Search-result titles, all viewports.
- Element: `downloads.meta.title` goes through the `'%s | WCPOS'` template (`src/app/[locale]/layout.tsx:37`). The rendered titles are:
  - es: "Descargar el punto de venta para WooCommerce – Mac, Windows, Linux y web | WCPOS" (80 characters);
  - pt: "Transferir o ponto de venta para WooCommerce – Mac, Windows, Linux e Web | WCPOS" (80);
  - fr: 78; it: 76; nl: 76; de: 74.

  The `/pro` titles render at 73 (pt), 71 (fr) and 68 (es). en `/downloads` renders at 62.
- Problem: Google cuts titles at about 580 px, which is roughly 55 to 60 Latin characters. In six locales, the snippet loses the platform list and the brand: the cut falls inside "– Mac, Windows, Linux…", so "Linux & Web | WCPOS" never shows. Titles this far over the limit are also the ones Google most often rewrites from on-page text. The site already fixed this for the `/compare` spokes in round 25: `compare/metadata-length.test.ts` enforces 60 code points. `/downloads` and `/pro` have no such guard, so these titles have drifted.
- Why it costs: `/downloads` is the page that should rank for "WooCommerce kassa downloaden" and "descargar TPV WooCommerce". A rewritten or truncated title loses the platform match ("Mac, Windows") that separates it from the plugin directory listing, and the brand drops off the end. That lowers click-through on exactly the localized commercial queries the site translated these pages to win.
- Fix: Shorten each of these strings so the rendered title is at most 60 code points. For example, es: "Descargar el TPV para WooCommerce: Mac, Windows y web", or drop "Linux" from the title only. Extend the existing metadata-length test to `downloads.meta.title` and `pro.metadata.title` in every Latin-script locale, counting the 8-character suffix.
- Scope: ok. It is a change to metadata strings and a test, with no new claim.

## Runner-up notes (max 3 lines)
- The /pro `SoftwareApplication.operatingSystem` is still "Windows, macOS, Linux, iOS, Android" (`pro-product-json-ld.tsx:49`). The shared helper used on home and /downloads ends with ", Web".
- On /downloads mobile, Lighthouse shows performance 68 and TBT 1,310 ms; it was 99 in round 25. Home mobile also fell, to 90, so the box was probably noisy, but rerun /downloads before trusting either number.
- The Oliver POS and Jovvie spokes still carry a July `dateModified` (2026-07-08/09) and have no Sources list. The other five spokes are dated October.
