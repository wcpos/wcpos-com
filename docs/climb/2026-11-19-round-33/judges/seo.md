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
- Page/viewport: /pro, phone and desktop, all locales. This is the "Get Pro" buy box.
- Element: The proof under "Get Started" is still only "One-time payment — never auto-renews…", "Try the free version first…", "Card, PayPal or Bitcoin" and "5,000+ active stores" (pro.txt). /pro has no customer voice anywhere. The home page has the one review from a Pro buyer: "…bought the lifetime Pro license a few months ago — worth it, I think. Paul is responsive on Discord, even on weekends." — adeline, wordpress.org review (translated from French).
- Problem: /pro is the only page that asks for money, and it is the page with the least third-party proof. A store count is a claim the site makes about itself. The one quote from someone who paid for Pro sits on the free-product page instead of at the paid decision. I raised this in round 32 and it has not changed.
- Why it costs: Visitors who land on /pro from "WCPOS Pro" or "WooCommerce POS pricing" searches have not seen the home page. At the buy box, a hesitant buyer has two doubts: is Pro worth it, and does support respond. adeline's quote answers both, and right now nothing there comes from another shop owner.
- Fix: Under "5,000+ active stores" in the /pro buy box, render the existing adeline quote and attribution. Reuse the home message key and testimonial markup, and add no new quote.
- Scope: ok. The quote is already published on the site, and the price wording and plan terms stay untouched.

## Worst defect — UI
- Page/viewport: /extensions, desktop 1440×900 (and every width from `md` up), all locales.
- Element: The empty band between "Extensions marked Pro need WCPOS Pro." and the H2 "Card terminals and payments". The hero is `Section … className="pt-10 pb-6 sm:py-20 md:py-24 lg:py-28"` and is followed by `Section tone="muted" spacing="default"` (`py-16 md:py-24`), in `src/app/[locale]/(main)/extensions/page.tsx:72,90`.
- Problem: At `lg`, the hero's 112 px bottom padding stacks on the muted section's 96 px top padding. That leaves about 208 px of blank space, split across a white and a grey band, under a three-line intro (extensions-desktop-full.jpg). The first row of terminal cards, which is what this page is for, starts at about 615 px and is cut off by the fold and the consent bar. #838 fixed only the phone top padding, so desktop still has the gap.
- Why it costs: Visitors arrive from terminal searches ("Stripe Terminal WooCommerce POS") to check whether their reader is supported. The first screen spends almost a quarter of its height on empty bands, and the answer sits half below the fold. It also looks unlike /compare and /pro, whose content starts straight after the hero.
- Fix: Cut the hero's bottom padding from `sm` up (e.g. `pt-10 pb-6 sm:pt-20 sm:pb-8 md:pt-24 md:pb-10 lg:pt-28 lg:pb-12`). Keep the top padding and the muted section as they are.
- Scope: ok. This is a spacing change on one page only.

## Worst defect — SEO
- Page/viewport: all eight /compare pages (the hub and seven spokes), every viewport and locale. The "Who runs this comparison" block.
- Element: "This page is published by WCPOS, the makers of WooCommerce POS. We obviously have a horse in this race — so every number is sourced and dated, … Check everything." (`messages/*.json` `compare.disclosure.body`). It is plain text with no link. /about-us gets links only from the home trust band ("Read our story →") and the footer.
- Problem: These comparison pages are the site's main way to win search traffic: competitor and "alternative" queries, each with FAQPage, BreadcrumbList and WebPage JSON-LD. Their trust section names the publisher but does not link to who the publisher is. The About page holds that answer ("built by a former shopkeeper and funded by shopkeepers, not investors"). Google's reviews and helpful-content guidance asks vendor-written comparisons to make clear who wrote them, and an on-page link to the author or about page is the standard signal. The WebPage `publisher` in `src/lib/compare-page-json-ld.ts` likewise names only "WCPOS" and the home URL.
- Why it costs: A comparison written by a vendor is exactly the content that search engines and readers treat with suspicion. Without a crawlable path from the disclosure to the maker's story, the disclosure cannot do its job, the E-E-A-T signal is weak on the pages most likely to be judged on it, and /about-us stays an orphan-like page with two inbound links. Search visitors also cannot check "who are you" in one click, although the block itself says "Check everything".
- Fix: Make "WCPOS" (or "the makers of WooCommerce POS") in `compare.disclosure.body` a rich-text link to /about-us in all ten locales. Optionally, set the WebPage `publisher.url` to the locale /about-us URL.
- Scope: ok. This is a link on existing copy and adds no new claim or page.

## Runner-up notes (max 3 lines)
- `src/app/sitemap.ts` `CONTENT_UPDATED_AT` still gives 2026-11-18 for /, /pro, /extensions, /support, /compare and /compare/*. #829–#839 changed all of them on 2026-11-19, so the dates are wrong again one day after #764 fixed them. Bump them, or derive the dates at build time.
- The /about-us title renders as "About | WCPOS" (`about.meta.title`). The site's E-E-A-T page wastes its title, when it could read "About WCPOS – WooCommerce POS since 2014".
- Home "5,000+ Active Stores" (hero) vs "5,000+ Active Installations" (stats band): the same number carries two different terms on one page.
