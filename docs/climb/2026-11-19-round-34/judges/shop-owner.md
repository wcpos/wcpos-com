# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free till for my WooCommerce shop that runs on a tablet and uses the same products, stock and prices as my website, even when the internet drops.
Why version 2: 2.0 lets me open and close the register, split payments and see today's sales for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: every page, desktop header and phone menu (`src/components/main/site-header.tsx:58-64`)
- Element: the header nav, which reads "Downloads · Pro · Documentation · Support · Roadmap" and has no "Compare" link
- Problem: I've shortlisted Square, WCPOS and FooSales, so the comparison pages are the ones I came for, and they're good: sourced, dated, and honest about when Square wins. But the header never links to them. On the home page the only routes are the line "Weighing up Square or FooSales? See how WCPOS compares" (below the pricing block, about 11,000px down on phone) and the footer. "Roadmap" gets a header slot even though it is the least useful link for a buyer.
- Why it costs: A buyer who is comparing tools and skims the header won't find the side-by-side page. They'll go off to read Square's and FooSales' own sites instead, and the strongest argument WCPOS has (every sale is a WooCommerce order, with no second catalog) never reaches them.
- Fix: Add `{ label: t('compare'), href: '/compare' }` to `navLinks` after Pro, replacing Roadmap or ahead of it. The footer already uses the "Compare" label.
- Scope: ok

## Worst defect — UI
- Page/viewport: /support, phone and desktop fold
- Element: the example chips "How many sites can I use my licence on?", "Which barcode scanners are supported?" and "How do I sync products from WooCommerce?", plus the pale "Ask" button
- Problem: Until the Cloudflare "Verify you are human" box is ticked, the chips and the Ask button show in very light grey (`disabled={verifying}`), so they look broken or switched off. The only explanation is the small line "Tick the box below to ask your question.", and the box sits below the chips, not next to them.
- Why it costs: A non-technical owner with a question before buying taps a chip, nothing happens, and they decide support doesn't work. That is a poor sign for a product whose selling point is "Paul is responsive".
- Fix: Keep the chips at full contrast and let a tap queue the question until verification finishes, or move the Turnstile box directly under the input, above the chips.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (home), all locales' English equivalent; meta title
- Element: `<title>` "WCPOS - Point of Sale for WooCommerce"
- Problem: The site's highest-authority page never uses the exact phrase "WooCommerce POS" in its title. That is the term shoppers type, the plugin's own name on WordPress.org, and the phrase every other page title targets ("Download WooCommerce POS…", "Compare WooCommerce POS…", "…for WooCommerce POS | WCPOS"). The title also uses a hyphen where every other page uses "|".
- Why it costs: For the main search query, the home page is the strongest candidate to rank, but its title only matches the phrase loosely. Search results may show /downloads or /pro instead, and those pages pitch to a visitor less well.
- Fix: Change the home title to "WooCommerce POS – Free Point of Sale for WooCommerce | WCPOS" (and the same pattern in each locale).
- Scope: ok

## Runner-up notes (max 3 lines)
- Home hero (all viewports): "WCPOS turns the tablet into your register" should say "your tablet". It also mentions only a tablet, while my market stall would run on a phone.
- /pro H1 "WCPOS Pro for WooCommerce POS" reads as "WooCommerce POS Pro for WooCommerce POS". Something like "WCPOS Pro: more registers, terminals and reports" would say what I'm paying for.
- Phone home fold: the device mockup starts right where the cookie banner sits, so a phone visitor sees no product picture on the first screen.
