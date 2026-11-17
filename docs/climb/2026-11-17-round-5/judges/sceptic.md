# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A WooCommerce-connected register that uses my existing catalog, stock and prices, with a free, open-source core.
Why version 2: Register opening and closing, split payments and today’s sales reporting are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: `/compare/square`, desktop and phone.
- Element: “Every sale is a WooCommerce order, so there is nothing to sync.”
- Problem: Observed: the short answer and comparison table repeat “nothing to sync,” while `/downloads` explicitly explains that offline sales sync after reconnecting. Sharing WooCommerce as the underlying store does not eliminate synchronization.
- Why it costs: A buyer investigating Square’s synchronization limitations encounters an absolute claim contradicted by WCPOS’s own explanation. That weakens trust in the comparison’s fairness.
- Fix: Replace “nothing to sync” with “no separate catalog to maintain; offline sales sync back to WooCommerce when you reconnect.”
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare/square`, phone at 390px.
- Element: “Who runs this comparison”
- Problem: Observed in text and source: a padded, accented disclosure card precedes “The short answer.” Inferred: this gives a lengthy publisher disclaimer more prominence than the buying decision.
- Why it costs: A phone visitor must work through the introduction and disclosure before learning the practical difference between the products.
- Fix: Condense the disclosure before the answer to one sentence identifying WCPOS as publisher, and move its remaining sourcing explanation beside the table caption.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, both viewports and FAQ structured data.
- Element: “Browse products, build carts and take cash sales offline”; “Does Square POS work offline?”
- Problem: Observed: the table and FAQ omit offline sales recorded with the Card tender using an external terminal. The FAQ answer also supplies the page’s FAQPage structured data. The supplied product facts and `/downloads` describe this supported workflow.
- Why it costs: Search engines extracting these comparison passages receive an incomplete account that makes WCPOS appear cash-only offline against Square’s offline card capability.
- Fix: Include cash and Card-tender sales using a separate terminal in both passages, while retaining the connection requirement for integrated readers and online gateways; distinguish recording payment from processing it.
- Scope: ok

## Runner-up notes (max 3 lines)
Home’s “One POS. Web, desktop, iOS & Android” needs nearby clarification that mobile 2.0 store releases are pending.
Observed: all supplied Lighthouse SEO scores are 100; captured phone document widths show no horizontal overflow, including Dutch and German.
Screenshot appearance was not verified under the specified read-tool restriction; the UI finding uses captured text and component source.