# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop that turns a tablet into the register, using the same products, stock and prices, and it keeps working offline.
Why version 2: The red "New in 2.0" line tells me I now get register open and close, split payments and today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: / (home), desktop and phone
- Element: "Compare WooCommerce POS systems". This is a small text link under the last "Ready to sell in-store with WooCommerce?" CTA, and it is also in the footer. Neither the pricing teaser "Start free. Upgrade when you need more." / "See Full Pricing & Features" nor anything else on the page mentions Square or FooSales.
- Problem: My shortlist is Square for WooCommerce, this app and FooSales. The site already has sourced pages for both (/compare/square and /compare/foosales), and they are its strongest proof: dated facts and a "Where Square is genuinely better" section. From the home page, though, the only way to reach them is one small link after the final CTA. I raised this in round 17 and it is still live and unchanged.
- Why it costs: My "but how is this different from Square?" question comes at the price card. That is where I'm weighing $0 Square Free against $129 Pro. If the answer isn't there, I go back to Google and read Square's own page, and the comparison the site worked hardest on never gets seen.
- Fix: Below the "See Full Pricing & Features" button, add one line in every locale: "Comparing with Square or FooSales? See our sourced comparisons →", linking to /compare.
- Scope: ok (one copy line linking to an existing page; no new claims or numbers)

## Worst defect — UI
- Page/viewport: /compare/square (the shared template for all seven /compare/* pages, and the same hero on /compare), phone 390 px
- Element: The lead paragraph "Many WooCommerce stores sell in person with Square's POS app and keep it in step with the Square for WooCommerce extension. Here is how that compares with a register built on WooCommerce itself, and when Square is the better choice." It is centred, large, light grey and six lines long, followed by roughly 180 px of empty space before "The short answer".
- Problem: Round 17's back-link fix shortened the breadcrumb, but the phone fold still shows no answer. It shows a two-line H1, six centred grey lines that only restate the H1, and a big gap. "The short answer" sits at the very bottom, with three lines of it peeking above the cookie bar. Centred grey text this long is slow to read on a phone, and it looks like an intro I can skip, so I scroll without taking anything in. I also raised this in round 17.
- Why it costs: I skim. On a comparison page I want a verdict or a table row on the first screen. Instead the first screen is padding, and on my phone at the market stall I would give up before I reach "At a glance".
- Fix: Below `sm`, make the /compare/* hero lead left-aligned, body size and body colour (for example `max-sm:text-left max-sm:text-base max-sm:text-gray-700`), and cut the hero's bottom padding on phone, so the short answer's first paragraph lands in the fold. Desktop stays unchanged.
- Scope: ok (styling of one shared hero component; no copy change)

## Worst defect — SEO
- Page/viewport: /pro, all viewports and all locales (/nl/pro shows "Koop Pro", /de/pro its equivalent)
- Element: "Get Pro", the heading of the price box with Yearly $129 / Lifetime $399. It renders as `<p className="text-lg font-semibold mb-1">` in `src/components/pro/pro-buy-box.tsx:69`. facts.json lists the /pro H2s as only "What's included in Pro?" and "Frequently Asked Questions".
- Problem: The title promises "Pro Features & Pricing for WooCommerce POS", but the page outline has no pricing heading at all. The price block, which is the part I came to /pro for, is invisible to anything that reads headings: search snippets, "jump to" links and screen readers. Round 17's record says this fix was moved to round 18. It is still live.
- Why it costs: A search like "WCPOS Pro price" or "WooCommerce POS pricing" should land on and point into this block. Without a heading, Google has to guess where the pricing section starts, and the page's pricing intent rests on the title alone.
- Fix: Render the buy-box heading as an `<h2>` with its current classes (same text, same look in every locale).
- Scope: ok (markup only; the price wording is not touched)

## Runner-up notes (max 3 lines)
- On the /compare hub, Oliver POS is the first card while Square is 3rd and FooSales is 7th (last). On phone, FooSales is about six screens down. Order the cards by how often a WooCommerce shop meets each competitor.
- The ceramicist "sell … at markets" review is the best proof for a market-stall seller, but it sits as the middle card under the generic "Works for stores of all kinds".
- /pro has no "Try Live Demo" link near the price box. "Try the free version first" is the only nudge, and a shop owner about to spend $129 wants to click around first.
