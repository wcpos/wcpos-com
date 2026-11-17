# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns a tablet into the shop's register, using the store's own catalog, stock and prices, even offline.
Why version 2: The eyebrow above the H1 says 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone (all locales), "How it fits together" section.
- Element: "Offline-first, so the till never stops" / "Each device keeps working without a connection and re-syncs the moment it's back online."
- Problem: The claim is unqualified. In 2.0, only browsing, carts, and sales paid in cash or with the Card tender complete offline. Integrated card readers and online gateways need a connection, and the extensions page sells those readers. On the download step, this line tells a shop owner that their Stripe or SumUp reader will keep taking payments when the Wi‑Fi drops, and it won't. The home page says it more carefully ("even offline" about catalog, stock and prices).
- Why it costs: The visitor reads this line just before they install. A promise that breaks on the first outage of a busy day becomes a support ticket and a one-star review, and that does more damage than a weaker headline. The sceptic flagged it in round 3, and it is still live.
- Fix: Rewrite the item in `messages/*.json` as, e.g., "Keeps selling offline": "Cash and Card-tender sales complete without a connection and sync when you're back online; connected card readers need a connection."
- Scope: ok

## Worst defect — UI
- Page/viewport: `/nl/pro` buy box, phone and desktop (also any locale whose `Intl` currency symbol is "US$", e.g. es, pt, ko, if their formatter returns it).
- Element: "US$ 129 USD /jaar" and "US$ 399 USD eenmalig" (de shows "129 $ USD/Jahr").
- Problem: The currency is shown twice. `pro-buy-box.tsx:120` adds the grey ISO code only when `priceText` does not contain "USD". The nl formatter returns "US$ 129", which does not contain "USD", so the code is added again. At 390 px, the doubled currency makes the price the widest element in the card, and it reads as a rendering bug at the moment of purchase.
- Why it costs: The price row is the most-read line on the page for a buyer, and a duplicated currency there looks careless and makes the visitor doubt the checkout. English is clean ("$129 USD /yr"), so only non-English buyers see it.
- Fix: In `pro-buy-box.tsx`, also hide the ISO suffix when `priceText` already contains "US$". Alternatively, format with `currencyDisplay: 'narrowSymbol'` so every locale renders "$129" followed by the single "USD".
- Scope: ok (display formatting only; the amount, period and plan terms stay word-for-word the same)

## Worst defect — SEO
- Page/viewport: `/downloads`, all locales, desktop and phone.
- Element: `<h1>One till, every device.</h1>` (the "DOWNLOADS" eyebrow above it is a `<p>`), under `<title>Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS</title>`.
- Problem: #714 fixed the title, but the page's only H1 still has no "download", "WooCommerce", "POS" or platform word. "Till" is a British term, and US shop owners search "register" or "POS". The title and H1 now disagree, and Google often rewrites a title from the H1 when the two diverge. The rest of the page's headings ("One store at the centre. Every till in sync.", "Three steps to your first sale") carry no query terms either. Of the four money pages, this is the only H1 that says nothing about the product.
- Why it costs: /downloads should rank for "WooCommerce POS app", "WooCommerce POS for Windows/Mac/Android" and "download WooCommerce POS". It is the page with the version number and the platform links. With a slogan H1, its relevance comes from the title alone, and a rewritten snippet could read "One till, every device. | WCPOS".
- Fix: Change `downloads.hero.title` (`messages/en.json:1625`) and the nine locales to, e.g., "Download WooCommerce POS for every device". Keep "One till, every device." as the eyebrow or subtitle, and update the H1 assertion in `downloads/page.test.tsx:131`.
- Scope: ok

## Runner-up notes (max 3 lines)
- /downloads still has only `Organization` JSON-LD. Add `SoftwareApplication` (operatingSystem list, softwareVersion 2.0.4, downloadUrl, offers price 0), the natural partner to the H1 fix.
- /compare and its seven competitor pages get no link from the home page body (footer only), although home is the strongest page. A single "How WCPOS compares" link near the Free/Pro block would pass authority to the competitor-query pages.
- /pro shows a visible FAQ but no `FAQPage` markup; /compare/* has it. Adding it is low effort, though Google now shows FAQ rich results rarely.
