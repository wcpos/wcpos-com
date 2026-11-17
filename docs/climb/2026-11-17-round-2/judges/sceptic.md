# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: From the phone home fold, WCPOS turns my WooCommerce catalog into a tablet register with shared stock, offline selling and a free core.
Why version 2: It adds opening and closing registers, split payments and today’s sales reporting for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 6 |
| UI | 7 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home and /pro, desktop and phone.
- Element: “End-of-day reports” marked “Pro”; “Close the register with end-of-day summaries of sales, payments, and takings.”
- Problem: Observed: reporting is presented as a blanket Pro benefit, although the home introduction advertises today’s sales free. The supplied product facts clarify the missing distinction: today on this register is free; other days, registers and stores require Pro.
- Why it costs: Inferred: a buyer comparing free POS options could conclude that basic daily reporting requires $129, making WCPOS appear more limited and its upgrade pitch inconsistent.
- Fix: State the free reporting allowance and describe the Pro reporting benefit specifically as access to other days, registers and stores.
- Scope: ok

## Worst defect — UI
- Page/viewport: /de, mobile Lighthouse capture.
- Element: Home scroll-story component containing “Dein WooCommerce-Shop an der Ladentheke.”
- Problem: Observed: mobile performance scores 65, with 4.0 s largest contentful paint and 1,020 ms total blocking time. Source inspection also shows the desktop animated component mounted behind `hidden md:block` on mobile. Its contribution to the measured delay is inferred, not isolated by profiling.
- Why it costs: Inferred: a shop owner evaluating a fast register encounters a slow first impression and substantial main-thread blocking before trying the product.
- Fix: Gate mounting of the desktop animated scroller to desktop viewports, preserving the existing static mobile presentation, then remeasure /de.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /extensions, desktop and phone metadata.
- Element: Title “Extensions | WCPOS”; description “The extensions available for WCPOS, each with a link to its documentation.”
- Problem: Observed: the search-facing copy omits WooCommerce POS and the concrete payment-terminal integrations listed on the page, including Stripe, Square and SumUp.
- Why it costs: Inferred: buyers searching for a POS that supports their existing terminal receive little reason to recognise this result as relevant. This is a relevance and click-through weakness; a ranking loss was not verified.
- Fix: Use “WooCommerce POS Extensions & Payment Terminals | WCPOS” and a description naming existing integrations and their Pro requirement.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: “Each device keeps working without a connection” on /downloads omits the connection requirement for integrated readers and online gateways.
Observed: all sampled Lighthouse SEO scores are 100; captured phone page widths equal 390 px, including Dutch and German.
Not verified: screenshot-level wrapping or truncation, sitemap contents, and repeatability of the German mobile performance result.