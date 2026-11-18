# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that puts my existing products, stock and prices on a tablet and supports offline selling.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/compare/square`, desktop and phone.
- Element: “Sells from your WooCommerce products and stock; nothing to sync”.
- Problem: Observed: this absolute claim conflicts with the same page’s offline explanation that sales “sync when it returns.” The defensible distinction—no separate Square catalog—is stated elsewhere but missing from this prominent comparison row.
- Why it costs: Inferred: overstating the advantage makes me distrust the comparison precisely where I need accurate stock and connectivity expectations.
- Fix: Replace “nothing to sync” throughout this page with “no separate POS catalog to maintain,” retaining the explanation of offline synchronization.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare/square`, phone, 390×844.
- Element: “At a glance”.
- Problem: Observed in captured text and confirmed in source: the comparison table follows the introduction, vendor disclosure and two substantial “short answer” paragraphs, with no jump link.
- Why it costs: Inferred: a buyer checking payment terminals, offline operation or device support must scroll through the sales argument before reaching the scannable comparison.
- Fix: Add a “Jump to feature comparison” anchor below the introduction, targeting “At a glance.”
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/support`, desktop and phone metadata.
- Element: “Support | WCPOS”.
- Problem: Observed: the title omits “WooCommerce POS”; the description also uses only the WCPOS brand, while the H1 is the generic “How can we help?”
- Why it costs: Inferred: the search result gives unfamiliar buyers little confirmation that this is support for the WooCommerce POS product they are evaluating.
- Fix: Change the title to “WooCommerce POS Support — Setup & Troubleshooting | WCPOS”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: the home hardware promise, “Plug in what’s already on your counter,” offers no nearby compatibility evidence.
Observed: all measured Lighthouse SEO scores are 100; captured phone page widths equal their viewport widths.
Not verified: screenshot-level spacing and clipping; UI assessment uses captured text and source structure.