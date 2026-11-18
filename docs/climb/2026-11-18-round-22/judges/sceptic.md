# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A WooCommerce register that uses my existing catalog, stock and prices to sell at the counter.
Why version 2: Register opening and closing, split payments and today’s sales reports are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, offline section.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed: this promise omits the payment limitation that `/downloads` and `/compare/square` explain: cash and external-terminal sales work offline, but integrated readers and online gateways require a connection. Alongside the home page’s card-terminal messaging, it suggests broader offline checkout capability.
- Why it costs: Inferred: a buyer comparing Square’s offline card payments could assume equivalent functionality, then discover the qualification after choosing WCPOS. That undermines trust in the comparison.
- Fix: Qualify this paragraph with the existing distinction between offline cash/external-terminal sales and connected readers or gateways.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, especially phone.
- Element: “Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales.”
- Problem: Observed: this consequential warning appears in the 2.0.0 release notes, after the download controls, explanatory section and three setup steps. The prominent download card mentions installing the plugin first but does not surface the sync requirement.
- Why it costs: Inferred: an existing merchant can download and upgrade without reaching the warning, risking unsent sales. The information hierarchy gives the action prominence while burying its prerequisite.
- Fix: Repeat the existing sync-before-upgrading warning immediately above the primary download button, with a link to the full upgrade notes.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/downloads`, Lighthouse mobile.
- Element: “One store at the centre. Every till in sync.” — animated device diagram.
- Problem: Observed: mobile LCP is 3.1 seconds, performance is 92, and Lighthouse reports 102 KiB of unused JavaScript. Source inspection shows the below-fold diagram eagerly imports `motion/react` and runs an animation-frame loop without a visibility gate. Its contribution to the measured delay is inferred, not isolated by the supplied audit.
- Why it costs: The download landing page misses the 2.5-second “good” LCP threshold in this lab run. Nonessential animation is a contained optimization candidate; a field Core Web Vitals failure or ranking loss is not verified.
- Fix: Defer loading and starting the diagram’s animation until it approaches the viewport, preserving its static layout, then remeasure mobile LCP.
- Scope: ok

## Runner-up notes (max 3 lines)
Home’s “Works with the equipment you already have” also needs a compatibility link beside the promise.
Captured phone widths show no document-level horizontal overflow, including Dutch and German; visual wrapping was not independently verified from images.
All supplied Lighthouse SEO scores are 100; the SEO deduction concerns measured mobile performance, not missing basic metadata.