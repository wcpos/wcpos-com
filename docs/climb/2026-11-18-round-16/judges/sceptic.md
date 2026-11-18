# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing catalog, stock and prices at the counter.
Why version 2: Register opening and closing, split payments and today’s sales reports are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, offline section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise omits the payment limitation explicitly explained on Downloads and the Square comparison. Connected card readers and online gateways need internet. The home page also promotes terminal integrations without connecting those two facts.
- Why it costs: A buyer comparing Square’s offline card acceptance can mistake offline order completion for equivalent payment capability. Discovering the distinction later undermines trust.
- Fix: Replace the sentence with “Complete cash sales or record payments taken on a separate terminal offline; orders sync when you reconnect. Connected card readers and online gateways need internet.”
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare/square`, phone at 390px, comparison table.
- Element: “At a glance”, especially the “Offline” row.
- Problem: Observed in source: mobile rows place two lengthy answers side by side, but product labels appear only in the table’s initial header; they are neither repeated nor sticky. Inferred: after scrolling through the preceding rows, readers must remember which column belongs to which product.
- Why it costs: Payment limitations are precisely where a sceptical buyer needs unambiguous attribution. Scrolling back to recover column identities makes comparison unnecessarily difficult.
- Fix: Repeat the existing product labels above each answer within mobile rows.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, search-result metadata on desktop and phone.
- Element: “WCPOS vs Square for WooCommerce (2026): An Honest Comparison | WCPOS”
- Problem: Observed: the 68-character title repeats WCPOS and spends space on “An Honest Comparison” instead of identifying the substantive differences. Inferred: this weakens the snippet’s information value; actual search-result truncation was not verified.
- Why it costs: Buyers evaluating competing systems get a self-endorsement where they could get a concrete reason to open the comparison.
- Fix: Use “WCPOS vs Square for WooCommerce: Orders, Sync & Fees”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: every supplied Lighthouse SEO score is 100; phone document widths match the viewport, including Dutch and German pages.
Not verified: screenshot appearance under the command-only reading restriction; the 10-second answers use the captured hero copy, not verified fold geometry.
Observed: `foldText` captures the first 600 body-text characters, so it cannot establish which elements physically fit above the fold.