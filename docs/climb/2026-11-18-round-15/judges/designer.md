# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns your tablet into the register, with the same catalog, stock and prices as the online shop, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free. The red "New in 2.0" line above the kicker says so on desktop and on phone.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, desktop and phone, in every locale. The page is built from cards, and the problem shows across all of them.
- Element: The red "Pro" badge on 12 of the 15 cards, from "Mercado Pago Terminal for WooCommerce **Pro**" through "WCPOS StoreApps Smart Coupons **Pro**". The intro under the H1 reads "Add card terminals, … Each one links to its documentation."
- Problem: Nearly every terminal on the page needs Pro, but the page never says what the badge means and never links to /pro. Each card links only to its external docs page, and the page closes with "All extensions in the documentation". A shop owner who came for "Stripe Terminal" or "SumUp" sees a small "Pro" chip and has no explanation, no price path and no next step on the page. The only way to /pro is the header nav.
- Why it costs: /extensions is where card-terminal intent lands, and terminal payments are the first item Pro sells. The page answers "does it support my reader?" and then sends the visitor off-site to docs instead of to the purchase. This is the most direct conversion dead end left on the site.
- Fix: Add one line to the intro, or a strip under the first H2: "Extensions marked Pro need WCPOS Pro." Link "WCPOS Pro" to /pro, using the `t.rich` link pattern from #759. Alternatively, make each "Pro" badge a link to /pro.
- Scope: ok. It is one copy key plus a link on an existing page. It restates what the badges already say, makes no new claim and does not word a price.

## Worst defect — UI
- Page/viewport: /extensions, phone 390, and also desktop 1440 (the three-column grid). This is every extension card.
- Element: The card header, an inline `h3` plus `<Badge … className="ml-2 align-middle">Pro`, and the card link "{name} documentation →", `inline-flex items-center gap-1` (`src/app/[locale]/(main)/extensions/page.tsx` lines 102–123, `messages/*.json` `docsLink`).
- Problem: There are two layout faults that repeat on every card.
  - **Orphaned badges.** When a long title fills its line, the "Pro" badge drops to a line of its own under the title. On phone this happens on "SumUp Terminal for WooCommerce" and "WCPOS StoreApps Smart Coupons". On desktop the badge trails "WooCommerce" on Mercado Pago's second line.
  - **Wrapped links.** The link repeats the full product name ("Windcave Terminal for WooCommerce documentation"), so on phone and in every desktop column it wraps to two lines. Because the link is a flex row, the arrow then floats alone at the far right edge, centred between the two lines and detached from the text.

  On a page of 15 cards, every card ends in a two-line red block that is louder than the card's own title. The red link, not the title, becomes the card's visual anchor, and the right edge of the grid is lined with orphaned arrows.
- Why it costs: The cards read as a raw catalog dump rather than a designed page. The repeated, oversized red links drown the descriptions that tell a shop owner what each extension does. The orphaned badges and arrows make the page look unfinished next to the polished /pro and /downloads.
- Fix:
  - Put the badge on its own line above the title, as a small eyebrow (`<Badge>` before the `h3`, with `mb-2`), so it never orphans.
  - Change `docsLink` to a short visible label, "Documentation" / "Read the docs", followed by `<span className="sr-only"> for {name}</span>` so the accessible name stays descriptive.
  - Make the link `inline` with the arrow inside the text run, so the arrow follows the last word.
- Scope: ok. This is styling and markup in one component, plus one copy key per locale.

## Worst defect — SEO
- Page/viewport: /support, all locales.
- Element: H1 "How can we help?" (`messages/en.json` `support…title`). It sits under the title "WooCommerce POS Help & Support | WCPOS" and a 104-character meta description. The only JSON-LD is `Organization`, and the only H2 is "Prefer to talk to a human?".
- Problem: This is the thinnest indexable page in the set. The H1 carries no product or keyword term, so it does not echo the title. The crawlable body is about 40 words, because the Discord embed is an iframe and the answers only appear after a query. The suggested questions ("Which barcode scanners are supported?", "How do I sync products from WooCommerce?") are buttons, not links to the docs that answer them.
- Why it costs: "WooCommerce POS support" and "WCPOS help" are navigational queries this page should own. A generic H1 plus a near-empty body weakens the title–H1 match, and the page passes no link equity to the docs that hold the answers.
- Fix: Make the H1 "WCPOS help & support" (localised), keep "How can we help?" as the input label or subtitle, and lengthen the description to about 150 characters by naming setup, licensing, hardware and printing.
- Scope: ok. Copy and a metadata field on an existing page.

## Runner-up notes (max 3 lines)
- /de/pro buy box still switches to "Sie" in "Testen Sie zuerst die kostenlose Version — upgraden Sie erst…" (`de.json` 482–483) while the rest of the page uses "du". This is the fifth round I have named it, and the fix is two keys.
- /support on phone: the placeholder is cut off at "e.g. How do I connect a receipt printe", and the suggestion chips' grey-on-navy text and the dim "Ask" button read as disabled controls.
- /pro feature titles mix Title Case ("Stock & Price Editing", "Order Management") with sentence case ("Customer-facing display"). The home grid uses sentence case, so /pro should match.
