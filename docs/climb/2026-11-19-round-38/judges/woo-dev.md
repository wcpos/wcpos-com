# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin plus apps that turns a tablet, phone or computer into a register selling from the client's own WooCommerce catalogue, stock and prices, even offline.
Why version 2: The 2.0 strip says opening and closing the register, split payments and today's sales are now free. That tells me what is new, but not that 2.0 is a rebuilt POS with its own checkout.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports (same wording in the /compare/square "Multiple stores / locations" row)
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." and, in the FAQ, "Each license can be activated on 2 sites, intended for one live site and one development site."
- Problem: The site never says what a "store" is. A developer whose client has two shops can read "several stores" as two WooCommerce sites, and the 2-site licence FAQ makes that reading look like a second licence. Nothing on the page says whether stock is shared or kept per location. The docs answer both questions (docs 1.x /stores: "separate store locations within a single WooCommerce installation … By default, all stores share the same WooCommerce stock levels"; per-location stock needs the ATUM extension, which /extensions lists). The marketing site doesn't.
- Why it costs: How multi-store works is the deciding question for a two-store client. Without it on the page, I can't recommend Pro without opening a support ticket or a Discord thread, so the sale stalls at "contact us".
- Fix: Add one sentence to the /pro stores card (and the /compare/square row): "Stores are locations within one WooCommerce site, so one licence covers them all. They share its catalogue and stock; per-location stock needs the ATUM extension." Link "ATUM" to /extensions.
- Scope: ok. This states documented behaviour and changes no price. If the owner reads "one licence covers them all" as licensing wording, drop that clause and keep the rest.

## Worst defect — UI
- Page/viewport: /pro, desktop 1440 (also tablet)
- Element: The eight feature descriptions under "What's included in Pro?", e.g. "Add registers beyond the free one, and run several stores, each with its own address…"
- Problem: In `ProFeatureList` (src/components/pro/pro-features.tsx) the descriptions are `text-sm text-muted-foreground max-w-md`: 14px dim grey, capped at 448px. They sit in a column whose subtitle above is about 18px and runs about 590px wide. The real Pro content is therefore the smallest, faintest text in the main column. Each description wraps to three short lines and leaves a dead strip beside the sticky buy box, while the bold titles carry all the visual weight.
- Why it costs: A buyer evaluating Pro reads these lines to decide, and here they read like fine print. The page looks thinner than it is, and the buy box dominates before the value is made.
- Fix: Change the description classes to `text-base text-muted-foreground` and drop `max-w-md` (or use `max-w-prose`), so they fill the column at body size.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro (English), all viewports
- Element: H1 "WCPOS Pro for WooCommerce POS"
- Problem: The H1 repeats "POS" ("WCPOS … POS") and leaves out what the page is for. The title is "Pro Features & Pricing for WooCommerce POS | WCPOS" and the meta description lists multiple stores, terminals and reports, but the H1 carries none of those terms. The nl and de H1s ("WCPOS Pro – Kassasysteem voor WooCommerce") already read better than the English one.
- Why it costs: The H1 is the strongest on-page relevance signal. A weak H1 lowers /pro's match for queries like "WooCommerce POS multiple stores" or "WooCommerce POS card terminal", and the doubled "POS" reads as keyword stuffing.
- Fix: Change `pro.hero.title` in messages/en.json to something like "WCPOS Pro: more registers, multiple stores and card terminals for WooCommerce".
- Scope: ok

## Runner-up notes (max 3 lines)
- /downloads release notes for 2.0.0 still say "Sync every till" and "the till keeps taking cash", after #861 changed "till" to "register" elsewhere on that page.
- /extensions: five terminal cards share the same line ("Adds X Terminal support to WooCommerce for in-person payments.") and none says which countries or reader models it covers, which is what I need to pick hardware.
- /support is almost all an AI widget, with only Organization JSON-LD and little indexable text. The "Start with these guides" list is its only real content.
