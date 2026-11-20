# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin plus apps that turns a tablet, phone or computer into a register. It sells from the client's own WooCommerce catalogue, stock and prices, even offline.
Why version 2: The "New in 2.0" line says that opening and closing the register, split payments and today's sales are now free. It names what is new, but it doesn't say that 2.0 is a rebuilt POS with its own checkout. That only appears in the /downloads release note.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports. The /compare/square "Multiple stores / locations" row uses the same wording.
- Element: The "More registers & multiple stores" card: "Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." The FAQ: "Each license can be activated on 2 sites, intended for one live site and one development site."
- Problem: The site still never says what a "store" is, or whether stores share stock. Read next to the 2-site FAQ, "several stores" can easily mean two WooCommerce sites, each needing its own licence. The per-store list names address, tax, receipts, pricing and users, but not stock. The only hint is the ATUM card on /extensions ("linking inventory locations to POS stores"), and that card doesn't say stock is shared without it. The docs answer both points: stores are locations within one WooCommerce install, and they share its stock unless ATUM Multi-Inventory is used.
- Why it costs: How multi-store works is the deciding question for a two-store client. Left unanswered, I can't recommend Pro without a Discord thread, which is the "sales call" this site otherwise avoids.
- Fix: Add one sentence to the /pro stores card and the /compare/square row: "Stores are locations within one WooCommerce site and share its catalogue and stock; per-location stock needs the ATUM integration (Pro)." Link "ATUM" to /extensions.
- Scope: needs-front-desk. Round 38 parked this as needing the owner to confirm the product fact. The sentence changes no price or licence term. This is the third round I have named it.

## Worst defect — UI
- Page/viewport: /pro, desktop 1440 (tablet too)
- Element: The eight feature descriptions under "What's included in Pro?", e.g. "Take in-person card payments on Stripe Terminal, Square Terminal, SumUp, Mollie, PayPal Reader and more."
- Problem: `src/components/pro/pro-features.tsx:61` renders them as `text-sm text-muted-foreground max-w-md`: 14 px dim grey, capped at 448 px. The subtitle above them is about 18 px and runs about 590 px wide. So the actual Pro content is the smallest, faintest text in the column. Each description wraps to 2–3 short lines and leaves an empty strip next to the sticky buy box, while the bold titles carry all the weight (see pro-desktop-full).
- Why it costs: These lines are what a buyer reads to judge whether Pro is worth $129, and they look like fine print. The page reads thinner than it is, and the price box dominates before the value is made.
- Fix: In `pro-features.tsx` change the description classes to `text-base text-muted-foreground` and drop `max-w-md`.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads step 1 plugin card, all viewports and locales. The same string is in the SoftwareApplication JSON-LD on /, /pro and /downloads.
- Element: "Latest 2.0.4 · WordPress 5.6+ · WooCommerce 9.0+ · PHP 7.4+" (`messages/*.json` `requirements` / `requirementsWithVersion`), and `softwareRequirements: 'WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+'` (`src/lib/software-application-json-ld.ts:5`).
- Problem: The line contradicts itself. WooCommerce 9.0, which the same line requires, does not install on WordPress 5.6; WooCommerce 9.0 needs WordPress 6.4 or later. A site on WordPress 5.6–6.3 meets "WordPress 5.6+" but cannot run WCPOS 2.0. The release notes on the same page stress that 2.0 needs WooCommerce 9.0.
- Why it costs: Search engines and AI answers read `softwareRequirements` from structured data, so a wrong minimum spreads beyond the site. A developer checking a client's stack sees a requirement that can't be true and starts doubting the rest of the spec sheet.
- Fix: Change "WordPress 5.6+" to the real 2.0 minimum, checked against the plugin readme's "Requires at least" and no lower than WooCommerce 9.0's own (6.4). Make the change in the constant and in the two message keys in all ten locales.
- Scope: ok. This corrects a stated requirement and makes no new claim. Confirm the number against the plugin readme before shipping.

## Runner-up notes (max 3 lines)
- /downloads lab mobile perf is 69 (TBT 1,070 ms, forced reflow, 2.0 s bootup), against 94 in round 38 with no change to the page. Re-run it before anyone acts on it, but it is the weakest Lighthouse number outside the held /de and home.
- /pro does not list the Coupons screen or the extension directory, which /compare/square's "Pro adds:" list includes. The two lists of what Pro includes disagree.
- /downloads 2.0.0 release note still says "Sync every till" and "the till keeps taking cash", where the rest of the site says "register".
