# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce POS that turns a tablet into a shop register using my existing catalog, stock and prices.
Why version 2: It adds register opening and closing, split payments and today’s sales report to the free product.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone, “How it fits together” section.
- Element: “Offline-first, so the till never stops” / “Each device keeps working without a connection and re-syncs the moment it’s back online.”
- Problem: Observed: the promise has no payment limitation. Integrated readers and online gateways require a connection, as the Square comparison itself explains. “The till never stops” overstates what a card-dependent shop can expect.
- Why it costs: Inferred: offline checkout is a purchase criterion against Square. Discovering this qualification on another page makes the main promise look unreliable.
- Fix: Replace the blanket promise with explicit coverage: browsing, carts and cash or external-terminal Card-tender sales work offline and sync later; integrated readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/pro` and `/de/pro`, phone, 390×844.
- Element: “WCPOS Pro” hero and the gap before “Get Pro” / “Hol dir Pro”.
- Problem: Observed: generous vertical spacing pushes the purchase panel down to approximately 350px in English and 378px in German. With the cookie banner present, the German lifetime price and the purchase button are outside the visible area; the English purchase button is also absent.
- Why it costs: Inferred: a buyer arriving to compare options gets an incomplete purchase panel despite substantial empty space above it. Longer German copy increases the friction.
- Fix: Reduce the Pro page’s mobile hero top padding and spacing before the purchase panel so more of the options and action fit together.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/extensions`, desktop and phone search metadata.
- Element: Title “Extensions | WCPOS”; description “The extensions available for WCPOS, each with a link to its documentation.”
- Problem: Observed: neither field identifies WooCommerce POS, payment terminals or the named integrations that dominate this page.
- Why it costs: Inferred: someone searching for WooCommerce POS terminal integrations gets little reason to recognize this result as relevant. The metadata wastes a useful compatibility page’s search appeal; this is a relevance weakness, not an observed indexing failure.
- Fix: Use “WooCommerce POS Extensions & Payment Terminals | WCPOS” and a description naming existing integrations such as Square Terminal, Stripe Terminal and SumUp.
- Scope: ok

## Runner-up notes (max 3 lines)
The home platform section lists iOS and Android beside the 2.0 pitch without explaining that their 2.0 store apps are not yet released.
The home “Smooth checkout flow” Pro badge makes adding items and taking cash look paid, despite the free checkout listed below.
Full-page and Dutch screenshots were absent; visual findings use the supplied folds, while captured phone widths show no page-level horizontal overflow.