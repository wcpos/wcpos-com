# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns a tablet (or any screen) into the register for your WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales, all free. It is answered in the small line above the kicker, which reads clearly at both widths but links nowhere.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, desktop and phone. Since #743 it is where the /pro terminal card's "See all terminal extensions" link lands.
- Element: The hero subtitle "The extensions available for WCPOS, each with a link to its documentation." It sits above an alphabetical grid of 18 cards whose first card is "Email Invoice Gateway". The nine card-terminal extensions (Mercado Pago, Mollie, PayArc, PayPal Reader, Square, Stripe, SumUp, Vipps MobilePay, Windcave) are mixed in with WPML, Polylang, WP Multilang, ATUM and Smart Coupons.
- Problem: A shop owner who clicked "See all terminal extensions" on /pro arrives on a page that never says "card terminals". The subtitle describes the page's mechanics ("each with a link to its documentation") rather than what the extensions do for the store. To find out whether their processor is supported, the visitor has to read every card title, because terminals and language plugins carry the same visual weight in catalog order. The page's own title ("Extensions & Card Terminals") promises a terminal list that the layout does not show.
- Why it costs: This is the payoff page for Pro's most concrete paid feature, and the visitor reaches it at the moment they decide whether their terminal is supported. A flat, unlabelled catalog reads like a docs index, not a reason to buy Pro, and terminal answers that are already on the page get missed.
- Fix: Split the grid into two groups, each under its own H2: "Card terminals" first (the terminal entries, picked by a `kind` field or by name in the catalog), then "Inventory, languages & more". Rewrite the subtitle to say what extensions are for, e.g. "Take card payments on your own terminal, and connect WooCommerce plugins such as WPML and ATUM to the register." Do this in all ten locales.
- Scope: ok. It regroups existing cards and changes one line of copy. It names no new extensions and makes no new claim or pricing change. The page test currently asserts catalog order (`page.test.tsx:114`), so that test needs updating to the grouped order.

## Worst defect — UI
- Page/viewport: /compare/square on phone (390), and the "At a glance" table on every /compare/* page. Each page has its own `ComparisonTable`, e.g. `src/app/[locale]/(main)/compare/square/page.tsx`.
- Element: The three-column "At a glance" table: the row label ("In-person sales", "Devices", "Countries", "Offline", "Multiple stores / locations"), "WCPOS", and "Square POS + Square for WooCommerce".
- Problem: This is unchanged from round 9. At 390 px the label column takes about a third of the width, so each answer column is about 110 px wide. "Devices" runs eight lines on the Square side, "Offline" runs nine on the WCPOS side, "Card payments" runs eight, and the column header breaks over three lines. The nine rows fill roughly 2,700 px of ragged, narrow text whose two columns never line up. Since #744 the short answer comes first, so the table is now the next thing a phone visitor reaches, and it is the hardest block on the page to read.
- Why it costs: The glance table is what a comparison visitor came for, and it is what the page means answer engines to extract. On phone it reads as a wall of text, and both the comparison and the site's polish suffer at the moment of decision. Dutch and German cells run longer still.
- Fix: Below `sm`, give each row label its own full-width row (`<tr class="sm:hidden"><th colSpan={2} scope="colgroup">`) and hide the label cell in the data row (`hidden sm:table-cell`). The two answer columns then each get about half the width (about 170 px). Shorten the column header to the product name on phone. Leave the desktop table unchanged.
- Scope: ok. It changes markup and responsive classes in the compare pages' table only. The copy, cells and table semantics stay the same.

## Worst defect — SEO
- Page/viewport: /downloads, all locales and viewports.
- Element: The H1 "One till, every device.", with the small kicker "DOWNLOADS" above it.
- Problem: The page's only H1 contains no search term: no "WooCommerce", no "POS", no "download" and no platform name. The title ("Download WooCommerce POS for Mac, Windows, Linux & Web") does the work alone, and the strongest on-page heading is a slogan. This has been open five rounds; every other captured page now carries its category term in the H1 or the title and the H1.
- Why it costs: /downloads ranks for high-intent queries ("woocommerce pos app download", "wcpos windows"). An H1 that matches the title strengthens that match and makes a clearer passage for snippets. A slogan H1 gives the ranking no signal, and a visitor who lands from search does not see their query confirmed in the headline.
- Fix: Make the H1 "Download WooCommerce POS" (or the locale's term, as used in the /support title) and keep "One till, every device." as the display subtitle. Or, keeping the visual as it is, render the kicker as the H1 text "Download WooCommerce POS" and demote the slogan to a `<p>`. Do this in every locale.
- Scope: ok. It changes heading copy and markup only, with no new claim.

## Runner-up notes (max 3 lines)
- /extensions desktop: each link repeats the full card name ("Mercado Pago Terminal for WooCommerce documentation"), so it wraps onto two lines with the arrow pushed to the far right edge, and the links sit at different heights across a row. Shorten the link text to "Documentation →" and keep the name in its `aria-label`.
- /compare/* phone: about 200 px of empty space sits between the lead and "The short answer", so the answer starts half a screen lower than it needs to. Tighten the hero's bottom spacing on the compare pages.
- Home phone "Built for…" cards, and the /extensions Windcave card on desktop: the "Pro" badge wraps onto a line by itself after a long title ("Reports across days, registers & stores"). Keep the last word and the badge together with `whitespace-nowrap`.
