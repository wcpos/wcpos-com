# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, phone and desktop, all locales. This is the "Get Pro" buy box, under "Get Started".
- Element: "Try the free version first — upgrade once you know it does the job" (`pro.*.tryFreeLink` / `tryFreeSuffix`). /pro has no link to the live demo anywhere: not in the hero, the feature list, the buy box or the FAQ (pro.txt).
- Problem: The page sells Pro, but its only "try before you buy" route is the free plugin, which does not include anything listed on the page: more registers, terminals, stock and price editing, orders, customers and reports. The site already says elsewhere that the demo "runs the current version with Pro activated" (`legal.refunds.prevention.items.p2.body`), and every comparison page links to demo.wcpos.com/pos as "the full Pro experience". The page where a buyer decides on Pro is the only one that hides it.
- Why it costs: Visitors who land on /pro from "WCPOS Pro" or "WooCommerce POS pricing" searches have usually not seen the home page or the demo. A hesitant buyer cannot check, in one click, that order management or the reports work the way they need. The refund policy itself calls the demo the way to avoid a wrong purchase.
- Fix: Next to the try-free line in the buy box, add a second link: "or try every Pro feature in the live demo" → demo.wcpos.com/pos, using the same demo URL constant and the "(login demo / demo)" suffix as the compare pages. Add the message key in all ten locales.
- Scope: ok. The link reuses an existing URL and a claim the site already makes, and the price and plan wording stays untouched.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440×900 (and every width from `md` up), all locales.
- Element: The empty band between "Extensions marked Pro need WCPOS Pro." and the H2 "Card terminals and payments". The hero is `Section … className="pt-10 pb-6 sm:py-20 md:py-24 lg:py-28"`, followed by `Section tone="muted" spacing="default"`, in `src/app/[locale]/(main)/extensions/page.tsx:72,90`.
- Problem: This is unchanged since round 33 (extensions-desktop-fold.jpg). At `lg`, the hero's 112 px bottom padding stacks on the muted section's 96 px top padding. That leaves about 210 px of blank space, split across a white and a grey band, under a three-line intro. The first terminal cards start at about y=610, and the consent bar hides their bottom half.
- Why it costs: Visitors who search for terminals ("Stripe Terminal WooCommerce POS") come here to check whether their reader is supported. Almost a quarter of the first screen is empty, and the answer sits half below the fold. /compare and /pro start their content straight after the hero.
- Fix: Cut the hero's bottom padding from `sm` up (e.g. `pt-10 pb-6 sm:pt-20 sm:pb-8 md:pt-24 md:pb-10 lg:pt-28 lg:pb-12`). Keep the top padding and the muted section as they are.
- Scope: ok. This is a spacing change on one page only.

## Worst defect — SEO
- Page/viewport: all eight /compare pages (the hub and seven spokes), every viewport and locale. This is the "Who runs this comparison" block.
- Element: "This page is published by WCPOS, the makers of WooCommerce POS. We obviously have a horse in this race — so every number is sourced and dated, … Check everything." (`compare.disclosure.body`, plain text, no link). The WebPage JSON-LD `publisher` in `src/lib/compare-page-json-ld.ts:36` is `{ name: 'WCPOS', url: 'https://wcpos.com' }`.
- Problem: This is unchanged since round 33. The comparison pages are the site's main source of non-brand search traffic: competitor and "alternative to" queries, with FAQPage, BreadcrumbList and WebPage markup. Their trust block names the publisher but gives no crawlable path to who the publisher is. /about-us ("built by a former shopkeeper and funded by shopkeepers, not investors") gets inbound links only from the home trust band and the footer.
- Why it costs: Comparisons written by a vendor are the content that Google's reviews and helpful-content systems, and readers, trust least. The usual way to earn that trust is an on-page link from the disclosure to the author or about page. Without it, the E-E-A-T signal is weakest on the pages most likely to be judged on it. The block also says "Check everything" but gives the reader no one-click way to check who wrote it.
- Fix: Make "WCPOS" (or "the makers of WooCommerce POS") in `compare.disclosure.body` a rich-text link to /about-us in all ten locales. Set the WebPage `publisher.url` to the locale /about-us URL.
- Scope: ok. This is a link on existing copy and adds no claim or page. It leaves the "makers of WooCommerce POS" wording, which is a front-desk hold, as it is.

## Runner-up notes (max 3 lines)
- `src/app/sitemap.ts` `CONTENT_UPDATED_AT` still says 2026-11-18 for / and /compare. #841 (hub title) and #843 (home) changed both on 2026-11-19, so the lastmod dates drift again every round. Derive them at build time or bump them with each fix.
- The /about-us title still renders as "About | WCPOS" (`about.meta.title`). It is the E-E-A-T target of the fix above and wastes its title. Suggested: "About WCPOS – WooCommerce POS since 2014".
- No SoftwareApplication block (home, /downloads, /pro) carries `aggregateRating` or `review`, so none can get a star rich result for "WooCommerce POS". This needs front-desk sign-off, because it adds a rating figure taken from wordpress.org.
