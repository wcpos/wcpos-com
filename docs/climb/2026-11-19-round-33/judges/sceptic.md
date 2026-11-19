# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce store, using the same catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 9 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise omits the payment limits explained on `/downloads` and `/compare/square`. With Stripe Terminal and SumUp promoted nearby, it leaves unclear whether those connected readers also work offline.
- Why it costs: Inferred: a buyer comparing Square’s offline card payments could assume equivalent capability, then lose trust when discovering that WCPOS’s integrated readers require a connection.
- Fix: Qualify this paragraph: offline browsing, carts, cash sales and recording payments taken on a separate terminal work; connected card readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare`, phone at 390px.
- Element: The seven-card list beginning “WCPOS vs Square for WooCommerce” and ending “WCPOS vs YITH Point of Sale”.
- Problem: Observed in the captured copy and page markup: the hub offers only a sequential card list, without a compact set of competitor links above it. Buyers seeking Jovvie or YITH must scroll through the preceding comparisons.
- Why it costs: Inferred: someone arriving with an existing shortlist has to search through descriptions of unrelated products before reaching the relevant comparison.
- Fix: Add a compact, wrapping row of competitor-name links beneath the introduction, using the existing comparison destinations.
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home `/`, desktop and mobile search-result title.
- Element: “WCPOS - Point of Sale for WooCommerce”
- Problem: Observed: the title identifies the category but omits the free, open-source distinction already established in the page copy and description.
- Why it costs: Inferred: among competing WooCommerce POS results, the title gives an unfamiliar buyer little reason to investigate WCPOS specifically. This is a search-result differentiation weakness, not an observed indexing failure.
- Fix: Change the title to “Free, Open-Source WooCommerce POS | WCPOS”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: every captured phone page, including Dutch and German, has a 390px document width; tested pages all score 100 for Lighthouse SEO.
Not verified: screenshot appearance, clipping and wrapping; inspection followed the restriction to text-reading commands.
Owner-blocked defects are excluded from the selections above.