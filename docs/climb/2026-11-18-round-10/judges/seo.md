# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the store's register, using the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line above the H1 says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/pro`, all locales, desktop and phone ("What's included in Pro?" grid, "Order Management" card).
- Element: "Order Management — Browse order history, open past orders, and manage them without leaving the register." (`messages/en.json:443`)
- Problem: The site advertises refunds at the register as a headline Pro feature everywhere except the page that sells Pro. `/downloads` step 3 says Pro "adds terminal payments, refunds and stock control", and its "Unlock the full till" card leads with "Payments, refunds, …". Every `/compare/*` page lists "refunds at the register" under "Pro adds". On `/pro`, none of the seven feature cards or the FAQ contains the word "refund"; it appears only as the footer's Refunds (policy) link. A shop owner who clicks "View Pro plans" on `/downloads` to check the refunds they were just promised finds only "manage them".
- Why it costs: Refunding a customer at the counter is one of the first things a shop owner checks a POS for. A promise made on one page and missing from the money page reads as either an upsell trick or a missing feature. Either way the buyer stops at the price. The page also misses the "WooCommerce POS refunds" search term that the other pages already use.
- Fix: Change the card to "Browse order history, open past orders, and refund them without leaving the register." in all ten locales, optionally also changing the title to "Orders & Refunds".
- Scope: ok. This reuses a claim the site already makes on `/downloads` and every `/compare/*` page. There are no price or plan changes.

## Worst defect — UI
- Page/viewport: `/pro` and every `/xx/pro`, phone (390×844); see `pro-phone-fold.jpg`.
- Element: Right after the H1 "WCPOS Pro" and its subtitle comes the whole "Get Pro / One license, all features… / Yearly · Most Popular · $129 USD /yr / Lifetime · $399 USD once" box. "What's included in Pro?" and the feature cards start only below it.
- Problem: On desktop, features and the buy box sit side by side. Stacked at phone width, the buy box comes first, so the first phone screen is two prices and no feature. This round's improved terminal card (#743) and round 7's "More Registers & Multiple Stores" are both a full scroll below the price on phone. I named this in round 9 and it is unchanged live.
- Why it costs: On the one conversion page, phone visitors see the price before anything that justifies it. The H2 that names the page's topic ("What's included in Pro?") is also off the first screen.
- Fix: Below `lg`, put the features column first: `order-1` on the features column, `order-2` on the buy box, `lg:order-none` on both. The desktop layout stays unchanged.
- Scope: ok. Only the stacking order changes; the price wording and format stay as they are.

## Worst defect — SEO
- Page/viewport: `/downloads`, all ten locales, desktop and phone.
- Element: `<h1>One till, every device.</h1>` (`messages/en.json:1633`, `downloads.hero.title`). The "DOWNLOADS" eyebrow above it is a `<p>`. The H2s are "One store at the centre. Every till in sync.", "Three steps to your first sale" and "What's new".
- Problem: The title, "Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS", and the SoftwareApplication JSON-LD target download queries. The page's only H1 has no "download", "WooCommerce", "POS" or platform name. It also uses "till", a British word, on a site that says "register" everywhere else. Every other money page now carries the topic in its H1 or title: home, `/compare`, `/compare/*`, `/extensions`, and `/support` since #745. This is the sixth round the H1 has been named. The sitemap ranks `/downloads` 0.9, second only to home.
- Why it costs: After the title, the H1 is the strongest on-page relevance signal. When the title and H1 disagree, Google is more likely to rewrite the title in results. Searches like "WooCommerce POS app download" or "WooCommerce POS for Windows" get no heading-level match, and US owners read "till" as foreign copy.
- Fix: Set `downloads.hero.title` to "Download WooCommerce POS for every device" in en, using each locale's term from its home title (de "Kassensystem", nl "Kassasysteem", and so on). Keep "One till, every device." as a line under the H1 if wanted, and update the H1 assertion in `downloads/page.test.tsx`.
- Scope: ok

## Runner-up notes (max 3 lines)
- Sitemap `lastmod` is stale (`src/app/sitemap.ts` `CONTENT_UPDATED_AT`): `/`, `/pro` and `/compare*` still say 2026-10-05 to 10-07 after the 2.0 launch (9 Nov) and rounds 1–9. `/compare/foosales` has none. Google ignores `lastmod` it finds inaccurate.
- The shared SoftwareApplication JSON-LD (`src/lib/software-application-json-ld.ts`) has no `description` and no `softwareVersion` ("2.0.4" is on `/downloads`), and its `url` is fixed at `https://wcpos.com` on every locale.
- `/pro` shows five FAQ questions with no `FAQPage` JSON-LD, though all `/compare/*` pages have it.
