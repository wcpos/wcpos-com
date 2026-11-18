# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free till for my WooCommerce shop that runs on a tablet at the counter and uses the same products, stock and prices as my website, even when the internet drops.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales report, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare and all seven /compare/* pages (I read /compare/square), every viewport. It is the "Who runs this comparison" box.
- Element: "This page is published by kilbot, the maker of WCPOS. We obviously have a horse in this race …"
- Problem: The box is meant to earn my trust, but it names the author by a username, "kilbot". To someone who isn't technical, that reads like a bot or an anonymous handle. The About page says something much stronger: "Hi — I'm Paul. I built WCPOS." It names Paul Kilmurray and shows him in his own Perth shop. The home page testimonial also says "Paul is responsive on Discord". The comparison pages are where I'm actually choosing between Square, FooSales and WCPOS, and there I never learn that a real shopkeeper wrote them.
- Why it costs: My best reason to believe a vendor's own comparison is that it was written by a named person who ran a shop like mine. "kilbot" throws that away. It makes the honest-comparison box feel less honest, right where I decide which POS to try this week.
- Fix: In `compare.disclosure.body` (en, plus the nine other locales), replace "kilbot, the maker of WCPOS" with "Paul Kilmurray, who built WCPOS for his own shop", and link it to /about. This only reuses facts the About page already states.
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare/square, phone (390 px). The same applies to all seven /compare/* pages, since they share `GlanceTable`.
- Element: The "At a glance" header row: "WCPOS" | "Square POS + Square for WooCommerce"
- Problem: On phone the nine-row table runs about two and a half screens. Its column labels appear once, in small grey text above the first row, and scroll away by the "Countries" row. On the rows I care about most ("Price", "Card payments", "Card fees", "Offline"), I see two unlabelled columns. I have to scroll back up to work out which side is WCPOS and which is Square.
- Why it costs: This table is where a shop owner on a phone decides. If the answers aren't labelled, the comparison is easy to misread (for example, crediting "Offline card payments, uploaded within 72 hours" to the wrong product), or the reader gives up on it.
- Fix: In `src/components/compare/glance-table.tsx`, make the header row sticky below `sm`, under the site header, with a solid background (`max-sm:sticky max-sm:top-<header height> max-sm:z-10 max-sm:bg-…`). Alternatively, print a small "WCPOS" / vendor label above each answer cell on phone.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare hub, all viewports
- Element: Seven cards. Each H2 ("WCPOS vs Square for WooCommerce", "WCPOS vs FooSales", …) is plain text, and each card's only link reads "Read the comparison".
- Problem: The hub is the only page that links to all seven comparison pages, but every link has the same generic anchor text. The words that match what people search for ("WCPOS vs Square", "vs FooSales") sit in headings that aren't links. Search engines get no anchor-text signal for any comparison page. Screen-reader link lists also show seven identical "Read the comparison" links.
- Why it costs: Comparison queries like "Square for WooCommerce alternative" or "FooSales vs …" are exactly what shoppers like me type. The internal links that should rank these pages carry no keywords.
- Fix: Wrap each card's H2 text in the same link as its CTA, or give each CTA a vendor-specific accessible name (e.g. `aria-label` "Read WCPOS vs FooSales"). Nothing visible changes.
- Scope: ok

## Runner-up notes (max 3 lines)
- The /compare hub still lists Oliver POS first and FooSales last. My shortlist is Square, WooCommerce's own POS and FooSales, so I scroll past four cards to reach FooSales. Ordering cards by how often shops compare them would help.
- The home subline "WCPOS turns the tablet into your register" should say "your tablet". It also runs on phones and laptops, as the next section says.
- The /compare/square title is 68 characters ("… (2026): An Honest Comparison | WCPOS"), so Google will cut it before the brand.
