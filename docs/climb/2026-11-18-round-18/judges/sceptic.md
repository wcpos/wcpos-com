# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that uses my existing catalog, stock and prices, including offline.
Why version 2: Opening and closing the register, split payments and today's sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone.
- Element: “Every app connects to the free WordPress plugin — install it first.” / “Latest 2.0.4” / “iOS & iPad Beta” / “Android Beta”.
- Problem: Observed: the setup path combines the latest plugin with mobile beta links without explaining the version gap. The supplied facts say the iOS and Android 2.0 store apps are not released yet; “Beta” alone does not communicate that.
- Why it costs: Inferred: a tablet buyer cannot tell whether the advertised 2.0 experience is available on their device, weakening confidence against established mobile POS options.
- Fix: Add a notice beside the mobile choices stating that 2.0 is available for web and desktop, while the iOS and Android 2.0 store apps are not released yet.
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare/square, phone at 390px.
- Element: “The short answer” preceding “At a glance”.
- Problem: Observed in captured text and source: two roughly 100-word paragraphs plus the publisher disclosure precede the comparison table, with no jump link to it.
- Why it costs: Inferred: a buyer checking Square against WCPOS must work through substantial prose before reaching the scannable differences.
- Fix: Add an “At a glance” anchor link beneath the introduction, targeting the existing table section.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /, desktop and mobile search-result title.
- Element: “WCPOS - Point of Sale for WooCommerce”.
- Problem: Observed: the title identifies the category but omits the free core, an established differentiator already stated in the description and page.
- Why it costs: Inferred: against competing WooCommerce POS results, the most prominent snippet text gives an unfamiliar buyer little reason to investigate WCPOS specifically.
- Fix: Change the title to “Free WooCommerce POS | WCPOS”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: all supplied Lighthouse runs score 100 for SEO; the title finding is a modest snippet opportunity, not a demonstrated ranking failure.
Observed: recorded phone document widths are 390px, including Dutch and German pages.
Not verified: screenshot appearance; UI assessment uses captured text and source under the read-only input restrictions.