# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, offline section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the promise omits the payment limitation explained on Downloads and the Square comparison: connected card readers and online gateways require a connection.
- Why it costs: Inferred: a buyer comparing Square’s offline card payments can mistake this for equivalent capability, then lose trust when discovering the restriction.
- Fix: Qualify this paragraph: cash sales and sales recorded using a separate terminal work offline and sync later; connected readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare/square`, phone at 390×844.
- Element: “The short answer”
- Problem: Observed: the section contains roughly 190 words in two uninterrupted paragraphs, mixing devices, payments, architecture and commercial details before the comparison table.
- Why it costs: Inferred: a phone reader must parse substantial prose to extract the deciding differences—WooCommerce order ownership versus Square’s payment capabilities.
- Fix: Reduce the section to two short, clearly labelled summaries, one per product, leaving supporting details in the existing sections below.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare`, desktop and phone.
- Element: “Read the comparison” repeated on all seven comparison links.
- Problem: Observed: every destination has identical generic anchor text; the descriptive competitor headings are not links.
- Why it costs: Inferred: these internal links miss an opportunity to identify each comparison explicitly to search engines and readers navigating links independently.
- Fix: Include the competitor in each visible anchor, such as “Read WCPOS vs Square.”
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: `/compare/square` repeatedly says “nothing to sync,” yet its own FAQ says offline sales sync when connectivity returns; “no separate vendor catalog to synchronize” would be more precise.
Observed: all captured phone page widths equal 390px, and all Lighthouse SEO scores are 100.
Not verified: screenshot appearance; visual hierarchy findings rely on captured text and markup, within the text-only inspection constraint.