# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A register for my WooCommerce shop that uses my existing catalog, stock and prices, including offline.
Why version 2: Register opening and closing, split payments and today’s sales reports are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/compare/square`, desktop and phone.
- Element: “Every sale is a WooCommerce order, so there is nothing to sync.”
- Problem: Observed: “nothing to sync” also appears in the comparison table and recommendation, but the same page’s offline FAQ says sales sync when the connection returns. Sharing WooCommerce’s catalog does not eliminate offline synchronization.
- Why it costs: Inferred: this overstatement weakens the central argument against Square. A buyer concerned about inventory consistency needs the distinction between a separate catalog and temporarily disconnected registers.
- Fix: Replace the repeated absolute claim with “No separate catalog to reconcile; offline sales sync when you reconnect.”
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, Web selection and “Pick your device” step.
- Element: “Web” → “Open the live demo”.
- Problem: Observed: the setup sequence routes browser users to the demo; the Web platform destination is also the demo. Neither location explains how to open the register for the store whose plugin the visitor just installed.
- Why it costs: Inferred: a buyer following “Three steps to your first sale” reaches a demonstration instead of their own register and must search elsewhere to finish setup.
- Fix: Add a clearly labelled link to the existing web-register setup documentation beside the Web demo action.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/downloads`, Lighthouse mobile.
- Element: “One store at the centre. Every till in sync.” animated device diagram.
- Problem: Observed: mobile LCP is 3.0 seconds, performance scores 94, and Lighthouse reports 102 KiB of unused JavaScript. Source inspection shows the diagram eagerly imports `motion/react`; its contribution to the measured delay is inferred, not verified.
- Why it costs: The download landing page misses the 2.5-second good-LCP threshold in this lab run. Nonessential animation competes with the primary download interface; a search-ranking impact is not verified.
- Fix: Defer the diagram’s animation module until it approaches the viewport, retain static labels initially, and remeasure mobile LCP.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: all tested pages score 100 for Lighthouse SEO; captured phone widths show no page-wide overflow, including Dutch and German.
The home hardware promise, “Works with the equipment you already have,” would be more convincing with a nearby compatibility-documentation link.
UI assessment uses captured text, width metrics and source; screenshot appearance was not verified under the read-input restriction.