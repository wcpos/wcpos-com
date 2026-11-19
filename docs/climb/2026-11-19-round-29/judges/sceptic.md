# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free WooCommerce register that uses my existing catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales reports are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise has no payment qualification, while the preceding hardware section promotes integrated terminals. The downloads and Square comparison pages correctly explain that connected readers and online gateways require a connection.
- Why it costs: Inferred: a buyer comparing Square’s offline card acceptance could reasonably assume WCPOS offers equivalent continuity. Discovering the restriction later undermines trust in the comparison.
- Fix: Qualify this paragraph: offline selling supports cash and recording payments from a separate terminal; integrated readers and online gateways require internet.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, “Three steps to your first sale.”
- Element: “Pick your device” → “Web” → “Open the live demo”.
- Problem: Observed: the web option in the setup sequence sends visitors to `demo.wcpos.com/pos`; neither this card nor the Web hero selection explains how to open their own store’s register after installing the plugin.
- Why it costs: Inferred: a browser-based buyer completes step one, then reaches a demonstration instead of a usable next setup step. The promised path to a first sale remains incomplete.
- Fix: Add a short instruction or existing documentation link for opening the installed store’s web register, keeping the demo as a secondary action.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home, search-result title on desktop and mobile.
- Element: “WCPOS - Point of Sale for WooCommerce”
- Problem: Observed: the title omits both “free” and “plugin,” although these describe the product and distinguish the offer. The description includes them, but the title is the primary search-result label.
- Why it costs: Inferred: this generic title gives a comparison shopper less reason to choose WCPOS over the official WooCommerce POS or other similarly named products. This is a click-through opportunity, not evidence of a ranking failure.
- Fix: Use “Free WooCommerce POS Plugin & Apps | WCPOS”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: “iOS Beta” and “Android Beta” do not explicitly disclose that the 2.0 store apps are still unreleased.
Observed: all captured phone pages have equal document and viewport widths; every supplied Lighthouse SEO score is 100.
Not verified: screenshot appearance and exact fold boundaries; the 10-second assessment uses hero copy, and UI findings use captured text and source.