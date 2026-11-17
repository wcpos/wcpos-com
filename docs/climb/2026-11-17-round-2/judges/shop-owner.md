# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop that turns a tablet into the register with the same products, stock and prices, even when the internet drops.
Why version 2: 2.0 lets me open and close the register, split a payment and see today's sales without paying anything.

## Scores
| Track | Score |
|---|---|
| Marketing | 6 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`), desktop and phone, the "Built for the demands of physical retail" grid and the "Start free. Upgrade when you need more." Free/Pro table. The same problem shows on `/pro` in the subtitle and feature list.
- Element: grid card "End-of-day reports" with a **Pro** badge ("Generate sales reports for each shift or day. Cash up quickly, track performance."), card "Smooth checkout flow" with a **Pro** badge, Pro column item "End-of-day reports", and a Free column that lists only "Basic checkout … Offline mode …". On `/pro`: "End-of-Day Reports — Close the register with end-of-day summaries of sales, payments, and takings."
- Problem: The hero banner says "New in 2.0 · Open and close your register, split payments and see today's sales — free." Two scrolls down, the same page marks cashing up, end-of-day reports and checkout itself as Pro, and the Free column says nothing about the register, the count at close, split payments or today's report. The compare pages (`/compare/square`) get this right: one register with float, cash in/out, count at close, split payments and today's Reports screen are free, and Pro adds reports for earlier days, other registers and other stores. The home page and `/pro` still describe the 1.x split.
- Why it costs: My main question is "can a gift shop cash up for free, or do I have to pay like with FooSales?" The page answers yes in the banner and then no further down, so I stop trusting either answer. The 2.0 message, the one reason to choose WCPOS this week, gets cancelled out on the same page.
- Fix: Change the copy to the 2.0 split the compare pages already use. Free gets "Open & close the register, count at close", "Split payments" and "Today's sales report". The Pro item becomes "Reports for past days, every register and store", and the reports card becomes "Pro" only for that wider scope. Drop the Pro badge from "Smooth checkout flow", or keep it only on "Stripe Terminal, SumUp and custom gateways". Make the same change to the `/pro` subtitle, the "End-of-Day Reports" item and the meta description (`messages/*.json` `home.features`, `home.pricing`, the pro keys around en.json:401–436).
- Scope: ok. The facts are already on the site's compare pages, and the change touches no prices and makes no new claims. Every locale needs the same edit.

## Worst defect — UI
- Page/viewport: `/pro`, phone (390x844). The same applies to `/nl/pro` and `/de/pro`.
- Element: the "Get Pro" price card ("Yearly … $129 USD /yr", "Lifetime … $399 USD once", "Get Started").
- Problem: On phone the two-column grid (`grid-cols-1 … lg:grid-cols-[1.5fr_1fr]`, pro/page.tsx:174) stacks the six feature rows first, so the price and the only call to action begin about 2.3 screens down. The first screen shows the title, the subtitle and two features, with no price and no button. On desktop the card sits beside the features, inside the fold.
- Why it costs: I opened the Pro page to see the price. On my phone I scroll past a feature list before I find it, with no button in sight. I can see Square and FooSales prices in one tap, so this is where a skimmer leaves.
- Fix: Add `order-first lg:order-none` to the price-card column, or show a one-line "$129 one-time · $399 lifetime → Get Pro" under the subtitle on small screens only.
- Scope: ok. It is layout only, and no prices change.

## Worst defect — SEO
- Page/viewport: home (`/`), meta description (all viewports, the same pattern in nl/de).
- Element: "Point of Sale for WooCommerce. Sync your products, sell offline, and connect real hardware with native apps for iOS, Android, and desktop."
- Problem: The search snippet repeats the title, then lists generic features. It never says "free" or "open source" and never mentions 2.0, which are the two things that set WCPOS apart from Square and FooSales in the results. "Sync your products" also undersells the actual pitch: every sale is a WooCommerce order and nothing needs syncing.
- Why it costs: A shop owner who searches "WooCommerce POS" sees paid competitors next to this snippet with no hint that WCPOS is free. That loses the click to the result that names its price.
- Fix: Use something like "Free, open-source point of sale for WooCommerce. WCPOS 2.0 runs your counter on web, Windows, macOS and tablets: same products, stock and prices, cash sales even offline." Write the matching nl and de versions.
- Scope: ok. It changes one metadata field per locale and adds no new claims.

## Runner-up notes (max 3 lines)
- Home and `/pro` show the price as "$129/year" and "$129 USD /yr", which reads like a subscription, while the line under it says "One-time payment — never auto-renews". Saying "$129 one-time, 1 year of updates" would avoid this (needs-front-desk: pricing copy).
- I am comparing against Square and FooSales, but "Compare" is only in the footer. The home body and the top nav don't link to `/compare`.
- Home renders two H1s and three duplicated H2s, because the animated and static story variants are both in the HTML (scroll-story.tsx:281–285).
