# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing catalogue, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales reports are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone.
- Element: “Offline-first, so the till never stops” / “Each device keeps working without a connection and re-syncs the moment it’s back online.”
- Problem: Observed: the offline promise has no payment qualification. Integrated card readers and online gateways require connectivity, as the Square comparison itself explains.
- Why it costs: Inferred: a card-heavy retailer could interpret this as equivalent to Square’s offline card processing. Discovering the limitation elsewhere undermines confidence in the comparison and the product.
- Fix: Replace the description with “Browse, build carts and complete cash or external-terminal Card sales offline; they sync when you reconnect. Integrated readers and online gateways need a connection.”
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, “Three steps to your first sale.”
- Element: “Pick your device” → “Web” → “Open the live demo.”
- Problem: Observed: the browser option in the setup sequence offers a demonstration, with no adjacent instruction for opening the register on the visitor’s own store. The source confirms that the link targets the demo.
- Why it costs: Inferred: after installing the plugin, a browser-only buyer reaches a trial destination instead of a clear next step toward their first real sale.
- Fix: Add a short instruction beneath the Web option explaining how to open the installed store’s POS, keeping the demo as a secondary action.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/`, metadata used for desktop and mobile search results.
- Element: “Sell offline, split payments, and open and close your register — all free in WCPOS 2.0. Desktop, web and mobile apps.”
- Problem: Observed: the description couples 2.0 features with mobile availability without distinguishing release status; the supplied product facts say the iOS and Android 2.0 store apps are not out yet.
- Why it costs: Inferred: mobile shoppers can arrive expecting those features in an available 2.0 app. The snippet sets an expectation the current release cannot satisfy.
- Fix: Qualify the description: “Free, open-source WooCommerce POS. WCPOS 2.0 is available for desktop and web, with split payments and register sessions. Mobile 2.0 updates are not yet available.”
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: all supplied Lighthouse SEO scores are 100; captured page widths show no horizontal document overflow at 390px.
Observed: the comparison hub’s “Every WooCommerce POS roundup” accusation is an unsupported absolute that weakens its evidence-first positioning.
Not verified: screenshot appearance; UI findings use captured text, metrics and source under the specified read-tool restriction.