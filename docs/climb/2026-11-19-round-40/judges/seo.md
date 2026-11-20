# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: a free, open-source point of sale for WooCommerce. It turns your tablet, phone or computer into a register that sells from the store's own catalog, stock and prices, even offline.
Why version 2: the "New in 2.0" line above the kicker says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare hub, all viewports. On phone the Square card is the first thing below the hero.
- Element: Square card blurb: "Square's POS plus a sync extension, versus a register built on WooCommerce: where in-person sales are recorded, syncing, locations, offline payments, card fees, and where Square is genuinely better." The FooSales card has the same pattern: "…pricing, what happens when you stop paying, Tap to Pay, offline orders, apps, and where FooSales…" (`compare.hub` card copy in `messages/en.json`).
- Problem: each card is a table of contents, not an answer. The Square page's own short answer is a single decisive fact: orders placed in Square's POS are not synced to WooCommerce, while every WCPOS sale is a WooCommerce order. The hub card hides that fact behind "where in-person sales are recorded".
- Why it costs: the hub is the landing page for "WooCommerce POS comparison" and "Square for WooCommerce alternative" searches. A shop owner scanning cards decides from the blurb whether to click. A list of topics gives no reason to click, and the card text is the same text a search engine sees as the hub's summary of each page.
- Fix: rewrite each card blurb so it leads with that page's verdict, taken from its own short answer. For example, Square: "Square's POS keeps in-person orders in Square, not WooCommerce; every WCPOS sale is a WooCommerce order. Square is the better pick if you need Tap to Pay today."
- Scope: ok (copy only; it reuses facts already stated on each comparison page, and "Tap to Pay is not in WCPOS yet" is on /compare/square).

## Worst defect — UI
- Page/viewport: home, desktop 1440×900, on the first screen.
- Element: the H1 "Your WooCommerce store, at the counter." breaks as "Your WooCommerce store, at" / "the counter.".
- Problem: the line break leaves the preposition "at" at the end of line 1 and splits the phrase "at the counter". The first line is long and the second is short and ragged. This is the largest type on the site, centred, and it is the first thing every desktop visitor reads.
- Why it costs: the headline loses its rhythm, so the promise ("at the counter") reads as an afterthought. A typographic slip in the H1 of the main page looks unfinished, and nothing else on the fold has one.
- Fix: add `text-balance` to the Heading className in `src/components/home/scroll-story/acts/story-copy-blocks.tsx` (`CopyAct1`) so it breaks as "Your WooCommerce store, / at the counter.". `story-static.tsx` renders the same `CopyAct1`, so the one class covers both copies.
- Scope: ok (one utility class, no copy change). The file sits in the scroll-story folder that the owner's open PR touches, so check that PR for a conflict first.

## Worst defect — SEO
- Page/viewport: /about-us and its nine locale versions, all viewports. This is the `<title>`, and through it `og:title` and `twitter:title`.
- Element: `<title>About | WCPOS</title>` (checked live). It comes from `messages/en.json` `about.meta.title` = "About". The other locales are just as bare: "Über uns", "Over ons", "À propos" and so on.
- Problem: the page's H1 is "An independent point of sale for WooCommerce", which is a strong, on-target phrase. The title throws it away: "About | WCPOS" names no category, no WooCommerce and no POS. This is the site's trust (E-E-A-T) page. Home links to it ("Read our story →"), and the /compare disclosures send readers to it to judge who wrote the comparison. Every other marketing page now has a title that targets a query; this is the last generic one. The defect has been on the deferred list since round 33.
- Why it costs: a title that names only the brand can rank only for brand-plus-"about" searches. It also does nothing for searchers who are vetting the maker ("who makes WCPOS", "WooCommerce POS independent developer"). On social shares the card reads "About | WCPOS" with no context.
- Fix: set en `about.meta.title` to "About Us: An Independent WooCommerce POS Since 2014". With the template it renders as "… | WCPOS", about 58 characters. Give each locale its own equivalent, using the POS term from that locale's `siteTitle` (de "Kassensystem", nl "Kassasysteem", fr "Point de vente" and so on).
- Scope: ok (one metadata string per locale; "independent" is the page's own H1 and "Since 2014" is a home-page badge, so it makes no new claim).

## Runner-up notes (max 3 lines)
- The /compare/square table lists eight Pro terminal integrations (Mercado Pago, PayArc and Windcave too), while the "How do card payments work?" prose lists five plus Vipps. Readers and search engines see two different counts on one page.
- de `home.subtitle` still says "Ein schneller Point of Sale für WooCommerce", the English term that #872 removed from the de kicker.
- `metadata.siteDescription` ("Fast, reliable POS system for your WooCommerce store.") is a stale layout fallback. Every live page overrides it today, but any new page without a description will inherit it.
