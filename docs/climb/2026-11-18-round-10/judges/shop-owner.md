# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free till for my WooCommerce shop that runs on the tablet at my counter, using the same products, stock and prices as my website, and it keeps working when the internet drops.
Why version 2: In 2.0 I can open and close the register, split a payment and see today's sales, all for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home, desktop and phone, the "Start free. Upgrade when you need more." pricing band, Free card (`messages/en.json` `home.pricing.free.features.f3`).
- Element: "Basic checkout" (third line of the Free list, between "Product search & grid" and "Offline mode")
- Problem: At my market stall the question is "can I take cards with the free version?" The answer is yes: cash, plus cards on the reader I already have, recorded as the Card tender. The home page says so higher up ("take cash or card on your own terminal, and split a payment"), and so does /compare/square ("takes cash, records cards taken on a separate terminal"). But the Free card is where I decide what I get for $0, and there it reads "Basic checkout". Next to Pro's "Payment terminal integration", that reads as "free can't do cards", which is wrong.
- Why it costs: I'm weighing this against Square, which takes cards on its free plan. If I come away thinking the free WCPOS is cash-only, I'll try Square or FooSales this week instead of downloading. The facts are already on the site, but this one label hides them.
- Fix: Replace "Basic checkout" with "Cash & card checkout (your own terminal)", worded the same way as the existing features copy, in each locale.
- Scope: ok (one list label per locale, restating a capability the site already states; no price or plan terms)

## Worst defect — UI
- Page/viewport: /compare/square at phone 390 px, the "At a glance" table. The shared `ComparisonTable` is also used on /compare/oliver-pos and /compare/vitepos.
- Element: The column headers "WCPOS" and "Square POS + Square for WooCommerce", in small grey text, then nine three-column rows ("In-person sales", "Products and stock", "Devices", "Countries", "Price", …)
- Problem: At 390 px the labels column takes about a quarter of the width, so each answer cell wraps to 4–10 lines ("8 countries: US, Canada, … must use the same currency as the Square account" takes 10). The table runs about two and a half screens. The headers scroll away after the first row, so by "Price" or "Card fees" I can't tell which column is WCPOS and which is Square without scrolling back up. The faint grey header doesn't stand out even when it is on screen.
- Why it costs: This table is what I came to the page for, and I skim on my phone. A long run of narrow, unlabelled cells is the point where I give up and go back to the comparison sites.
- Fix: Below `md`, make the header row sticky (and give it bolder, higher-contrast text). Or stack each row as a small card: the row label, then "WCPOS: …" and "Square: …" on their own lines. Keep the desktop table as it is.
- Scope: ok (styling in the shared compare table component; no copy changes)

## Worst defect — SEO
- Page/viewport: /downloads, all viewports (facts.json; `messages/en.json` `downloads.hero.title`).
- Element: H1 "One till, every device."
- Problem: The H1 says neither "WooCommerce", "POS" nor "app". The title is good ("Download WooCommerce POS for Mac, Windows, Linux & Web"), but the page's main heading doesn't back it up. My shortlist literally reads "the WooCommerce POS app", and that is the phrase I'd search. Every other key page now has a search term in its title or H1. This one has been open for five rounds.
- Why it costs: A heading that matches the title and the query helps the page rank for "WooCommerce POS app download". It also tells me straight away that I've landed on the right download page, and not on a page for some generic till.
- Fix: Keep "One till, every device." as the eyebrow or subtitle, and make the H1 "Download the WooCommerce POS app" (or "WooCommerce POS apps for every device"), with each locale's equivalent.
- Scope: ok (one heading string per locale)

## Runner-up notes (max 3 lines)
- The compare disclosure still says "published by kilbot". To a non-technical owner, "kilbot" reads like a bot. "The WCPOS team" or "Paul, the maker of WCPOS" would earn more trust.
- The home stats band says "5,000+ Active Installations", while the hero says "5,000+ Active Stores". It's the same number with two labels, so I wonder which one is true.
- /support's meta description (104 chars) never says "WooCommerce POS", although the title now does. It could name offline, card readers and setup help.
