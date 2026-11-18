# Judge: designer (product designer)

## 10-second test
What is WCPOS: A point of sale for WooCommerce that turns a tablet into the register, selling from the same catalog, stock and prices as the online shop, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free. The red "New in 2.0" line above the kicker says so on desktop and on phone, in en, nl and de.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /extensions, desktop and phone, all locales. Third round running.
- Element: The red "Pro" chip on 12 of the 15 cards, from "Mercado Pago Terminal for WooCommerce **Pro**" to "WCPOS StoreApps Smart Coupons **Pro**". The intro reads "Add card terminals, … Each one links to its documentation." The page ends with "All extensions in the documentation".
- Problem: Nearly every terminal on the page needs Pro, but the page never says what the chip means and never links to /pro. Every exit (15 "Documentation →" links and the closing link) goes to the docs. A shop owner who searched "SumUp WooCommerce POS" finds their reader, sees a small unexplained chip and has no next step on the page except leaving.
- Why it costs: This page catches card-terminal intent, which is the first thing Pro sells. /pro links here ("See all terminal extensions"), but nothing on /extensions links back. It is still the clearest conversion dead end on the site.
- Fix: Add one sentence to the intro, "Extensions marked Pro need WCPOS Pro.", and link "WCPOS Pro" to /pro using the existing `t.rich` link pattern. That is one copy key per locale.
- Scope: ok. The sentence restates what the chips already say and names no price or term.

## Worst defect — UI
- Page/viewport: All seven /compare/* pages at phone width (390). Shown here on /compare/square.
- Element: The `CompareBreadcrumb` above the H1 (`src/components/compare/compare-breadcrumb.tsx`): "Compare WooCommerce POS systems ›" / "WCPOS vs Square for WooCommerce".
- Problem: This is unchanged since round 16.
  - At 390 px the crumb wraps into two centred lines: the red hub link with a chevron pointing at nothing, then the grey current page.
  - The grey line is the H1 word for word, and the two-line H1 sits directly below it. So the top of the phone fold shows the page title twice, stacked.
  - Centred red over grey reads as a kicker and a subtitle, not as navigation, and it competes with the H1.
  - It costs about 90 px. "The short answer" lands under the cookie banner, behind a six-line centred grey lede.
- Why it costs: On phone, the first thing a visitor reads is the headline repeated. That looks like a bug, and it pushes the verdict (the reason the visitor came) below the fold on all seven comparison pages.
- Fix: Below `sm`, hide the current-page `li` and its chevron (`hidden sm:flex`), and render the hub item as a left-pointing back link, "‹ Compare WooCommerce POS systems", on one line. The desktop crumb and the BreadcrumbList JSON-LD stay as they are.
- Scope: ok. These are styling and markup changes in one component.

## Worst defect — SEO
- Page/viewport: /support, all locales, desktop and phone.
- Element: The H1 "How can we help?" under the title "WooCommerce POS Help & Support | WCPOS". The meta description is 104 characters, "Ask anything about WCPOS and get an instant answer from our docs, or chat with the community on Discord." The only JSON-LD is `Organization`.
- Problem: The visible lede now names "setup, licensing, hardware, syncing, printing", but neither the H1 nor the description has caught up.
  - The H1 carries no product or topic term, so it does not echo the title.
  - The description is about 50 characters short of the 150 to 160 used on every other page in the set, and it leaves out the topics the lede lists.
  - The crawlable body is still about 40 words, because the Discord widget is an iframe and answers render only after a query.
- Why it costs: "WooCommerce POS support" and "WCPOS help" are navigational queries this page should own. On the page with the least indexable text, a generic H1 and a thin snippet weaken the match.
- Fix: Make the H1 "WCPOS help & support" (localised) with "How can we help?" as the subtitle. Rewrite the description to about 150 characters, reusing the lede's own topics (setup, licensing, hardware, syncing, printing) plus Discord.
- Scope: ok. This is copy and one metadata field on an existing page.

## Runner-up notes (max 3 lines)
- Header: on every page except /pro, the "Pro" nav item is near-black while its siblings are grey (`highlight` in `site-nav.tsx`). It reads as the active page; on /support it competes with the real active pill.
- /support: the "Ask" button and the suggestion chips are so pale they read as disabled, and the phone placeholder is clipped at "receipt printe". (The Turnstile box in the shots is probably a headless-capture artefact: `appearance: 'interaction-only'`.)
- /extensions: the "Pro" chip still drops onto its own line under long titles ("Mercado Pago Terminal for WooCommerce" on desktop, most cards on phone). An eyebrow chip above the title would fix it.
