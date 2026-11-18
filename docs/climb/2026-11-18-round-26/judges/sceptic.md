# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce POS that turns a tablet into a register using my existing catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales reports are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the homepage promotes integrated payment terminals without explaining that they require connectivity. Its unqualified offline promise omits the distinction explicitly explained on `/compare/square`.
- Why it costs: A buyer comparing Square’s offline card payments could assume WCPOS provides equivalent integrated checkout during an outage. Discovering the limitation elsewhere undermines confidence in the sales pitch.
- Fix: Qualify this paragraph: cash sales and recording externally processed card payments work offline and sync later; integrated readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, mobile.
- Element: “One store at the centre. Every register in sync.” and its animated device diagram.
- Problem: Observed in the supplied Lighthouse capture: performance 68, total blocking time 1,310 ms and main-thread work 3.9 seconds. Source inspection shows the diagram continuously updates device positions and SVG lines without an off-screen visibility guard. Its contribution to the measured delay is inferred, not isolated.
- Why it costs: This is the installation entry point. Heavy main-thread work risks making platform selection and download controls feel unresponsive precisely when a buyer is ready to try the product.
- Fix: Keep the diagram static on phones and suspend its animation while off-screen; remeasure the Downloads page to verify the effect.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, both viewports and structured metadata.
- Element: “Square facts verified 2026-10-06” versus “checked again on 2026-11-18”.
- Problem: Observed: the comparison caption and footer retain October 6 while the Sources section reports a November 18 recheck. The source-defined WebPage `dateModified` also remains October 6; its deployed value was not independently verified.
- Why it costs: A comparison selling itself on dated evidence gives readers conflicting freshness signals and supplies an older modification date to search consumers. This is a credibility and metadata consistency defect; ranking loss is not established.
- Fix: Align the caption, footer and Square WebPage modification date with the already stated November 18 recheck.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: Dutch and German phone captures report 390px document widths within 390px viewports; these measurements do not establish whether individual words wrap cleanly.
Observed: all supplied Lighthouse SEO scores are 100; the remaining SEO defect is comparatively minor.
Not verified: screenshot-level visual fit, under the instruction to read inputs using text tools only.