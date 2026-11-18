# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A WooCommerce register that uses my existing catalog, stock and prices, with a free version and offline selling.
Why version 2: Register opening and closing, split payments and today’s sales report are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/compare/square`, desktop and phone.
- Element: “Every sale is a WooCommerce order, so there is nothing to sync.”
- Problem: Observed: “nothing to sync” appears repeatedly, yet this page’s offline FAQ says WCPOS sales “sync when it returns.” Having no separate Square catalog does not mean WCPOS requires no synchronization.
- Why it costs: Inferred: a buyer comparing offline reliability sees an overstated advantage over Square and starts distrusting the comparison’s other claims.
- Fix: Replace the absolute claim with “No separate catalog to maintain; offline sales sync back to WooCommerce when the connection returns.”
- Scope: ok

## Worst defect — UI
- Page/viewport: `/pro`, desktop and phone.
- Element: “Payment Terminal Integration” / “Connect card readers and payment terminals for fast, accurate in-person payments.”
- Problem: Observed in captured copy and component markup: this feature provides no contextual link to supported terminals, although `/extensions` already lists them. Compatibility discovery depends on finding the footer’s generic “Extensions” link.
- Why it costs: Inferred: checking whether my existing terminal works is a purchase prerequisite; the interface makes that check unnecessarily difficult.
- Fix: Add a “See supported terminals” link to `/extensions` immediately beneath this feature’s description.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/support`, desktop and mobile search results.
- Element: “Support | WCPOS”
- Problem: Observed: the title omits WooCommerce POS entirely; the description also identifies the product only as WCPOS.
- Why it costs: Inferred: buyers unfamiliar with the brand get little confirmation that this result answers their WooCommerce POS support query.
- Fix: Change the title to “WooCommerce POS Support & Help | WCPOS”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: `/compare` opens with an unsupported universal claim that every other roundup ranks by vendor interest or commission.
Observed: all captured Lighthouse SEO scores are 100; Dutch and German Pro captures report no horizontal overflow.
Not verified: screenshot appearance; UI assessment uses captured text, measured facts and component markup under the read-command restriction.