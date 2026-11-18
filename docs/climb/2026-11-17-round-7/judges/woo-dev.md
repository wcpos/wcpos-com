# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A point-of-sale plugin plus apps that turns a tablet into a register selling from the WooCommerce store's own catalog, stock and prices, and keeps working offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free (the "New in 2.0" line above the H1).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro (all viewports and locales); also the home "Start free. Upgrade when you need more." Pro column.
- Element: the six-card list under "What's included in Pro?" ("Payment Terminal Integration", "Stock & Price Editing", "Order Management", "Customer Management", "Reports Across Days, Registers & Stores", "Custom Payment Gateways"), and the home Pro list "Everything in Free, plus: …".
- Problem: Neither list says that Pro adds **more registers** or **multi-store management**. Yet the home Free column says "One register", the /pro FAQ says "more registers … need Pro", and every /compare page lists "multi-store management, more registers" first in "Pro adds:", with "per-store addresses, tax rates, receipt templates, pricing, and authorized users". The only hint on /pro is a report card that mentions "every store".
- Why it costs: My client has two stores, and the first thing I need to know is "which plan runs two stores and more than one till?" The page built to sell Pro never answers that. I only found the answer in a Square comparison FAQ. An agency dev who stops at /pro either assumes it can't be done or books a sales call, and the brief asks for neither.
- Fix: Add one card to the /pro feature list and one line to the home Pro list. Use the copy the site already has: "Multiple stores & registers — more than one register, and per-store addresses, tax rates, receipt templates, pricing and authorized users." (en plus all locales).
- Scope: ok. This repeats an existing on-site claim (messages/en.json `proAdds` and the Square FAQ answer). It adds no new claim and changes no price.

## Worst defect — UI
- Page/viewport: /pro at phone width (390), en and nl (same component in de).
- Element: the two plan cards in the "Get Pro" / "Koop Pro" box: "Yearly · Most Popular · Updates & support for 1 year · $129 USD /yr" and "Lifetime · Updates forever · $399 USD once".
- Problem: The price's position depends on how long the label is. In en, Yearly's "$129" sits to the right of the label (and "Most Popular" wraps under "Yearly"), while Lifetime's "$399" drops to its own right-aligned line below. In nl, both prices drop below. So the two options on one screen never line up, and the card heights jump around.
- Why it costs: These are the only two choices on the page, and on a phone they are hard to compare at a glance. The uneven cards also look unfinished at exactly the point where a buyer is deciding to pay.
- Fix: Below `sm`, stack every plan card the same way (label and badge on one row, description, then the price on its own row, aligned the same in every card). From `sm` up, keep the side-by-side layout.
- Scope: ok. This is the card's flex layout only; no price text, wording or number format changes.

## Worst defect — SEO
- Page/viewport: /pro meta description (en, mirrored in nl/de).
- Element: "Upgrade WCPOS with Pro: terminal payments, stock and price editing, order and customer management, full reports, and priority support."
- Problem: The snippet never says "WooCommerce", and it leaves out the two biggest upgrade reasons: multiple stores and more registers. The H1 is only the brand ("WCPOS Pro") and the page has just two H2s, so nothing on /pro targets a search like "WooCommerce POS multiple stores" or "multi-location". Today only the /compare pages carry those words.
- Why it costs: Multi-location WooCommerce shops are the highest-intent Pro buyers. Their search lands on a competitor's page or on a /compare page, not on the page with the buy button. When /pro does show up, the snippet doesn't match what they typed.
- Fix: Rewrite the description (under 155 characters), for example: "WCPOS Pro for WooCommerce: run multiple stores and registers, take card-terminal payments, edit stock and prices, and see reports across stores." Repeat it in each locale.
- Scope: ok. Metadata only, using an existing claim and no prices.

## Runner-up notes (max 3 lines)
- /pro FAQ "Each license can be activated on 2 sites, intended for one live site and one development site": for a client with two stores, it doesn't say whether two stores on one WP install need one license or two. Needs one clarifying sentence (needs-front-desk: licensing terms).
- /downloads "Ring up a sale on the desktop, refund it on your phone": refunds at the register are Pro and the phone apps are beta, but the sentence reads as free and shipped.
- /downloads lists "WordPress 5.6+ · WooCommerce 5.3+ · PHP 7.4+" on the plugin card. That is good for devs, but /pro never says Pro needs the same versions, and neither page mentions HPOS compatibility.
