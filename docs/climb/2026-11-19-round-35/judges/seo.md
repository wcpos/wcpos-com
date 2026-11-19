# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce that turns a tablet into the shop's register, using the store's own catalog, stock and prices, even offline.
Why version 2: the "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, every viewport and locale. This is the "Get Pro" buy box and the page body.
- Element: "Try the free version first — upgrade once you know it does the job". Only "Try the free version first" is a link, and it goes to /downloads (`pro.buyBox.tryFreeLink`, `src/app/[locale]/(main)/pro/page.tsx:119`). The only "Live Demo↗" on /pro is in the footer.
- Problem: /pro is the purchase page, but its body never links to the live demo. The site's own refund policy says "The online demo runs the current version with Pro activated, so you can confirm it fulfils your store's requirements" (`messages/en.json:1467`), and the refunds text asks buyers to try the demo before they buy. The Pro-only features this page sells (order management, customer management, reports across days, the customer-facing display) can't be seen in the free download. So the one "try first" path on the page leads to a plugin install that doesn't show what is being sold.
- Why it costs: this page gets the most purchase intent on the site. A buyer who wants to see Pro working either leaves to find the demo or buys without trying it, and buyers who never tried it are the refund case the policy warns about. Home, /compare and every comparison page offer the demo next to the download. /pro, where it matters most, does not.
- Fix: add the demo to the buy-box line, for example "Try the free version first or see Pro in the live demo — upgrade once you know it does the job", in all ten locales. Use the existing demo URL and the same click tracking as the home "Try Live Demo".
- Scope: ok. It repeats a claim the refunds page already makes. The prices and the "never auto-renews" line nearby, which are front-desk holds, are not touched.

## Worst defect — UI
- Page/viewport: /extensions at `md` and up (shown at 1440×900).
- Element: the gap between the hero line "Extensions marked Pro need WCPOS Pro." and the first group heading "Card terminals and payments".
- Problem: the gap is about 210 px of empty space. The hero `Section` uses `lg:py-28` (112 px bottom, `extensions/page.tsx:72`), and the list `Section` below it uses the default `md:py-24` (96 px top). The two paddings add up. At 1440×900 the first screen shows the heading plus only the top two-thirds of the first card row, and the cookie bar covers their links. This is unchanged from rounds 33 and 34.
- Why it costs: the page exists to show which card terminals work, but its first screen is mostly empty background. The hero reads like the whole page, and the catalog starts below the fold.
- Fix: give the list section a shorter top (`md:pt-12`) or trim the hero bottom (`lg:pb-14`) so the gap is about 100 px.
- Scope: ok. This is spacing on one page.

## Worst defect — SEO
- Page/viewport: home (`https://wcpos.com/`), every viewport. This is the page's structured data.
- Element: home JSON-LD is `["Organization", "SoftwareApplication"]` (facts.json). No page has a `WebSite` block (`grep "'WebSite'" src` finds nothing).
- Problem: Google's site-name system shows a name above every result. Its preferred signal is `WebSite` structured data (`name`, optional `alternateName`) on the domain's home page. Without it, Google falls back to the title, `og:site_name` and headings. On this site those signals are mixed: the title is "WCPOS - Point of Sale for WooCommerce", the H1 and eyebrow are "WooCommerce", and the comparison pages say "the makers of WooCommerce POS". `src/app/[locale]/layout.tsx:115` itself records "at least six naming variants of the product … plus an unrelated Automattic product using the old name" (#590). That is exactly the case where Google's guidance says to declare the site name explicitly.
- Why it costs: the site name is on every listing: home, /pro, /downloads and every /compare page that competes for "WooCommerce POS" and "Square for WooCommerce alternative" queries. If Google shows "wcpos.com" or "WooCommerce POS" instead of "WCPOS", it blurs the brand next to Automattic's own POS on the same results page. The Organization block already does the entity work, so this is the one missing piece, and a cheap one.
- Fix: on the home page only (`src/app/[locale]/(main)/page.tsx`, beside the SoftwareApplication script), add `{ "@context": "https://schema.org", "@type": "WebSite", "name": "WCPOS", "url": "https://wcpos.com/" }`, with a test that checks for it.
- Scope: ok for `name` and `url`. Choosing an `alternateName` (for example "WooCommerce POS") is a brand-naming call, so leave it out unless the front desk picks one.

## Runner-up notes (max 3 lines)
- `src/app/sitemap.ts` `CONTENT_UPDATED_AT` still says 2026-11-18 for / and /support. #845 to #847 changed both on 2026-11-19, so the lastmod dates are wrong for the third round running. Derive them at build time.
- The /about-us title still renders as "About | WCPOS" (`about.meta.title`). Suggested: "About WCPOS – WooCommerce POS since 2014".
- The Organization JSON-LD has no `foundingDate` ("2014" is visible on the home page) and no `description`. Both are cheap entity signals that would repeat facts already on the page.
