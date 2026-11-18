# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: WCPOS turns my WooCommerce store into a tablet register using my existing catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales reporting are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home, desktop and phone, offline section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the promise omits the payment limitation that `/downloads` explicitly explains. Cash and externally handled Card-tender sales can complete offline; connected readers and online gateways need a connection.
- Why it costs: Inferred: a buyer comparing Square’s offline card acceptance could assume equivalent capability, particularly after the preceding section promotes integrated terminals. Discovering the qualification elsewhere undermines trust.
- Fix: Qualify this paragraph with the supported offline tenders and state that connected readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, “Three steps to your first sale.”
- Element: “Pick your device” → “Web” → “Open the live demo”.
- Problem: Observed: the web option in the setup sequence offers only a demo link; source confirms its destination is `https://demo.wcpos.com/pos`. It provides no instruction or setup-documentation link for opening the buyer’s own web register after installing the plugin.
- Why it costs: Inferred: someone choosing the browser option reaches a demonstration instead of a clear next setup step. That makes WCPOS’s browser offering feel less ready to use than its downloadable apps.
- Fix: Add an “Open your own web register” setup-documentation link and a brief instruction within the existing Web card, keeping the demo secondary.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, both viewports and structured metadata.
- Element: “Square facts verified 2026-10-06” versus “checked again on 2026-11-18”.
- Problem: Observed: the table caption and footer retain October 6 while Sources reports November 18 verification. The inspected schema generator also assigns this page `dateModified: "2026-10-06"`.
- Why it costs: Inferred: inconsistent dates weaken the freshness signal for a comparison involving changing competitor capabilities; the older structured date also predates the WCPOS 2.0 release discussed on the page. Ranking impact is not verified.
- Fix: Align the caption, footer and Square WebPage `dateModified` with the November 18 check already stated in Sources.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: all supplied Lighthouse SEO scores are 100; Dutch and German phone captures report document width equal to viewport width.
Observed: home alternates between “5,000+ Active Stores” and “5,000+ Active Installations”; use the evidenced metric consistently.
Not verified: screenshot-level wrapping, clipping and visual hierarchy; this review used the permitted text/JSON reads and source inspection.