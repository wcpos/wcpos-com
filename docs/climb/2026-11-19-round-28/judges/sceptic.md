# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: From the home phone fold, WCPOS turns my tablet into a WooCommerce register using my existing catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home, desktop and phone, offline section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise has no payment-method qualification, although the preceding hardware section promotes integrated terminals. The downloads page explicitly says connected readers and online gateways need a connection.
- Why it costs: Inferred: a buyer comparing Square’s offline card payments could mistakenly expect equivalent integrated-card capability from WCPOS.
- Fix: Qualify the promise with the existing distinction: cash and externally processed Card-tender sales work offline; integrated readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: Downloads, desktop and phone, “Three steps to your first sale.”
- Element: “Web” → “Open the live demo.”
- Problem: Observed: the Web option in the installation journey links to the public demo, without explaining how to open the register for the buyer’s own store.
- Why it costs: Inferred: after installing the plugin, a browser user reaches a demonstration instead of a clear next step toward their first real sale.
- Fix: Add a clearly labelled web setup documentation link beside the demo action.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Downloads, mobile Lighthouse capture.
- Element: “Download WooCommerce POS” page; Lighthouse reports “largest-contentful-paint … 3.0 s.”
- Problem: Observed: mobile performance is 94, with 103 KiB of estimated unused JavaScript and 220 ms of estimated render-blocking savings. LCP exceeds the 2.5-second good threshold despite the SEO audit scoring 100.
- Why it costs: Inferred: the download landing page has a loading-speed weakness for mobile search visitors; these lab results do not establish a field Core Web Vitals failure.
- Fix: Defer the below-fold sync diagram’s animation code, then remeasure mobile LCP; its contribution is not verified by the captured audit.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: the Square comparison gives two verification dates—November 18 in Sources, October 6 in the closing disclosure—weakening its freshness signal.
Observed: captured phone document widths remain 390px, including Dutch and German; no page-wide horizontal overflow is established.
Not verified: screenshot appearance; this review used text, captured metrics and source under the read-command restriction.