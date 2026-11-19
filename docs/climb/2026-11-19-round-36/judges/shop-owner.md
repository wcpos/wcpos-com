# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop: it turns my tablet into the register, with the same products, stock and prices as the website, and it keeps going when the internet drops.
Why version 2: In 2.0 I can open and close the register, split a payment and see today's sales, all free (the red "New in 2.0 ·" line above the headline).

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, all viewports, "Where Square is genuinely better", third bullet. The same sentence is on /compare/foosales and /compare/vitepos (`messages/en.json` lines 2472, 2733 and 3020).
- Element: "WCPOS keeps taking cash sales offline, but connected card readers need a connection."
- Problem: For a market stall this is the question that decides it, and the page answers it two ways. The "At a glance" Offline row and the "Does Square POS work offline?" FAQ on the same page say sales on a separate card terminal also complete offline, which matches 2.0. The bullet list, which is the part I skim to see where Square wins, says cash only.
- Why it costs: My weekend market has patchy signal. From this bullet I'd decide WCPOS can't take a card at the stall and Square can, and I'd try Square this week. The bullet sells WCPOS short on the one point that sends me to a competitor. This is the second round running that I've named it.
- Fix: In all three bullets, change the WCPOS sentence to "WCPOS keeps taking cash sales, and card sales on your own separate terminal, offline; connected card readers and online gateways need a connection." Do the same in every locale.
- Scope: needs-front-desk. Since round 30 the records have held this as "offline wording", though the new sentence only repeats a fact that is in this brief's fact list and in the page's own FAQ. Please release the hold.

## Worst defect — UI
- Page/viewport: /compare/square, phone 390 px.
- Element: "The short answer": two paragraphs, starting "WCPOS is a register built on WooCommerce itself: …" and "Square for WooCommerce joins two systems: …"
- Problem: Nothing has changed since round 35. Under a 6-line grey intro, the "short answer" runs to about 25 lines of unbroken body text on a phone, close to two full screens, and the cookie bar covers part of it. The Square paragraph is set in lighter grey than the WCPOS one, so the deciding fact, "orders placed in Square's POS are not synced to WooCommerce", is buried near the end of the faintest paragraph. The first button only comes after all of it.
- Why it costs: The heading promises a quick verdict and gives me a wall of text. On my phone I stop scrolling before the one line that would win me over.
- Fix: Start each paragraph with a bold one-line verdict ("WCPOS: every sale is a WooCommerce order." / "Square: a second system; in-person orders don't reach WooCommerce."), set both paragraphs in the same text colour, and keep the detail underneath.
- Scope: ok (copy and styling in an existing component; on the deferred list since round 34).

## Worst defect — SEO
- Page/viewport: /extensions, meta description (search snippet), all viewports.
- Element: "Extensions for WCPOS, the WooCommerce point of sale: card terminals from Stripe, Square, SumUp, PayPal, Mollie and Windcave, plus WPML, Polylang and ATUM." (`messages/en.json` line 1748)
- Problem: The snippet names six terminal brands and never says they need WCPOS Pro. The page itself does ("Extensions marked Pro need WCPOS Pro.", and every terminal card has a Pro badge). The search result and the page don't match.
- Why it costs: I search "WooCommerce POS SumUp" and from the snippet I expect the free plugin to work with my SumUp reader. On the page I find it's $129 or more. That feels like a bait-and-switch, so I bounce, and a quick return to the search results is the worst signal this page can send.
- Fix: "Extensions for WCPOS, the WooCommerce point of sale: Pro card terminals from Stripe, Square, SumUp, PayPal, Mollie and Windcave, plus WPML, Polylang and ATUM." (about 158 characters; drop "the" if it needs trimming). Mirror it in the other locales.
- Scope: ok (one metadata string; it restates the page's own Pro requirement, with no price or terms wording).

## Runner-up notes (max 3 lines)
- /compare/square "What Square for WooCommerce doesn't do" still opens "As verified on 2026-10-06" (en line 2458; /compare/woocommerce line 2309 too), while the table caption and Sources say "checked again 2026-11-18". The mixed dates undercut "every number is sourced and dated".
- Home "Desktop & Offline" review tag: it names a feature, not a kind of shop like the other two tags ("Retail Store", "Market Vendor"), and the quote ends on "more great features coming up".
- The home "Weighing up Square or FooSales?" link is now red and easy to spot on phone. That's a good fix for a buyer who is comparing.
