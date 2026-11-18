# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that puts your WooCommerce store on a till at the counter, with the same catalog, stock and prices, and it keeps selling offline.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales report, all free. The line answers the question, but it is small print with nowhere to go.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`, and every locale home), desktop and phone, first screen.
- Element: "New in 2.0 · Open and close your register, split payments and see today's sales — free." (`story-copy-blocks.tsx:70-91`, `messages/*.json` `story.a1.v2`)
- Problem: The only place the home fold says why 2.0 matters is a plain `<p>` in `text-sm`, and it is not a link. A visitor who reads "New in 2.0" and wants to see what changed has no path from it. The changelog is only in the footer, about eight screens down. The red "New in 2.0" label, the red "POINT OF SALE FOR WOOCOMMERCE" kicker and the H1 are stacked on top of each other, so the 2.0 news reads as a third heading rather than as something you can open.
- Why it costs: Release week is when returning 1.x users and new evaluators come to the home page to find out what 2.0 is. The announcement catches them but goes nowhere, so the "why upgrade" story stops at three feature names.
- Fix: Wrap the line in a link to `/changelog` (or the 2.0 release notes in the docs) with a trailing "→" and an underline on hover. The words stay as they are.
- Scope: ok. It changes markup only and makes no new claim. It touches `scroll-story/acts/story-copy-blocks.tsx`, so check it against the owner's open scroll-story PR before branching.

## Worst defect — UI
- Page/viewport: /pro on phone (390), and /nl/pro and /de/pro. This is the "Get Pro" buy box, the first card under the hero.
- Element: The plan rows "Yearly · Most Popular · $129 USD /yr" and "Lifetime · Updates forever · $399 USD once".
- Problem: Each row is `flex flex-wrap` with a `min-w-[8rem] flex-1` text column (`pro-buy-box.tsx:94-117`), so wrapping depends on the content. In English the Yearly price sits to the right of its text, with the badge pushed under the title and "Updates & support for 1 year" squeezed into a narrow column. The Lifetime price drops to its own right-aligned line below. In Dutch both prices drop. The two choices you are asked to compare never line up, and the layout changes from locale to locale.
- Why it costs: This card is the decision point for revenue. On a phone, the prices sit at different heights and on different edges, so comparing them takes extra effort. It also looks unfinished on the one card that has to look most trustworthy.
- Fix: Below `sm`, give the price block `basis-full` and indent it to the text column (`pl-7`, aligned past the radio), so every row stacks the same way: title and badge, then the sub-line, then the price. Keep the side-by-side row from `sm` up.
- Scope: ok. It changes layout only. Price figures and wording are unchanged.

## Worst defect — SEO
- Page/viewport: home meta description in en, nl and de (search result snippet).
- Element: "Free, open-source point of sale for WooCommerce. Sell offline, split payments, and open and close your register — all free in WCPOS 2.0. Web and desktop apps; iOS and Android apps in beta." (188 chars in en, 197 in nl, 216 in de, per `facts.json`)
- Problem: Round 6 lengthened the home description to add the beta note. Google cuts it at about 155–160 characters, so in en the snippet ends around "Web and desktop apps; iOS…". In de it ends before the platform list. The beta label that was added for accuracy is the exact part searchers will not see. The /compare descriptions were trimmed to fit last round, but home was not.
- Why it costs: The home page is the highest-traffic result. A truncated snippet with an ellipsis looks unkempt, and the platform sentence never reaches the searcher.
- Fix: Rewrite the en, nl and de home descriptions (and the other locales) to fit the round-6 budget (en ≤155, Latin locales ≤160). Keep "free, open source", "offline", "WCPOS 2.0" and a short "iOS/Android in beta".
- Scope: ok. It is a metadata copy change with no new claim.

## Runner-up notes (max 3 lines)
- Home hero subhead "WCPOS turns the tablet into your register" in en: "the tablet" reads oddly and narrows the product to tablets just before the next section says web, desktop and phone. de already says "dein Tablet". Use "your tablet" or "any device".
- /support desktop: the Cloudflare Turnstile box is a flat grey panel that is wider than the field and sits between the suggestion chips and the "Prefer to talk to a human?" section. It reads as a broken embed, so make it compact and centre it below the field.
- /extensions desktop: in two-line card titles ("Mercado Pago Terminal for WooCommerce") the doc links wrap to two lines while their neighbours stay on one, so the bottom edges of the card grid are uneven.
