# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source point-of-sale for my WooCommerce shop that turns a tablet into the till, using the same products, stock and prices, and it keeps working offline.
Why version 2: The red "New in 2.0" line says I now get register open and close, split payments and today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: / (home), desktop and phone
- Element: "Compare WooCommerce POS systems". This is a small text link under the final "Ready to sell in-store with WooCommerce?" CTA in the dark band at the very bottom. The same link is in the footer.
- Problem: I came here with a shortlist: Square for WooCommerce, this app and FooSales. The site already has sourced comparison pages for both of the others (/compare/square and /compare/foosales). But the home page body never mentions Square or FooSales, and the only way to reach those pages is a small grey link below the last CTA. Neither the pricing teaser ("Start free. Upgrade when you need more.") nor the hero trust row ("5,000+ Active Stores · Free & Open Source · Since 2014") points to them.
- Why it costs: Someone deciding between three options this week wants to answer "how is this different from Square?" while the decision is still open. That moment is at the pricing card. If the answer isn't there, they go back to the search results and read Square's own page, so the best proof on the site goes unread.
- Fix: Below the "See Full Pricing & Features" button, add one line in every locale: "Comparing with Square or FooSales? See our sourced comparisons →", linking to /compare.
- Scope: ok (a copy line and a link to an existing page; no new claims or numbers)

## Worst defect — UI
- Page/viewport: /compare/square (the same template serves all seven /compare/* pages), phone 390 px
- Element: The lead paragraph "Many WooCommerce stores sell in person with Square's POS app and keep it in step with the Square for WooCommerce extension. Here is how that compares …". It is centred, in large light-grey type, and runs to six lines.
- Problem: The first phone screen shows the breadcrumb (two lines), a two-line H1, then six lines of centred grey text set larger than the body copy. "The short answer" starts at the very bottom edge, and no verdict, table row or price appears in the fold. Centred, low-contrast text this long is slow to read on a phone. It is also the least useful paragraph on the page, because it only restates the H1.
- Why it costs: I skim. On a comparison page I want the answer on the first screen, and here I have to scroll past a block that looks like an intro before I reach anything I can use.
- Fix: On small screens, left-align the /compare/* hero lead and set it at body size with body-text colour (for example `text-left text-base text-gray-700` below `sm`). That brings "The short answer" into the phone fold. Desktop stays unchanged.
- Scope: ok (styling of one shared hero component; no copy change)

## Worst defect — SEO
- Page/viewport: /compare/square (and its siblings), every viewport and the search result
- Element: `<title>` "WCPOS vs Square for WooCommerce (2026): An Honest Comparison | WCPOS"
- Problem: The title is 68 characters and says WCPOS twice. Google cuts titles at roughly 580 px, so the search result ends around "An Honest Compari…" and the brand suffix never shows. The official-POS sibling is 72 characters ("WCPOS vs WooCommerce's Official POS (2026): An Honest Comparison | WCPOS"). This has been on the round-10 and round-16 candidate lists without being fixed.
- Why it costs: The query that would bring me here, "Square vs WooCommerce POS", gets a cut-off title whose last visible words are filler. A shorter title that keeps both product names and the year reads as complete and is more likely to be shown as written rather than rewritten by Google.
- Fix: In `messages/*.json`, drop "An Honest Comparison" from the seven `compare.*.title` strings, giving for example "WCPOS vs Square for WooCommerce (2026) | WCPOS" (45 characters). Keep the "honest" framing in the description and H1 area.
- Scope: ok (metadata strings only)

## Runner-up notes (max 3 lines)
- The /compare hub lists Oliver POS first, while Square (3rd) and FooSales (7th, last) are the two most likely to be on a shop owner's shortlist. Order the cards by how often a WooCommerce store meets each competitor.
- The home H2 "One POS. Web, desktop, iOS & Android." while the 2.0 phone apps are not in the stores yet: the chips say Beta, but the heading itself does not.
- The ceramicist "markets" testimonial is the best proof for a market-stall seller, and it is the middle card of three, under a generic "Works for stores of all kinds".
