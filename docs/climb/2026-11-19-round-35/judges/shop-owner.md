# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free point-of-sale for my WooCommerce shop that turns a tablet into my till, with the same products, stock and prices, and it keeps going when the internet drops.
Why version 2: 2.0 lets me open and close the register, split a payment and see today's sales, all free ("New in 2.0 · …" line above the headline).

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, all viewports, section "Where Square is genuinely better", fourth bullet (same sentence on /compare/foosales and /compare/vitepos).
- Element: "WCPOS keeps taking cash sales offline, but connected card readers need a connection."
- Problem: The page contradicts itself on the question a market-stall owner cares about most. The "At a glance" Offline row and the "Does Square POS work offline?" FAQ on the same page both say sales on a separate card terminal complete offline too, which matches 2.0. The bullet I actually skim, under "Where Square is genuinely better", says cash only.
- Why it costs: My weekend stall has patchy signal. Reading this bullet, I conclude WCPOS can't take a card at the market and Square can, so I shortlist Square, even though WCPOS 2.0 records card sales on my own terminal offline. The bullet costs WCPOS the sale with a claim that is less than the truth.
- Fix: In `messages/*.json` `…square…whereBetter.offline` (en line ~2470), and the matching FooSales and Vitepos bullets, change it to "WCPOS keeps taking cash sales, and card sales on your own separate terminal, offline; connected card readers and online gateways need a connection."
- Scope: ok (it restates an existing product fact that is already on the same page; no new claim).

## Worst defect — UI
- Page/viewport: /compare/square, phone 390 px.
- Element: "The short answer" section: two paragraphs starting "WCPOS is a register built on WooCommerce itself: …" and "Square for WooCommerce joins two systems: …"
- Problem: The "short answer" is about 25 lines of unbroken body text on a phone, close to two full screens, under a 6-line grey intro. The Square paragraph is set in lighter grey than the WCPOS one, so the comparison's main point is the harder half to read. The first button comes only after all of it.
- Why it costs: I skim. The heading promises a quick verdict, and what I get is a wall of text. On a phone I give up before I reach "orders placed in Square's POS are not synced to WooCommerce", which is the one line that would win me over.
- Fix: Open each paragraph with a bold one-line verdict ("WCPOS: every sale is a WooCommerce order." / "Square: a second system; in-person orders don't reach WooCommerce."), give both the same text colour, and keep the detail underneath.
- Scope: ok (copy and styling in an existing component; already on the round-34 deferred list).

## Worst defect — SEO
- Page/viewport: /pro, all viewports (H1).
- Element: H1 "WCPOS Pro for WooCommerce POS"
- Problem: The H1 says "POS" twice and leaves out the two things the page and its title are about ("Pro Features & Pricing for WooCommerce POS | WCPOS"). The strongest on-page heading doesn't match the query a buyer types ("WooCommerce POS pricing"). The de and nl H1s ("WCPOS Pro – Kassensystem für WooCommerce") read naturally, so only English is affected.
- Why it costs: The title and H1 disagree, which weakens relevance for "pricing" and "features" searches. A visitor who lands from search also reads a clumsy headline before the price.
- Fix: Change the en `pro` H1 message to "WCPOS Pro: features and pricing for WooCommerce POS" (or "WCPOS Pro — more registers, terminals and reports for WooCommerce").
- Scope: ok (one heading string; no price or term wording changes).

## Runner-up notes (max 3 lines)
- /compare/square "What Square for WooCommerce doesn't do" still opens "As verified on 2026-10-06", while the table caption, Sources and JSON-LD dateModified all say 2026-11-18. The mixed dates undercut the "every number is sourced and dated" promise.
- On the home page, "Weighing up Square or FooSales? See how WCPOS compares" is tiny grey text under the pricing button. For a buyer who is comparing, it's the most useful link on the page, and it's the easiest to miss.
- Home "Desktop & Offline" review tag is not a store type; the other two tags ("Retail Store", "Market Vendor") are, and that is what I scan for.
