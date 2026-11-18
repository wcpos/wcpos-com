# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free WooCommerce register that uses my existing catalog, stock and prices and supports offline selling.
Why version 2: It adds opening and closing the register, split payments and today’s sales report for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone.
- Element: “Every sale is a WooCommerce order, so there is nothing to sync.”
- Problem: Observed contradiction: the home page says “WCPOS syncs when you’re back online,” and Downloads explicitly describes offline sales syncing later. Sharing WooCommerce’s catalog does not eliminate synchronization.
- Why it costs: This is the comparison’s central argument against Square’s synchronization delays. Overstating it makes me distrust the comparison and wonder when stock actually updates.
- Fix: Replace “nothing to sync” throughout this page with “no separate catalog to maintain,” and state that offline sales sync after reconnection.
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare/square, phone at 390px.
- Element: “At a glance” table, headed “WCPOS” and “Square POS + Square for WooCommerce.”
- Problem: Observed in the component: phone rows contain two answer columns, but vendor labels appear only at the table’s beginning and are neither repeated nor sticky. Inferred consequence: lower rows lose their visible vendor context during scrolling.
- Why it costs: Comparing long device, payment and offline descriptions requires remembering which column belongs to which product or scrolling back to check.
- Fix: Repeat short vendor labels above each answer within phone rows.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare/square sitemap entry; all viewports.
- Element: `CONTENT_UPDATED_AT['/compare/square']: '2026-10-06'`.
- Problem: Observed in source: the sitemap modification date predates the captured page’s substantive coverage of WCPOS 2.0, released November 9. The deployed sitemap response is not verified.
- Why it costs: Inferred: an outdated modification signal gives crawlers no indication that this comparison now covers the new release.
- Fix: Set this entry’s modification date to the verified date of its latest substantive content update.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: Lighthouse SEO is 100 throughout; all captured phone document widths equal 390px.
Observed: Downloads flags a code element extending beyond the phone viewport; actual clipping is not verified.
Not verified: screenshot appearance under the command-only reading constraint; `foldText` is the first 600 body-text characters, not a geometric fold capture.