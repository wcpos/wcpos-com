# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source register that brings my WooCommerce catalog, stock and prices to the shop counter.
Why version 2: Register opening and closing, split payments and today's sales reports are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this unqualified promise follows promotion of connected payment terminals, but the home page never explains that those readers and online gateways require connectivity. The downloads and Square comparison pages explicitly acknowledge that limitation.
- Why it costs: Inferred: a buyer comparing Square’s offline card acceptance can mistake offline order completion for offline integrated card processing. Discovering the distinction later undermines trust in the comparison.
- Fix: Qualify this paragraph: offline selling supports cash and recording payments taken on a separate terminal; connected readers and online gateways need a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, “Three steps to your first sale.”
- Element: “Pick your device” → “Web” → “Open the live demo”.
- Problem: Observed: the web choice in the setup sequence leads to the demo, with no adjacent instructions for opening the register on the buyer’s own store. Source confirms the Web destination is `https://demo.wcpos.com/pos`.
- Why it costs: Inferred: after installing the plugin, a browser user reaches a demonstration instead of the next step toward their first real sale. The setup sequence leaves that user to discover the missing step elsewhere.
- Fix: Add a clearly labelled link to the existing web setup instructions beside the demo link in step two.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, search-result title on desktop and phone.
- Element: “WCPOS vs Square for WooCommerce (2026)”
- Problem: Observed: the title names the Square for WooCommerce integration without explicitly identifying Square POS as the product being compared. The page itself explains that it compares Square’s POS plus the sync extension.
- Why it costs: Inferred: the title is less precise for buyers searching for a WooCommerce POS alternative and can look like a comparison of integration plugins. This is a small search-intent clarity issue; no ranking loss was measured.
- Fix: Change the title to “WCPOS vs Square POS for WooCommerce (2026)”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: all supplied Lighthouse SEO scores are 100; captured phone page widths stay at 390px, including Dutch and German.
Observed: the home fold says “5,000+ Active Stores,” while the lower proof block calls the figure “Active Installations”; those measures are not interchangeable.
Not verified: screenshot appearance, clipping and visual hierarchy; inspection used the permitted text, JSON and source reads only.