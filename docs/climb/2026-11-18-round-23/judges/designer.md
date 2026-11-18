# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the online store's own catalog, stock and prices, even offline.
Why version 2: The red "New in 2.0" line above the kicker answers it on desktop and phone, in en, nl and de: in 2.0, opening and closing the register, split payments and today's sales are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, all locales.
- Element: the "Who runs this comparison" box: "…so every number is sourced and dated, we link to competitors' own pricing pages, and we tell you plainly when a competitor is the better choice. Check everything." The only sourcing on the page is the footer note: "Facts about Square verified 2026-10-06 against Square's own pages (its fees page, its pricing announcement, and its help articles on offline payments, Tap to Pay, devices, and international availability)…". It names those pages but links none of them.
- Problem: The page makes a promise and then breaks it. "Check everything" leads nowhere: no link to Square's fees page, pricing announcement or help articles, and no link to the WooCommerce extension docs. /compare/foosales and /compare/vitepos each have a "Sources" section that renders a `SOURCES` list of linked URLs (`foosales/page.tsx:43, 281-290`). `square/page.tsx` has no `SOURCES` at all, and Square is the first and most-searched card on the /compare hub.
- Why it costs: The disclosure box is the page's whole trust device. When a sceptical owner who is weighing Square clicks to check a fee and finds no link, the vendor's "honest comparison" reads as marketing. This is the comparison most likely to be read, and the failure sits right where the page asks for trust.
- Fix: Add the same "Sources" section that foosales and vitepos use to `square/page.tsx`. Use a `SOURCES` array with the Square fees page, the pricing announcement, the four help articles and the WooCommerce Square extension docs that the footer note already names, plus `square.sources.*` keys in all locales.
- Scope: ok. This adds links to sources the page already cites, using an existing pattern. There are no new claims.

## Worst defect — UI
- Page/viewport: /extensions, phone (390). This is visible in `shots/extensions-phone-full.jpg`, at about y 2600–4600, below the fold.
- Element: the "Pro" chip after "PayPal Reader for WooCommerce", "Square Terminal for WooCommerce", "Stripe Terminal for WooCommerce" and "SumUp Terminal for WooCommerce". Their titles fill exactly one line, so the chip drops onto a line of its own and keeps its `ml-2` indent. Mercado Pago and Windcave wrap the title and keep the chip inline, so the chip's position also changes from card to card.
- Problem: Round 22's record counts this as fixed, going by the fold, where Mercado Pago's chip sits inline. The full-page capture shows it is not fixed. The markup is unchanged: `<h3 className="inline …">` with a sibling `<Badge className="ml-2 align-middle">` (`src/app/[locale]/(main)/extensions/page.tsx:112-121`). In the run of card-terminal cards, each chip floats alone on its own line, about 8 px in from the title edge.
- Why it costs: These are the paid add-ons, on the page where card-terminal searches land. A detached, off-grid tag reads as a layout bug rather than "needs Pro", and it breaks the left edge of every card in the group that matters most. #761 fixed the same pattern in `FeatureCard`.
- Fix: Change the wrapper `<div>` to `flex flex-col items-start gap-1`, drop `inline align-middle` from the h3, and drop `ml-2 align-middle` from the Badge. The chip then always sits flush left under the title, on every card and at every width.
- Scope: ok. This is styling in one page component.

## Worst defect — SEO
- Page/viewport: /compare/square and the other six /compare/* pages, all locales.
- Element: the bottom of /compare/square. After the final CTA, the only link into the cluster is "Compare WooCommerce POS systems", which goes back to the hub. There is no "WCPOS vs FooSales / Oliver POS / WooCommerce's official POS / Jovvie / Vitepos / YITH" row. The page has 13 internal links, against 20 on the hub.
- Problem: The seven comparison pages form a hub-and-spoke cluster with no links between the spokes. Each spoke links only up to the hub, so link equity and crawl paths run through one page. A reader who has finished "vs Square" and is still shopping has no next comparison to open.
- Why it costs: "WCPOS vs X" and "X alternative" are long-tail queries, and topical clusters rank better when their siblings cross-link. Visitors who finish one comparison are the best-qualified traffic on the site, and the page drops them at a dead end.
- Fix: Above the existing hub link, add a shared "More comparisons" list of the other six compare pages, built from the hub's existing card list with the current page filtered out. Use the hub's existing card titles as link text.
- Scope: ok. These are links built from existing titles, with no new page and no new copy beyond a section label.

## Runner-up notes (max 3 lines)
- /pro (en): "Customer-facing display" is the only sentence-case title among eight Title Case feature names, and its body still says "pair it to a till" while the rest of /pro says register (`messages/en.json:439-440`, and the compare rows at `:2043` and `:2664`).
- /support desktop and phone: the caption "Answered by Aide · trained on the WCPOS docs & wiki" sits about 9 px above the Turnstile box, so it reads as the widget's label. Below the widget, about 230 px of empty space comes before "Prefer to talk to a human?".
- On home phone, the trust row leaves "Since 2014" alone on its own line in en, nl and de. On de home phone, the "Neu in 2.0" line leaves "kostenlos." alone on a third line.
