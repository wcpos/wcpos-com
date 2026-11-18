# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register and sells from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone, all locales. This is step 3 of "Three steps to your first sale" (`messages/en.json`, `downloads.*.pro.body` / `cardTitle` / `cardBody`).
- Element: "Want more? Go Pro — A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." The card under it reads "Unlock the full till — Terminal payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: This is the only Pro pitch on the highest-intent page after home, and it still leaves out the main reason to upgrade. Free is "One register" (home pricing card, /pro FAQ), and home and /pro both list "More registers & multiple stores" first. Here "more registers" is missing and "multi-store" is sixth. The card title says "till", while every other page says "register". This is the third round I have named it. It was deferred, not blocked, and it is still live.
- Why it costs: An owner installing WCPOS for a second counter or a second shop isn't told that Pro is the answer, at the moment they are downloading. "Till" also reads as foreign to US owners and moves this page away from the "WooCommerce POS register" wording the rest of the site ranks on.
- Fix: Lead with the existing /pro claim: "A licensed plugin that adds more registers and stores, terminal payments and stock control on the same foundation." Retitle the card "Unlock more registers & stores", using each locale's existing /pro "More Registers & Multiple Stores" string.
- Scope: ok. It reorders and rewords claims /pro already makes. Prices and plan terms stay as they are.

## Worst defect — UI
- Page/viewport: `/support` on phone (390 px), `support-phone-fold.jpg`.
- Element: The input placeholder reads "e.g. How do I connect a receipt printe", cut off at the "Ask" button. The "Ask" button and the three chips ("How many sites can I use my licence on?" …) are drawn at low contrast, as if disabled, above a Cloudflare "Verify you are human" box.
- Problem: The page's only control looks broken on first view. The example question is cut off mid-word, and the button and suggestions look greyed out with no text saying why: they are waiting for Turnstile. A visitor can't tell that ticking the box will turn them on. Two rounds have deferred this (woo-dev, round 20).
- Why it costs: /support is where a stuck owner lands from the nav and from search ("WooCommerce POS help"). If the controls look dead they leave for the forum or Discord, and the instant-answer feature, which is the page's whole content, never gets used.
- Fix: Shorten the phone placeholder to fit (e.g. "e.g. Connect a receipt printer"). While Turnstile verifies, keep the chips at full contrast and show a one-line "Verifying you're human…" status next to the Ask button instead of fading it.
- Scope: ok. One component's copy and styling.

## Worst defect — SEO
- Page/viewport: All seven `/compare/*` pages on every locale, for example `/compare/square`. The JSON-LD array is in each page's `page.tsx` (for example `compare/square/page.tsx:85-110`).
- Element: Visible: "Square facts verified 2026-10-06 on squareup.com…", with "(2026)" in the title "WCPOS vs Square for WooCommerce (2026) | WCPOS". JSON-LD: `Organization`, `FAQPage`, `BreadcrumbList` only, with no `datePublished` or `dateModified`.
- Problem: These pages sell freshness: a dated title, a "verified" caption and "We re-verify every quarter". The markup carries none of it. The date exists only inside a translated caption string, so Google has to guess it from the text, and the sitemap `lastmod` (2026-11-18) disagrees with the visible date (2026-10-06).
- Why it costs: "X vs Y" and "Square for WooCommerce alternative" results are ranked and clicked on recency, and the date Google shows in the snippet comes from structured data first. These seven pages are the site's acquisition pages for competitor queries. Without a machine-readable date they can show no date, or a wrong one, next to competitors' dated reviews. The shop-owner judge has raised this twice and I raised it as a runner-up.
- Fix: Add a `WebPage` (or `Article`) node to each page's existing JSON-LD array, with `url: localeUrl(locale, path)`, `inLanguage`, `dateModified` set to that page's verified date, and `publisher` set to the WCPOS Organization. Put the date in one constant per page so the caption and the JSON-LD can't drift apart.
- Scope: ok. Markup only, using dates the pages already show.

## Runner-up notes (max 3 lines)
- The home `<title>` "WCPOS - Point of Sale for WooCommerce" still lacks the head term "WooCommerce POS", while /downloads, /pro, /support and /extensions all use it. This is held with the front desk.
- "Till" is still in /downloads headings: the tagline "One till, every device." and the H2 "…Every till in sync.". The en /support chip says "licence", while /pro says "license".
- The home and /downloads SoftwareApplication has no `softwareVersion`, although /downloads already shows "Version 2.0.4". The /compare hub meta description is 162 characters and names no competitor.
