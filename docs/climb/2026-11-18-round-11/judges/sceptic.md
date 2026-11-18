# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A WooCommerce register that uses my existing catalog, stock and prices on a tablet.
Why version 2: Register opening and closing, split payments and today’s sales reports are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the home page promotes offline selling and integrated terminals without explaining that connected readers and online gateways require internet. The downloads page supplies this distinction.
- Why it costs: A buyer comparing Square’s offline card payments could mistake this for equivalent payment continuity, then discover the limitation at checkout.
- Fix: Qualify this paragraph: offline cash and external-terminal sales sync later; integrated readers and online gateways need a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare`, phone at 390px.
- Element: “Every WooCommerce POS roundup…” followed by “Who runs this comparison”.
- Problem: Observed: two introductory blocks repeat the vendor disclosure and sourcing promise before the competitor choices. Inferred: this gives introductory prose too much prominence on a narrow screen.
- Why it costs: Someone looking for Square, FooSales or the official WooCommerce POS must work through repeated assurances before reaching the relevant comparison.
- Fix: Shorten the hero introduction to one sentence and retain the existing disclosure, bringing the comparison choices forward.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home sitemap entry; viewport-independent.
- Element: `CONTENT_UPDATED_AT`: `'/': '2026-10-07'`.
- Problem: Observed in source: the home sitemap date remains October 7 despite the captured page promoting November’s released 2.0 features. Whether the live sitemap currently emits this date is not verified.
- Why it costs: If deployed, the stale date fails to signal the substantive release update to crawlers; it weakens the usefulness of the sitemap’s freshness information.
- Fix: Set the home entry’s last-modified date to its actual substantive content-update date.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: `/compare/square` says “nothing to sync”, while home and downloads explain delayed offline syncing; “no second catalog” would be more precise.
Observed: all supplied Lighthouse SEO scores are 100, and captured phone document widths are 390px.
Not verified: screenshot appearance and actual fold visibility; answers use hero copy, text, audit data and source because input reading was restricted to text commands.