# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: 2.0 makes open/close register, split payments and today's sales report free (from the "New in 2.0" line above the H1).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (same copy on /de/pro, /nl/pro)
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users."
- Problem: The list of what each store gets says nothing about stock. For a two-store client, the first question is whether the stores share one WooCommerce stock count or keep separate stock per location. The site answers this only by implication, in two other places. /compare/yith says YITH may fit better if you "sell from several stores with separate stock". /extensions lists "WCPOS ATUM Integration … linking inventory locations to POS stores". Neither is linked from this card.
- Why it costs: Multi-store is the Pro feature I'd be paying for. Without the stock answer I can't recommend WCPOS without a support question or a sales call, and a buyer who assumes per-store stock finds out after buying.
- Fix: Add one sentence to `pro.features.multiStore.description` (and the locales): "Stores share your WooCommerce stock; for separate stock per location, add the ATUM Multi-Inventory integration". Link it to /extensions the same way "See all terminal extensions" links from the card below.
- Scope: ok. This is copy only and not a new claim: shared stock is WooCommerce's default, and the wiki's pro-and-add-ons.md describes the ATUM integration as "enabling location-specific stock … at the POS".

## Worst defect — UI
- Page/viewport: /pro, phone 390x844 (same on /de/pro, /nl/pro)
- Element: The "Get Pro" buy box (Yearly / Lifetime cards, "Get Started", the terms line) stacks above "What's included in Pro?"
- Problem: The desktop two-column layout puts the features on the left and the buy box on the right. On a phone, the buy box column renders first. The visitor gets the H1, a subtitle, then two price cards and a checkout button before learning what Pro adds. The first feature, "More Registers & Multiple Stores", starts more than a full screen down.
- Why it costs: On a phone, the visitor has to scroll through a checkout box before seeing what they would be paying for, which hurts conversion. A developer forwarding the link to a client gives them a price list to open with, not a feature list.
- Fix: In the /pro layout, put the features column first below `lg` (for example `order-2 lg:order-none` on the buy-box column), so phones show "What's included" first and then the buy box.
- Scope: ok. It changes the order of sections at phone width only. Price wording and formatting stay untouched.

## Worst defect — SEO
- Page/viewport: /pro (all locales)
- Element: The "Frequently Asked Questions" section has five Q&As ("Is the free plugin limited?", "What happens when my license expires?", "How many sites can I use my license on?", …). The JSON-LD on the page is only Organization and SoftwareApplication.
- Problem: The /compare/* pages already emit FAQPage JSON-LD for their FAQs. /pro, the page that answers the questions developers search before buying (free limits, expiry, site count), emits none. Its visible headings are also thin: H1 "WCPOS Pro" plus just two H2s.
- Why it costs: Search engines and AI answer engines get no structured question-and-answer pairs for the exact pre-sales queries ("WCPOS Pro license expires", "WCPOS free version limits"). Those answers go to third-party roundups instead of to wcpos.com.
- Fix: Emit a FAQPage JSON-LD on /pro built from the same five `pro.faq.*` strings already rendered, reusing the compare pages' FAQPage helper.
- Scope: ok. This is metadata only, and the copy already exists.

## Runner-up notes (max 3 lines)
- /extensions: under "Card terminals and payments", the first card is "Email Invoice Gateway", which is not a terminal. Stripe, Square and SumUp should lead that group.
- /pro H1 "WCPOS Pro" carries no "WooCommerce POS" keyword, though the title tag does. Consider "WCPOS Pro for WooCommerce POS".
- /downloads, phone: in the expanded 2.0.4 release notes, the user-facing bullets render in heavy bold white, so the block reads as a wall of bold text. Regular weight would scan better.
