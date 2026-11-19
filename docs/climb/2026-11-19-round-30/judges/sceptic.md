# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A WooCommerce register that uses my existing catalog, stock and prices, with a free version I can try.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: the home page combines this unrestricted offline promise with promotion of integrated payment terminals, without explaining that connected readers and online gateways require a connection. The downloads and Square comparison pages make that distinction.
- Why it costs: Inferred: a buyer comparing Square’s offline card payments could assume equivalent capability, then discover a material limitation after choosing WCPOS.
- Fix: Qualify this paragraph: browsing, carts and cash or externally recorded Card sales work offline; integrated readers and online gateways require a connection.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, especially phone at 390px.
- Element: “Upgrading from 1.11? Sync every register first: 2.0 starts a new local database and does not carry over unsent sales.”
- Problem: Observed in captured text and corroborating source: this data-loss warning follows “Download for macOS”; the component styles it as small, muted text below the primary action.
- Why it costs: Inferred: an existing merchant can act before noticing the prerequisite that protects unsent sales. This instruction needs greater prominence than routine download footnotes.
- Fix: Move the existing warning immediately above the download button and give it normal body-size, higher-contrast text.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/downloads`, Lighthouse mobile.
- Element: “Download WooCommerce POS” page’s initial load.
- Problem: Observed: performance scores 87 with 3.4-second LCP, versus 99 and approximately 2-second LCP for `/pro` and `/compare`. The audit also reports 102 KiB of unused JavaScript. This is the weakest measured mobile performance outside the excluded home-page issues.
- Why it costs: Inferred: visitors arriving from search wait longer for the download page’s main content. Field Core Web Vitals and ranking impact are not verified.
- Fix: Defer the below-fold sync diagram’s animation code until it approaches the viewport, then remeasure; source confirms an eager import, but its share of the delay is not verified.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: mobile apps are labelled Beta, but the home page does not explicitly distinguish their availability from the released desktop/web 2.0.
Observed: captured phone widths show no page-wide horizontal overflow, including Dutch and German pages.
Not verified: screenshot appearance; this review used text, JSON captures and source under the text-only reading restriction.