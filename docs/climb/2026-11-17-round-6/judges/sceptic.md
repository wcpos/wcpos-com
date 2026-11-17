# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce register that puts my existing catalogue, stock and prices on a tablet, with offline capability.
Why version 2: Register opening and closing, split payments and today’s sales reporting are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone, device section.
- Element: “One POS. Web, desktop, iOS & Android.”
- Problem: Observed: the home page combines a prominent 2.0 announcement with unqualified mobile-app availability. Downloads labels iOS and Android “Beta”; the supplied product facts say their 2.0 store releases are not out yet. The home page does not distinguish those release states.
- Why it costs: Inferred: an iPad buyer comparing WCPOS with Square or the official WooCommerce POS can reasonably expect the advertised 2.0 experience in the store app today. Discovering the qualification later undermines trust in the wider feature comparison.
- Fix: Add an adjacent qualification: “2.0 is released for web and desktop; iOS and Android 2.0 store releases are still pending.”
- Scope: ok

## Worst defect — UI
- Page/viewport: `/compare/square`, phone, 390×844 first screen.
- Element: “Who runs this comparison” and its disclosure card.
- Problem: Observed: the large introduction and disclosure consume the available first screen; “The short answer” and all concrete product differences sit below it. The page establishes its impartiality before showing anything a buyer can compare.
- Why it costs: Inferred: a shopper arriving from a comparison search must scroll through introductory material before learning the decisive distinction—whether in-person sales become WooCommerce orders.
- Fix: Move the existing “The short answer” section immediately after the introductory heading and paragraph, with the disclosure following it.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare`, desktop and phone; internal links to the seven comparison pages.
- Element: “Read the comparison”.
- Problem: Observed: all seven destination links use the same generic text. Source inspection confirms the competitor-specific headings are not links. The hub therefore omits the competitor names from its main comparison-link labels.
- Why it costs: Inferred: this weakens the explicit destination context supplied by internal anchor text for commercially relevant comparison pages. Surrounding headings provide context, so this is a modest weakness, not evidence of a ranking penalty.
- Fix: Give each link a destination-specific label, such as “Compare WCPOS with Square for WooCommerce”.
- Scope: ok

## Runner-up notes (max 3 lines)
Observed: “Internet drops? Keep selling” on home omits the connected-reader and online-gateway restrictions explained on Downloads.
Observed: `/pro` promises payment-terminal integration without naming supported readers or linking that feature directly to the existing extensions catalogue.
Observed: all captured Lighthouse SEO scores are 100; the inspected Dutch and German phone layouts wrap without page-level horizontal overflow.