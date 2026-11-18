# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin plus apps that runs the register off the WooCommerce store's own catalog, stock and prices, and keeps selling offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free (the "New in 2.0" line above the H1).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports and locales.
- Element: the card "Payment Terminal Integration — Connect card readers and payment terminals for fast, accurate in-person payments."
- Problem: The page that sells Pro names no terminal or processor, and it doesn't link to /extensions or the docs. Its only body links go to /downloads and /compare. The site already has the list: /extensions shows Pro terminal integrations for Stripe, Square, SumUp, PayPal Reader, Mollie, PayArc, Mercado Pago, Windcave and Vipps MobilePay, each with a docs link. The /compare FAQs list them too. But /extensions isn't in the header nav, and /pro never points to it. Home names only "Stripe Terminal and SumUp".
- Why it costs: The first thing I check before recommending a POS is "does it work with the client's processor?" On /pro the answer is a generic sentence. I can't tell whether my client's Square or Mollie account is covered without hunting through the footer or a competitor comparison. Without that answer I either drop WCPOS from the shortlist or have to ask, which the brief says a dev shouldn't need to do.
- Fix: Name the processors in the card ("…Stripe, Square, SumUp, PayPal, Mollie, Windcave and more") and add a "See all terminal extensions →" link to /extensions under the card (en and all locales).
- Scope: ok. It repeats processor names the site already lists on /extensions and /compare, plus an internal link. No new claim, no price change.

## Worst defect — UI
- Page/viewport: /pro at phone width (390), en. The nl and de cards differ again.
- Element: the "Get Pro" plan cards: "Yearly · Most Popular · Updates & support for 1 year · $129 USD /yr" and "Lifetime · Updates forever · $399 USD once".
- Problem: This defect is still here from round 7. In en, the Yearly price sits beside the label, and "Most Popular" wraps under "Yearly". The Lifetime price drops to its own right-aligned row below. So the two prices are at different heights and in different positions in two stacked cards. In nl, both prices drop below, so the layout changes with the language.
- Why it costs: These are the only two choices on the page, and a phone visitor compares them at the moment of buying. Misaligned prices make the comparison slower and make the buy box look unfinished.
- Fix: Below `sm`, give every plan card the same stack: label and badge on one row, then the description, then the price on its own right-aligned row. Keep the side-by-side layout from `sm` up.
- Scope: ok. This is the card's flex layout only; no price text, wording or number format changes.

## Worst defect — SEO
- Page/viewport: /pro meta description (en, mirrored in nl and de).
- Element: "Upgrade WCPOS with Pro: terminal payments, stock and price editing, order and customer management, full reports, and priority support."
- Problem: This defect is still here from round 7. The page now opens its feature list with "More Registers & Multiple Stores", but the snippet still doesn't say "WooCommerce" and leaves out stores and registers. The H1 is only the brand ("WCPOS Pro"), and there are just two H2s. So nothing in the page's head targets "WooCommerce POS multiple stores / registers".
- Why it costs: Multi-location WooCommerce shops are the most likely Pro buyers. Their searches go to /compare pages or to competitors, not to the page with the buy button, and the snippet doesn't match what they typed.
- Fix: Rewrite it to 155 characters or fewer, for example "WCPOS Pro for WooCommerce: more registers and multiple stores, card-terminal payments, stock and price editing, and reports across every store." Do the same in each locale.
- Scope: ok. Metadata only, reusing on-page claims, no prices.

## Runner-up notes (max 3 lines)
- The /pro multi-store card doesn't say whether the stores share one WooCommerce stock pool. /extensions shows that per-store inventory needs the ATUM integration, so a one-line link from the card would answer it.
- /downloads "Ring up a sale on the desktop, refund it on your phone" reads as free and shipped, but refunds at the register are Pro and the phone apps are beta.
- The /pro FAQ "2 sites, one live and one development" doesn't say whether two stores on one WP install need one license (needs-front-desk: licensing terms).
