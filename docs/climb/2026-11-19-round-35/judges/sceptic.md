# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A register for my WooCommerce shop that uses my existing catalog, stock and prices, with offline selling.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, offline-selling section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise has no payment qualification, although `/downloads` and `/compare/square` explicitly say connected card readers and online gateways need a connection. The nearby hardware section promotes integrated terminals.
- Why it costs: Inferred: a merchant comparing Square’s offline card payments could assume WCPOS offers equivalent integrated-card continuity. Discovering the distinction later undermines trust in a central selling point.
- Fix: Say that cash sales and sales recorded against a separate card terminal work offline and sync later; connected readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/support`, phone, when human verification is required.
- Element: “Tick the box below to ask your question.”
- Problem: Observed in text and markup: three suggested-question buttons and the “Answered by Aide” attribution separate this instruction from the verification widget. Submission and suggested questions remain disabled during verification.
- Why it costs: Inferred: the control that unlocks help sits after unrelated controls and attribution, making a blocked form harder to understand on a narrow screen.
- Fix: Move the existing verification widget directly beneath its instruction, before the suggested questions.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/extensions`, search-result metadata for desktop and phone.
- Element: “Extensions for WCPOS, the WooCommerce point of sale: card terminals from Stripe, Square, SumUp, PayPal, Mollie and Windcave, plus WPML, Polylang and ATUM.”
- Problem: Observed: the description lists terminal integrations without the Pro requirement shown on every corresponding card. A search visitor evaluating terminal compatibility misses an essential qualification.
- Why it costs: Inferred: if used as the search snippet, this attracts expectations of included terminal support that the landing page immediately qualifies. This is a search-intent issue, not an observed ranking penalty.
- Fix: Change the terminal clause to “Pro card-terminal integrations for Stripe, Square, SumUp, PayPal, Mollie and Windcave,” retaining the remaining description.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: all supplied Lighthouse SEO scores are 100; captured phone document widths equal 390px, including Dutch and German pages.
Observed: the Square comparison acknowledges competitor advantages and supplies dated sources, strengthening credibility.
Not verified: screenshot appearance or live interactions; the UI finding relies on captured text and component markup.