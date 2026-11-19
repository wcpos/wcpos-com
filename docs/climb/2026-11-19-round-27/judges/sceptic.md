# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: From the phone fold, it is a free, open-source WooCommerce register that uses my existing catalog, stock and prices.
Why version 2: It adds register opening and closing, split payments and today’s sales report to the free version.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, offline section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise has no payment qualification, although the preceding hardware section promotes integrated terminals. Downloads and the Square comparison explicitly say connected readers and online gateways need a connection.
- Why it costs: Inferred: a buyer comparing Square’s offline card capability could assume WCPOS’s integrated readers also work offline. Discovering that distinction later undermines trust in the comparison.
- Fix: State beside this promise that offline checkout supports cash and recording payments taken on a separate terminal; integrated readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, download action versus release-history hierarchy.
- Element: “Download for macOS” precedes “Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales.”
- Problem: Observed: the consequential upgrade warning appears in release history, after the setup explanation and getting-started steps. The primary download card contains installation and macOS compatibility guidance but omits this warning.
- Why it costs: Inferred: an existing merchant can download and upgrade without encountering the instruction needed to preserve unsynced sales. That matters more than a cosmetic spacing defect.
- Fix: Repeat a concise “Upgrading from 1.11? Sync every till first; unsent sales do not carry over” notice beside the primary download button, linking to the full upgrade notes.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/downloads`, search-result title, desktop and mobile.
- Element: “Download WooCommerce POS for Mac, Windows, Linux & Web | WCPOS”
- Problem: Observed: the title lists app platforms but omits the free WordPress plugin, which the page identifies as the required first installation. The description supplies that information, but the title alone makes the destination look app-focused.
- Why it costs: Inferred: someone searching for a WooCommerce POS plugin download gets a weaker confirmation that this is the right installation page. This is a modest search-intent weakness; the captured Lighthouse SEO score is already 100.
- Fix: Change the title to “Download WooCommerce POS: Free WordPress Plugin & Apps | WCPOS”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: the Square comparison provides sources, dates and explicit situations where Square is preferable.
Observed: captured page widths show no horizontal overflow, including Dutch and German pages.
Not verified: screenshot appearance and live interactions; this assessment uses the permitted text/JSON reads and source inspection.