# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source WooCommerce till that uses my existing products, stock and prices.
Why version 2: Register opening and closing, split payments and today’s sales report are now included free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: `/downloads`, desktop and phone, plugin installation card.
- Element: “Latest 2.0.4 · WordPress 5.6+ · WooCommerce 5.3+ · PHP 7.4+”
- Problem: Observed contradiction: this card advertises WooCommerce 5.3+ compatibility, while the release notes on the same page say “WCPOS 2.0 needs WooCommerce 9.0 or later.”
- Why it costs: A buyer cannot trust the installation requirements. Discovering an unexpected store upgrade after downloading makes an established alternative more attractive.
- Fix: Change the installation card’s WooCommerce minimum to 9.0+, matching the published 2.0 requirement.
- Scope: ok

## Worst defect — UI
- Page/viewport: `/downloads`, desktop and phone, “Three steps to your first sale.”
- Element: “Pick your device” → “Web” → “Open the live demo”
- Problem: Observed onboarding dead end: the Web option sends users to a demonstration rather than explaining how to open their own store’s register. Source confirms the destination is `https://demo.wcpos.com/pos`.
- Why it costs: After installing the plugin in step one, a browser user still lacks the next action needed to make an actual sale. The desktop options provide that action directly.
- Fix: Give the Web card a clearly labelled link to the existing documentation for opening the store’s web POS, keeping the demo secondary.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, search-result metadata, desktop and mobile.
- Element: “When Square for WooCommerce is the better choice, and when WCPOS is: where sales are recorded, syncing, locations and fees. Compared by the maker of WCPOS.”
- Problem: Observed: the description lists comparison topics but omits the page’s strongest concrete distinction—WCPOS sales become WooCommerce orders; Square POS orders do not sync through the extension.
- Why it costs: Inferred click-through weakness: a buyer scanning comparison results gets a promise to explain differences rather than a useful difference that earns the click.
- Fix: Replace the topic list with the sourced order-sync distinction, while retaining the publisher disclosure.
- Scope: ok

## Runner-up notes (max 3 lines)
The home claim “Internet drops? Keep selling” omits the payment limitations that `/downloads` explains clearly.
Captured Lighthouse SEO scores are all 100; no technical ranking failure was established.
Visual wrapping and screenshot appearance were not verified under the text-only reading constraint.