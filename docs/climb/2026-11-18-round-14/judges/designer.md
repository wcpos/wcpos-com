# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns a tablet into your register, selling from the same catalog, stock and prices, even offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales, all free. The red "New in 2.0" line above the kicker says so at both widths.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /de/pro, phone and desktop. This is the buy box, directly under "Loslegen" and the one-time-payment line.
- Element: "Testen Sie zuerst die kostenlose Version — upgraden Sie erst, wenn sie sich bewährt hat" (`messages/de.json` lines 482–483, `tryFreeLink` + `tryFreeSuffix`).
- Problem: The rest of /de and /de/pro uses "du": "Hol dir Pro", "Wähle nur, wie lange du Updates möchtest", "Dein WooCommerce-Shop an der Ladentheke". This one reassurance line in the buy box switches to the formal "Sie". The Dutch counterpart ("Probeer eerst de gratis versie — upgrade zodra je weet dat het bevalt") keeps "je", so only German breaks. This is the fourth round I have named it, and the capture shows it unchanged.
- Why it costs: To a German reader, switching from "du" to "Sie" inside one card looks like machine translation pasted together. It happens at the point of purchase, on the line whose job is to make buying feel safe, and it undercuts the care shown everywhere else in the German copy.
- Fix: Rewrite both keys with "du", e.g. "Teste zuerst die kostenlose Version" + " — und steig erst um, wenn sie sich bewährt hat".
- Scope: ok. Two copy keys in one locale. They do not word a price or a plan term, and they make no new claim.

## Worst defect — UI
- Page/viewport: /downloads at phone width (390), every locale. This is the sync diagram after the download card.
- Element: The red "Your store · WooCommerce · + WCPOS plugin" hub and the "Desktop" node above it (`src/components/downloads/sync-diagram.tsx`: `SIZE = 440`, `ORBIT_RADIUS = 138`, orbit laid out in % of the box).
- Problem: At 390 px the hub's red disc covers the lower half of the "Desktop" label, and the Android node nearly touches the hub. The orbit shrinks with the container, but the hub and the nodes keep a fixed size, so they collide on narrow screens. The diagram also renders above its own "HOW IT FITS TOGETHER / One store at the centre. Every till in sync." heading (`how-it-fits.tsx`, a single-column grid below `lg`), so it floats with no label after a wide empty band. At 1440 it is clean. This is the third round I have named it.
- Why it costs: /downloads is where a visitor commits to install, and most arrive on a phone. The page's only architecture illustration shows a label cut off by a shape. That looks unfinished on the page whose job is to make the product feel dependable.
- Fix: Scale the hub and nodes with the container (size them in % of `SIZE`, or `scale()` the whole diagram from its measured width), or raise `ORBIT_RADIUS` below `sm`. Add `order-last lg:order-none` to the diagram column so the eyebrow and H2 come first on phone.
- Scope: ok. Styling in one component plus one class in `how-it-fits.tsx`, with no copy change.

## Worst defect — SEO
- Page/viewport: `/sitemap.xml` (all locales). It affects /, /pro, /extensions, /compare and the /compare/* pages.
- Element: `src/app/sitemap.ts` lines 48–59: `'/': '2026-10-07'`, `'/pro': '2026-10-07'`, `'/compare': '2026-10-07'`, `'/compare/square': '2026-10-06'`. `/compare/foosales` (line 24) has no entry.
- Problem: The sitemap tells crawlers that the home page last changed on 7 Oct, but 2.0 shipped on 9 Nov and the home page has been rewritten since: the "New in 2.0" line, the new meta description, #760 and #761. /pro gained `FAQPage` and the display card (#756/#757), and all seven /compare/* pages got body links today (#759). Every `lastmod` predates the release that the pages now sell, and FooSales has none.
- Why it costs: Google trusts `lastmod` only while it is reliably accurate, and uses it to decide what to recrawl. Stale dates delay re-indexing of the 2.0 snippets, which matter most for "WooCommerce POS" queries this month, and they teach the crawler to ignore the field from now on.
- Fix: Bump the routes changed since 9 Nov to their real last-change dates (the git log of each page's component and messages), and add `/compare/foosales`.
- Scope: ok. One metadata map in one file.

## Runner-up notes (max 3 lines)
- /support phone: the ask box placeholder is cut off mid-word ("e.g. How do I connect a receipt printe"). Shorten the placeholder below `sm`, or let it wrap.
- The /compare hub still has seven identical "Read the comparison" anchors, and the card headings are not links. Make the H2 the link, or put the vendor name in the anchor.
- /support H1 "How can we help?" carries no keyword, and the meta description is only 104 characters. It is the thinnest indexable page in the set.
