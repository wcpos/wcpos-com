# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free till for my WooCommerce shop that runs on a tablet and uses the same products, stock and prices as my website, even when the internet drops.
Why version 2: not answered

## Scores
| Track | Score |
|---|---|
| Marketing | 6 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`), desktop and phone, hero fold (and the rest of the page)
- Element: eyebrow "POINT OF SALE FOR WOOCOMMERCE" / H1 "Your WooCommerce store, at the counter." and the trust row "5,000+ Active Stores · Free & Open Source · Since 2014"
- Problem: WCPOS 2.0 shipped on 9 Nov 2026, but the home page never says so. The text capture has zero occurrences of "2.0" from top to bottom. The only places a visitor learns about 2.0 are the Downloads version string ("Version 2.0.4") and a footnote on /compare/square. That footnote is also the only place that mentions what is new in the free version: one register with a float, cash in/out, count at close, split payments, and today's Reports.
- Why it costs: I'm choosing between this, Square and FooSales this week. "Since 2014" with no sign of a new release reads like an old plugin. I can't tell why I should look at it now, and the free-version improvements that would win me over against Square's free plan are buried on another page.
- Fix: Put a short line or eyebrow link in the hero, e.g. "New in WCPOS 2.0: built-in checkout with split payments and a cash-up at close, free →", linking to the changelog/roadmap entry. Use only features the /compare/square page already lists for the 2.0 free version, and do not mention Tap to Pay or the store apps.
- Scope: ok

## Worst defect — UI
- Page/viewport: /pro, phone (390x844); the same on /nl/pro and /de/pro
- Element: the hero "WCPOS Pro / Everything in the free POS, plus …", followed by an empty band about 250px tall before "What's included in Pro?", with the "Get Pro" price box ($129 / $399) stacked after all six feature rows
- Problem: On phone, the fold shows the hero, a large blank gap and the first feature. There's no price, no CTA and no hint that pricing is below. The single-column grid puts the buy box (`lg:sticky` column in `src/app/[locale]/(main)/pro/page.tsx`) after the whole feature list, so the price is several screens down. On desktop the price box at least starts at the fold edge.
- Why it costs: I skim for price first. On my phone the Pro page looks empty and then turns into a feature list, so I'd assume pricing is hidden or complicated and bounce back to Square's "$0/month" headline.
- Fix: Shrink the hero section's bottom spacing on small screens (`spacing="hero"`, which leaves about 250px of dead space), and on phone show the buy box before the feature list (e.g. `order-first lg:order-none` on the buy-box column).
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro (all locales), `<title>` and meta
- Element: title "Pro - Premium Features | WCPOS" (nl "Pro - Premiumfuncties | WCPOS", de "Pro – Premium-Funktionen | WCPOS")
- Problem: The money page's title doesn't contain "WooCommerce", "POS" or "pricing", which are the words a shop owner types ("WooCommerce POS pricing", "WCPOS Pro price"). It starts with a generic "Pro". The H1 "WCPOS Pro" has the same problem. Every other key page carries "WooCommerce" (home "Point of Sale for WooCommerce", /compare "Compare WooCommerce POS Systems").
- Why it costs: The page that converts ranks and gets clicked on the brand name alone. In a results list next to Square and FooSales, "Premium Features" gives a searcher no reason to choose it over a competitor's pricing page.
- Fix: Change the title to something like "WCPOS Pro – WooCommerce POS Pricing & Features | WCPOS", localised in the nl/de messages.
- Scope: ok (wording only; prices unchanged)

## Runner-up notes (max 3 lines)
- Home feature grid labels "Smooth checkout flow" and "End-of-day reports" as **Pro**, but /compare/square says 2.0's free version includes checkout with split payments and a count at close. A price-skimmer concludes that the free version can't take a sale properly.
- Home Pro card says "$129/year", which reads like a subscription. /pro says "One-time payment — never auto-renews". Square and FooSales comparisons win on exactly this point, so the home card should say it too (wording only, needs-front-desk if seen as pricing copy).
- /extensions meta description "The extensions available for WCPOS, each with a link to its documentation." is weak, and /de mobile Lighthouse performance is 72 (TBT 850 ms) vs 92 on `/`.
