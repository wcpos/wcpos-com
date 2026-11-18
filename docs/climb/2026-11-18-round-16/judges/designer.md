# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns a tablet into the register, selling from the same catalog, stock and prices as the online shop, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free. The red "New in 2.0" line above the kicker says so on desktop and on phone.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, desktop and phone, all locales.
- Element: The red "Pro" chip on 12 of the 15 cards, from "Mercado Pago Terminal for WooCommerce **Pro**" to "WCPOS StoreApps Smart Coupons **Pro**". The intro says "Add card terminals, … Each one links to its documentation." The page ends with "All extensions in the documentation".
- Problem: Almost every terminal on the page needs Pro, but the page never says what the chip means and never links to /pro. Every card and the closing link go off-site to the docs. A shop owner who came looking for "Stripe Terminal" or "SumUp" finds their reader, sees a small unexplained chip, and has no next step on the page except leaving.
- Why it costs: This page catches card-terminal intent, and terminal payments are the first thing Pro sells (the /pro feature list links back here with "See all terminal extensions"). The link runs one way only: /pro sends visitors to /extensions, and /extensions sends them nowhere near the purchase. It is the clearest conversion dead end left on the site, and it is unchanged since round 15.
- Fix: Add one line to the intro: "Extensions marked Pro need WCPOS Pro." Link "WCPOS Pro" to /pro with the existing `t.rich` link pattern.
- Scope: ok. It is one copy key per locale plus a link. It restates what the chips already say and words no price.

## Worst defect — UI
- Page/viewport: All seven /compare/* pages at phone width (390), shown on /compare/square. German and Dutch hub labels are longer still.
- Element: The new `CompareBreadcrumb` above the H1 (`src/components/compare/compare-breadcrumb.tsx`). It is a centred, wrapping `ol` that reads "Compare WooCommerce POS systems ›" and then "WCPOS vs Square for WooCommerce".
- Problem: At 390 px the crumb breaks into two centred lines.
  - The first line is the red hub link, with the chevron hanging at its right end and pointing at nothing.
  - The second line is the grey current page, "WCPOS vs Square for WooCommerce", and the two-line H1 directly below repeats it word for word.
  - The top of the phone fold therefore shows the page title twice, stacked. The red-over-grey pair, centred above the H1, reads as a kicker and a subtitle, not as navigation, and it competes with the H1.
  - It costs about 90 px of a fold that already holds a six-line centred grey lede. "The short answer" starts at the bottom edge and goes under the cookie banner.

  On desktop the crumb is one line and fine. The fault is the phone wrap.
- Why it costs: On phone, the first thing a visitor reads above the H1 is the H1 itself. That looks like a bug, weakens the strongest headline on the page, and pushes the verdict (the reason the visitor came) below the fold on all seven comparison pages.
- Fix: Hide the current-page item and its chevron below `sm` (`hidden sm:flex` on those two `li`). On phone, show the hub link alone as a left-pointing back link ("‹ Compare WooCommerce POS systems") so it never wraps or repeats the H1. The BreadcrumbList JSON-LD and the desktop crumb stay as they are.
- Scope: ok. These are styling changes in one component.

## Worst defect — SEO
- Page/viewport: /support, all locales, desktop and phone.
- Element: H1 "How can we help?", under the title "WooCommerce POS Help & Support | WCPOS". The meta description is 104 characters, "Ask anything about WCPOS and get an instant answer from our docs, or chat with the community on Discord." The only JSON-LD is `Organization`.
- Problem: This is still the thinnest indexable page in the set.
  - The H1 has no product or topic term, so it does not echo the title.
  - The crawlable body is about 40 words. The Discord widget is an iframe, and answers appear only after a query.
  - The three suggested questions ("Which barcode scanners are supported?", "How do I sync products from WooCommerce?") are buttons, not links to the docs that answer them.
- Why it costs: "WooCommerce POS support" and "WCPOS help" are navigational queries this page should own. A generic H1 and a short description weaken the match with the title, and the page passes no link equity to the docs pages that hold the answers.
- Fix: Make the H1 "WCPOS help & support" (localised) and keep "How can we help?" as the subtitle. Lengthen the description to about 150 characters, naming setup, licensing, hardware, syncing and printing.
- Scope: ok. This is copy and one metadata field on an existing page.

## Runner-up notes (max 3 lines)
- /extensions: the "Pro" chip still orphans onto its own line under long titles ("Windcave Terminal for WooCommerce" on desktop, SumUp and Smart Coupons on phone). Moving the chip above the title as an eyebrow would fix it.
- /support on phone: the placeholder is clipped at "e.g. How do I connect a receipt printe". The pale-grey suggestion chips and the washed-out "Ask" button read as disabled.
- /nl/pro desktop buy box: "Meest populair" wraps under "Jaarlijks", and "Updates en support voor 1 jaar" runs to three lines. The lede mixes "priority support" with the subline's "prioriteitssupport". The /de/pro du/Sie mix is still open.
