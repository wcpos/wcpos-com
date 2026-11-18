# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing catalog, stock and prices for counter sales.
Why version 2: Register opening and closing, split payments and today’s sales reports are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone.
- Element: “All free, all in sync” beside “iOS & iPad Beta” and “Android Beta.”
- Problem: Observed: mobile downloads sit alongside the current 2.0 plugin without an explicit mobile release limitation. The supplied facts say the mobile 2.0 store apps are not out yet; this page itself says the app and plugin must both be on 2.0. “Beta” does not explain that compatibility gap.
- Why it costs: Inferred: an iPad-first buyer can reasonably expect these downloads to deliver the advertised 2.0 experience together. Discovering the mismatch during setup undermines confidence against Square’s clearly available mobile offering.
- Fix: Add explicit availability copy beside the mobile links: 2.0 is released for plugin, web and desktop; mobile 2.0 store releases are pending, and app/plugin versions must match.
- Scope: ok

## Worst defect — UI
- Page/viewport: /downloads, desktop and phone; download controls versus release-history placement.
- Element: “Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales.”
- Problem: Observed: this consequential instruction appears in the 2.0.0 release notes after the download controls, architecture explanation and setup steps. The primary download area contains compatibility advice for older Macs but no equivalent warning about unsynced sales.
- Why it costs: Inferred: an existing merchant can download and begin upgrading without reaching the instruction that protects their sales records. This is an information-hierarchy failure with a much higher consequence than cosmetic spacing.
- Fix: Repeat a short “Sync every till before upgrading” notice beside the primary download button, explicitly mentioning unsent sales and linking to the existing full upgrade notes.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare, search-result metadata for desktop and mobile.
- Element: “Honest, sourced comparisons of point of sale systems for WooCommerce — architecture, real free-tier limits, pricing, offline support, and when to choose each one.”
- Problem: Observed: neither the title nor description names any competitor, although the page offers seven named comparisons. The description spends limited snippet space on “Honest” and generic categories.
- Why it costs: Inferred: someone comparing Square, FooSales or the official WooCommerce POS cannot tell from this snippet whether their shortlist is covered. This is a search-result relevance opportunity, not an observed indexing failure.
- Fix: Replace the description with “Compare WCPOS with Square, FooSales, WooCommerce’s official POS and other options: sourced pricing, offline support, payments and trade-offs.”
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: /compare mobile Lighthouse performance is 89 with 3.4 s LCP; the supplied summary does not establish a specific component-level cause.
Observed: captured page widths equal viewport widths, including Dutch and German; screenshot wrapping and clipping were not visually verified under the text-only reading restriction.
Observed: the Square comparison acknowledges competitor strengths and supplies dated sources, which substantially improves credibility.