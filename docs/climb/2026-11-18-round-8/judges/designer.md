# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that puts your WooCommerce store on the register at the counter, with the same catalog, stock and prices, and it keeps selling offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales report, all free. The line answers the question, but it is small print sitting above the kicker, and it leads nowhere.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`, and every locale home), desktop and phone, first screen.
- Element: "New in 2.0 · Open and close your register, split payments and see today's sales — free." (`src/components/home/scroll-story/acts/story-copy-blocks.tsx:73-91`, `messages/*.json` `story.a1.v2`)
- Problem: This is the only sentence on the home fold that says why 2.0 matters. It is still a plain `<p>` with no link. In the stack, the red "New in 2.0" label, then the red tracked "POINT OF SALE FOR WOOCOMMERCE" kicker, then the H1, give two red lines one after another. The release news reads as a second kicker, not as something you can open. On phone in de it wraps to three lines and pushes the H1 down. Lower on the page, the Free card lists "Open & close the register", "Split payments" and "Today's sales report" at the bottom with no 2.0 marker, so the news never comes back. The changelog is linked only from the footer.
- Why it costs: In release week, returning 1.x users and new evaluators arrive asking what changed in 2.0. The announcement catches them, then the "why upgrade" story stops at three feature names with no path to the detail.
- Fix: Make the line a link to `/changelog` (or the 2.0 release notes), with a trailing "→" and an underline on hover. Keep the words as they are.
- Scope: ok. It changes markup only and makes no new claim. It touches `scroll-story/acts/story-copy-blocks.tsx`, so check it against the owner's open scroll-story PR before branching. Only the copy block changes, not the scroll-story motion or the mockup.

## Worst defect — UI
- Page/viewport: /pro on phone (390), and /nl/pro and /de/pro. This is the "Get Pro" buy box, the first card under the hero.
- Element: The plan rows "Yearly · Most Popular · Updates & support for 1 year · $129 USD /yr" and "Lifetime · Updates forever · $399 USD once".
- Problem: This is unchanged since round 7. Each row is `flex flex-wrap` with a `min-w-[8rem] flex-1` text column and an `ml-auto text-right` price (`src/components/pro/pro-buy-box.tsx:94-117`), so how a row wraps depends on its content.
  - en: the Yearly price sits beside its text, which pushes "Most Popular" under the title and squeezes "Updates & support / for 1 year" into a narrow two-line column. The Lifetime price drops to its own right-aligned line underneath.
  - nl and de: both prices drop.
  - Result: the two options you are asked to compare sit at different heights and on different lines, and the arrangement changes by locale. On desktop the side column has the same problem, with "Updates & support for 1 / year" breaking after the "1".
- Why it costs: This card is where the purchase decision happens. On the one card that has to look most trustworthy, the prices are hard to compare at a glance and the layout looks unfinished.
- Fix: Below `sm`, give the price span `basis-full` and indent it to the text column (`pl-7`, past the radio), so every row stacks the same way: title and badge, then the sub-line, then the price. Keep the side-by-side layout from `sm` up, and add `whitespace-nowrap` to the "for 1 year" sub-line on desktop.
- Scope: ok. It changes layout only. The price figures, currency and plan wording are untouched.

## Worst defect — SEO
- Page/viewport: /pro meta description in en, nl and de (search result snippet).
- Element: "Upgrade WCPOS with Pro: terminal payments, stock and price editing, order and customer management, full reports, and priority support." (134 chars en, 139 nl, 148 de)
- Problem: #737 made "More Registers & Multiple Stores" the first Pro feature on the page and in the home Pro list, but the snippet still omits it. It also never says "WooCommerce" or "point of sale", while every other money page's description does. On the results page, /pro reads as an add-on for an unnamed product, and the most common reason to upgrade, a second register or a second store, is missing. The en version has about 20 characters to spare within the 155 budget.
- Why it costs: /pro is the revenue page. Searches like "woocommerce pos multiple registers" or "woocommerce pos pro" match the page body, but the snippet does not answer them, so click-through suffers. It is also inconsistent with the page it describes.
- Fix: Rewrite as, for example, "WCPOS Pro for WooCommerce POS: more registers and stores, card terminals, stock and price editing, order and customer management, full reports." Keep it within the en ≤155 and nl/de ≤160 budgets, and update every locale.
- Scope: ok. It changes metadata copy only, reuses the /compare and /pro wording, and adds no pricing and no new claim.

## Runner-up notes (max 3 lines)
- /support has the title "Support | WCPOS" (15 chars) and the H1 "How can we help?", with no "WooCommerce POS" anywhere in either. Use "WCPOS Support: WooCommerce POS Help & Docs | WCPOS".
- Home hero subhead in en, "WCPOS turns the tablet into your register": "the tablet" still reads oddly, and the next section says web, desktop and phone. de says "dein Tablet". Use "your tablet".
- /support on desktop: the Cloudflare Turnstile box is still a flat grey panel the full width of the field, between the chips and "Prefer to talk to a human?". It reads as a broken embed; make it the compact size.
