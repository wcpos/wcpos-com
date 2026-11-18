# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing catalog, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales reporting are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 9 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone.
- Element: “All free, all in sync” followed by “iOS & iPad Beta” and “Android Beta.”
- Problem: Observed: the setup sequence recommends the latest 2.0 plugin alongside mobile beta downloads without explaining that the iOS and Android 2.0 store apps are not released. “Beta” does not clarify version availability; the release notes separately require matching 2.0 apps and plugin.
- Why it costs: Inferred: a tablet-first buyer cannot confidently determine what they can deploy today. That uncertainty favours competitors with clearer mobile installation paths.
- Fix: Add a release-status sentence beside the mobile choices: 2.0 is available for web and desktop; iOS and Android 2.0 store apps are not yet released.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, phone at 390px.
- Element: “What’s new” release-notes code content.
- Problem: Observed: the capture flags a `<code>` element extending past the viewport, although document width remains 390px. The Markdown styling supplies no inline-code wrapping rule.
- Why it costs: Inferred: release-note content can extend beyond the readable phone area, making an otherwise contained page look unfinished.
- Fix: Add an overflow-wrap rule for inline code within the release-notes component.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/pro`, all viewports.
- Element: SoftwareApplication `operatingSystem`: “Windows, macOS, Linux, iOS, Android.”
- Problem: Observed in source: Pro’s structured data omits Web, although the home/downloads schema includes it and browser use is a stated product capability.
- Why it costs: Inferred: machine-readable platform coverage understates WCPOS’s browser option, a useful distinction for buyers comparing browser-based registers.
- Fix: Include Web in Pro’s `operatingSystem` field, matching the existing core application schema.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: `/downloads` offers “Open the live demo” as its Web setup choice, leaving the route to the buyer’s own browser register unclear.
Observed: Lighthouse SEO scores are 100 throughout the supplied audits; the SEO finding is a narrow completeness issue.
Not verified: screenshot appearance and precise fold placement; this review used the permitted text, JSON and source reads.