# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into a register selling from the shop's own catalogue, stock and prices, even offline.
Why version 2: 2.0 adds free register open and close, split payments and a view of today's sales (the small "New in 2.0" line above the kicker says so, though it reads as a footnote rather than news).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`), both viewports; same in /nl and /de.
- Element: the hero line "New in 2.0 · Open and close your register, split payments and see today's sales — free." versus, three sections lower, the "Built for the demands of physical retail" card "End-of-day reports **Pro** — Generate sales reports for each shift or day. Cash up quickly, track performance." and the "Start free" comparison, whose Free column ("WooCommerce sync, Product search & grid, Basic checkout, Offline mode, Receipt printing, Multi-currency, Unlimited products") lists none of the 2.0 features, while the Pro column lists "End-of-day reports".
- Problem: The page now says two opposite things. The hero says closing the register and seeing today's sales are free in 2.0. The feature grid and the tier comparison put "cash up" and "end-of-day reports" behind Pro, and the Free column still reads as the 1.x list ("Basic checkout"). The only 2.0 news on the site appears once, in small text, and the page's own pricing summary contradicts it.
- Why it costs: A shop owner deciding between free and Pro checks the Free/Pro columns, not the hero footnote. They learn the opposite of the 2.0 story and either distrust the hero or assume they must pay to close a till. For a launch message that's worse than leaving 2.0 out.
- Fix: In `messages/*.json`, add the three 2.0 free items to the Free column ("Open & close the register with cash count", "Split payments", "Today's sales report"). Rename the Pro item and the grid card from "End-of-day reports" to "Reports across days, registers & stores", and drop "Cash up quickly" from the Pro card text. This only restates the product facts.
- Scope: needs-front-desk (no price or licence change, only which tier the copy says a feature belongs to, corrected to the 2.0 facts; round 1 deferred these same tier lines to the front desk as pricing-adjacent, so it needs that ruling)

## Worst defect — UI
- Page/viewport: /pro, phone (390 px); same in /nl/pro and /de/pro.
- Element: the "Get Pro" buy box ("Yearly … $129 USD /yr", "Get Started"), which comes after "What's included in Pro?" and all six feature rows.
- Problem: At phone width the two-column grid (`grid-cols-1 lg:grid-cols-[1.5fr_1fr]` in `src/app/[locale]/(main)/pro/page.tsx`, line 174) stacks the feature list first. The buy box starts about 1,450 CSS px down, roughly 1.7 screens, and "Get Started" is near the end of the second screen. The first screen shows an H1, a grey subtitle and a feature intro with no price and no button. Round 1 fixed the desktop gap; on phone the first screen still has no offer.
- Why it costs: /pro is the page that earns money and most first visits are on phones. A visitor who came to see the price has to scroll past copy that repeats the subtitle, and the action that pays for the project sits below two screens of reading.
- Fix: Put the buy-box column first on small screens: add `order-first lg:order-none` to the card wrapper (`<div className="min-w-0 lg:sticky lg:top-24">`, line 180), so phones show title → price → features while desktop stays the same.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads (all locales), the `<title>`.
- Element: "Downloads | WCPOS" (from `downloads.meta.title` = "Downloads"); the H1 is "One till, every device." and the only JSON-LD is Organization.
- Problem: This is the page for the "WooCommerce POS app", "WCPOS Windows/Mac download" and "WCPOS 2.0 download" searches, and its title and H1 contain none of those words: no "WooCommerce", no "POS", no platform names, no "2.0". /pro got a descriptive title last round; /downloads is now the weakest title among the money and conversion pages. The meta description is fine, so the title is the weak link.
- Why it costs: The title is the strongest on-page relevance signal and is the blue link in results. "Downloads | WCPOS" can't compete for platform queries and looks like a generic file index next to app-store listings. The 2.0 release week is exactly when people search for the new desktop build.
- Fix: Set `downloads.meta.title` to e.g. "Download WCPOS — WooCommerce POS for Windows, macOS, Linux & Web" and translate it in all ten locales (don't claim the 2.0 phone apps).
- Scope: ok

## Runner-up notes (max 3 lines)
- Home hero: the red "New in 2.0" lead sits right on top of the red tracked kicker "POINT OF SALE FOR WOOCOMMERCE", so two red accents compete above the H1 (three lines in /de at 390 px). Make the 2.0 line a neutral pill linking to /changelog.
- Home phone hero (all locales): the stacked CTAs have different widths ("Try Live Demo" vs "Download Free", in /de 198 vs 252 CSS px), so the pair looks ragged. Give both the same width, e.g. `w-full max-w-xs`. The proof row also leaves "Since 2014" alone on its own line.
- /de mobile Lighthouse performance is 65 (TBT 1,020 ms, LCP 4.0 s) against 92 for / with the same layout, a second round in a row. It's worth profiling which German-only payload or render path costs the extra 970 ms.
