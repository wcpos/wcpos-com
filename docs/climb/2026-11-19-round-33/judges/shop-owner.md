# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet into the till for my WooCommerce shop. It uses the same products, stock and prices as my website and keeps working when the internet drops.
Why version 2: As of 2.0, opening and closing the register, split payments and today's sales report are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, phone (worst) and desktop. The same pattern is on every /compare/* page.
- Element: "The short answer". It is two dense paragraphs: the WCPOS one is 89 words ("WCPOS is a register built on WooCommerce itself: … for a one-time payment that never switches off.") and the Square one is 96 words ("Square for WooCommerce joins two systems: … the extension links one Square location at a time."). On phone that is about 26 lines of 17 px text. The first screen ends partway through the WCPOS paragraph, and the Try Live Demo button only appears after both paragraphs.
- Problem: Square is on my shortlist, so this is the page I came for. The one fact that decides it for me comes at the end of the 96-word Square paragraph: "orders placed in Square's POS are not synced to WooCommerce". My market-stall sales would not show up as Woo orders. A section called "short answer" that I have to read twice to find the answer is not short. A skimmer takes away "browser, desktop apps, beta, no caps, multi-store …", a feature list that doesn't tell them which one to try.
- Why it costs: I'm deciding this week, and I skim. If the verdict isn't in the first lines, I leave with "they look similar" and try Square, because I've heard of it. The page has better evidence than any competitor's page, but the summary hides it.
- Fix: Open "The short answer" with one bold sentence per side, built only from facts the page already states. For example: WCPOS, "Every in-person sale is a WooCommerce order, from one catalog"; Square, "In-person sales stay in Square; only products and stock sync, hourly by default". Then cut the rest of each paragraph to 2–3 short bullets. Do the same in all locales.
- Scope: ok (reorders and trims existing copy; no new claim, number or price wording)

## Worst defect — UI
- Page/viewport: /compare/square "At a glance", phone 390x844
- Element: The column label "Square POS + Square for WooCommerce" (`compare.square.atAGlance.colSquare`). It is repeated above the Square value in all nine rows of the stacked phone table.
- Problem: At 390 px the label wraps to two lines in every row. "WCPOS" fits on one. So in every row the Square value starts one line lower than the WCPOS value beside it, and the two columns never line up. The table is about 3,000 px of phone scroll. Nine copies of a 6-word grey label make up a good part of that, and they repeat what the page H1 already says.
- Why it costs: The table is where a skimmer compares price, fees and offline side by side. When the values don't line up, I lose my place and can't read across a row, which is the reason a table exists. The table also looks less finished than the rest of the page.
- Fix: Give the phone stacked layout a short column label ("Square", from a new `colSquareShort` key, or the competitor's short name). Keep the full label in the desktop header row.
- Scope: ok (one label string and a phone-only render change on an existing component)

## Worst defect — SEO
- Page/viewport: /compare hub, `<title>` and JSON-LD ItemList name (`compare.hub.metadata.title`). This is the second round it has been raised.
- Element: "Compare WooCommerce POS Systems | WCPOS" (39 characters)
- Problem: The meta description names Square, FooSales and Oliver POS, but the title names no competitor and leaves about 20 characters unused. The same generic wording is reused as the ItemList name. The hub is the only page that can match multi-competitor searches such as "Square vs FooSales WooCommerce" or "FooSales alternative". Each comparison page covers only one competitor.
- Why it costs: Shop owners with a shortlist search by brand name. A title without one is less relevant to those searches and, in the results, a less clickable blue link than one that names what I'm weighing.
- Fix: Change it to "Compare WooCommerce POS: Square, FooSales & More | WCPOS" (56 characters), with localized equivalents, staying within `metadata-length.test.ts`.
- Scope: ok (one metadata field; it names competitors the page already covers)

## Runner-up notes (max 3 lines)
- The home Free card says "One register", and "unlimited devices and cashiers" appears only in the /compare tables. A counter-plus-stall owner assumes the stall tablet needs Pro. This is plan-terms wording, so it needs the front desk.
- /pro has no "Try Live Demo" link anywhere. The only low-commitment step is "Try the free version first", which goes to /downloads, so a visitor who isn't ready to install has nowhere to go.
- The hub cards list topics ("where in-person sales are recorded, syncing, locations …") rather than the one-line difference, so the hub can't help me choose before I click.
