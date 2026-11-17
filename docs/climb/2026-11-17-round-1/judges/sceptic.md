# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A WooCommerce register that promises to use my existing catalogue, stock and prices on a tablet, even offline.
Why version 2: not answered

## Scores
| Track | Score |
|---|---|
| Marketing | 3 |
| UI | 7 |
| SEO | 7 |

## Worst defect — Marketing
- Page/viewport: Home `/`, desktop and phone; reinforced on `/compare/square`.
- Element: “Internet drops? Keep selling; WCPOS syncs when you’re back online.”
- Problem: Observed copy promises continued selling without connectivity. The Square comparison makes this explicit: “take cash sales offline.” The supplied product facts say checkout requires connectivity; only browsing and building carts work offline.
- Why it costs: Offline checkout is a purchasing requirement for market stalls and unreliable shop connections. This overstates WCPOS’s position against Square and undermines the comparison’s promise that its facts are checkable.
- Fix: Replace the offline-sales promise with “Browse products and build carts offline; reconnect to complete checkout,” and correct the matching cash-sales statements in the comparison.
- Scope: ok — contained copy corrections using supplied product facts.

## Worst defect — UI
- Page/viewport: `/pro`, `/nl/pro`, `/de/pro`; phone, 390×844.
- Element: “Get Pro” / “Get Started”, positioned after all six feature descriptions.
- Problem: Observed source and captured text put the complete feature list before the purchase panel in the mobile single-column layout. There is no pricing shortcut in the introductory section. Longer translated descriptions increase the distance to the buying decision.
- Why it costs: A buyer comparing paid POS options must scroll through another feature pitch before finding the price and next action. WCPOS makes its straightforward offer unnecessarily difficult to reach.
- Fix: Add a prominent pricing anchor beside the introductory copy that jumps to the existing purchase panel.
- Scope: ok — a small markup addition on the existing page.

## Worst defect — SEO
- Page/viewport: `/de`, mobile.
- Element: Homepage hero, “Dein WooCommerce-Shop an der Ladentheke.”
- Problem: Observed captured Lighthouse performance is 72/100, with 3.3-second LCP and 850 ms total blocking time. Source also mounts the desktop animated story inside a CSS-hidden wrapper on phones. Its contribution to the measured delay is inferred, not established by the audit summary.
- Why it costs: The German landing page has the weakest captured performance despite passing Lighthouse’s basic SEO checks. Slow rendering and blocked interaction weaken the search visitor’s arrival experience; an actual ranking loss is not verified.
- Fix: Gate the desktop animation’s mounting and initialization to desktop widths, retain the existing mobile presentation, and remeasure.
- Scope: ok — contained homepage component change; performance improvement requires verification.

## Runner-up notes (max 3 lines)
- The home copy does not explain what version 2 changes or why an existing user should care.
- “TAP TO PAY” appears in the home capture’s text despite being unavailable in 2.0; remove that implication until released.
- Screenshot wrapping and the live sitemap were not verified in this text-only run; captured page widths show no document-level horizontal overflow.