# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that lets me sell my existing catalog from a tablet, including offline.
Why version 2: Register opening and closing, split payments and today’s sales reporting are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, offline selling section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise omits the payment boundary. The preceding hardware section promotes integrated terminals, but those require a connection. The Square comparison explicitly acknowledges that restriction.
- Why it costs: Inferred: a card-heavy shop could mistake this for Square-style offline card acceptance. Discovering the limitation elsewhere makes the headline benefit feel overstated.
- Fix: Qualify this paragraph: offline cash sales and sales recorded with the external-terminal Card tender sync later; integrated readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, phone at 390×844.
- Element: “Download for macOS”, followed by “Upgrading from 1.11? Sync every register first: 2.0 starts a new local database and does not carry over unsent sales.”
- Problem: Observed: the prominent download button appears before the small upgrade warning. In the captured fold, the cookie banner obscures the warning after its opening line, including the consequence for unsent sales.
- Why it costs: Inferred: an existing merchant can act before seeing the essential upgrade precaution. This warning deserves stronger placement than an ordinary download footnote.
- Fix: Move the existing warning immediately above the download button and increase its visual prominence, keeping both in normal document flow.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home `/`, search-result title metadata, all viewports.
- Element: “WCPOS - Point of Sale for WooCommerce”
- Problem: Observed: the title identifies the category but omits the strongest acquisition distinction: the free plugin. The description supplies that distinction, but the title remains generic beside an official WooCommerce POS result.
- Why it costs: Inferred: unfamiliar buyers have less reason to choose this result when comparing free WooCommerce POS options; the brand alone does not explain the advantage.
- Fix: Change the title to “Free WooCommerce POS Plugin & Apps | WCPOS”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: the Square comparison acknowledges competitor advantages and provides dated sources, which strengthens credibility.
Observed: all captured phone pages report a 390px document width; inspected Dutch and German folds wrap without clipping.
Observed: Lighthouse SEO scores are 100; `/downloads` mobile LCP is 3.0 seconds, a remaining performance concern rather than proof of lost rankings.