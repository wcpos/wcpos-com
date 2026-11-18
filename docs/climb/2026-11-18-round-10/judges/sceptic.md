# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that brings my existing catalog, stock and prices to the shop counter.
Why version 2: Opening and closing the register, split payments and today’s sales reporting are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the home page promises continued selling without explaining the payment boundary. The downloads and Square comparison pages explicitly say connected card readers and online gateways need a connection. That qualification is missing where buyers first encounter the promise.
- Why it costs: Inferred: a shop owner comparing Square’s offline card payments could assume WCPOS’s integrated terminals also work offline. Discovering the limitation later undermines confidence in the sales pitch.
- Fix: Qualify this paragraph: cash sales and sales recorded with the external-terminal Card tender work offline and sync later; connected readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare`, phone at 390×844.
- Element: “Compare WooCommerce POS systems” followed by the lengthy introduction and “Who runs this comparison” card.
- Problem: Observed: the first screen contains two explanations of the comparison’s credibility but no competitor card or comparison link. Large heading, introductory copy and disclosure occupy the entire usable fold.
- Why it costs: Inferred: buyers arriving to compare Square, FooSales or the official WooCommerce POS must scroll through repeated positioning before finding their destination. The hub feels like a defence of the publisher rather than a useful comparison index.
- Fix: Condense the introduction to one sentence retaining vendor disclosure, and move the detailed disclosure card below the comparison links.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, search metadata for both viewports.
- Element: “WCPOS vs Square for WooCommerce (2026): An Honest Comparison | WCPOS”
- Problem: Observed: the 68-character title repeats WCPOS and spends its distinguishing phrase on “An Honest Comparison,” rather than the concrete differences the page establishes.
- Why it costs: Inferred: this gives a sceptical searcher less reason to choose the result than a title naming orders or payments, while adding avoidable truncation pressure. Actual search-result truncation and click-through impact are not verified.
- Fix: Use a concise title such as “WCPOS vs Square for WooCommerce: Orders & Payments,” without appending WCPOS again.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: the Square comparison says “nothing to sync,” yet its offline FAQ says sales sync when connectivity returns; “no second catalog to maintain” would be more precise.
Observed: all captured phone pages have matching viewport and document widths; Dutch and German folds wrap without page-level horizontal overflow.
Observed: every supplied Lighthouse SEO score is 100; the SEO deduction concerns search presentation, not a demonstrated indexing failure.