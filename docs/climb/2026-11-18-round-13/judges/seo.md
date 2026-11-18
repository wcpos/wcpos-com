# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A point-of-sale plugin for WooCommerce that turns a tablet into your shop's register, using the same catalog, stock and prices, and it keeps working offline. The core is free and open source.
Why version 2: The banner says "New in 2.0 · Open and close your register, split payments and see today's sales — free". That is the answer, given as a small line above the eyebrow.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`), pricing section "Start free. Upgrade when you need more.", Free card, desktop and phone, all locales.
- Element: "Basic checkout", the third item in the Free list (`messages/en.json:204`, `home.pricing.free.features.f3`). It sits next to "Open & close the register", "Split payments" and "Today's sales report".
- Problem: The rest of the site describes 2.0's free checkout as a tender pane that takes cash, records card payments taken on your own terminal and splits one order across several payments. The home feature card says the same: "take cash or card on your own terminal, and split a payment". "Basic" undersells that exact feature at the point where a shop owner decides whether Free is enough. It also reads as though Free can't take cards. This is the third round this has been named, and it is unchanged live.
- Why it costs: The pricing card is where a shop owner works out whether they must pay. "Basic checkout" makes them think the free POS is crippled, which works against the "Download Free" call to action and against the 2.0 message the hero leads with.
- Fix: Change `f3` to "Cash & card-terminal checkout", reusing the wording the home feature card already publishes, and change the nine locales to match.
- Scope: ok. The copy restates published 2.0 behaviour, and no price or plan terms change.

## Worst defect — UI
- Page/viewport: home "Built for the demands of physical retail" grid on phone (390px). It is worst in nl and de, and it also appears in en and on /extensions.
- Element: nl "Voorraad en prijzen direct aanpassen" followed by its "Pro" badge. The title fills the line, and the badge wraps onto a line of its own, indented by its `ml-2` margin. The source is `src/components/ui/feature-card.tsx`, where the badge is an `inline-block` span with `ml-2` after `{title}`.
- Problem: An orphaned, indented pill on a line of its own looks like a layout bug. It breaks the rhythm of the card stack and adds a line to every card it hits. Next to it, "Rapporten over dagen, kassa's en winkels Pro" wraps correctly, so the inconsistency is visible within one screen.
- Why it costs: This is the most visible polish defect left on the main page's phone view, which is where most first visits land. Dutch and German owners see it on several cards.
- Fix: In `FeatureCard`, glue the badge to the title's last word so they wrap together, either by splitting off the last word and putting it with the badge in a `whitespace-nowrap` span, or by putting a non-breaking space in place of the `ml-2` margin. That way the badge never starts a line.
- Scope: ok. It is one component's markup, with no copy changes.

## Worst defect — SEO
- Page/viewport: `/sitemap.xml`, all ten locales. The source is `src/app/sitemap.ts:47-59` (`CONTENT_UPDATED_AT`, "checked 2026-10-07").
- Element: `'/': '2026-10-07'`, `'/pro': '2026-10-07'`, `'/extensions': '2026-10-07'`, `'/compare': '2026-10-07'`, `'/compare/square': '2026-10-06'`. `/compare/foosales` has no entry, so it emits no lastmod at all.
- Problem: The sitemap tells crawlers that home and /pro have not changed since before the 2.0 release on 9 Nov. In fact the home page was rewritten for 2.0, with the "New in 2.0" line and a new meta description. /pro changed today, with its H1 (#751), the `FAQPage` JSON-LD (#756) and the display card (#757). /extensions changed in #755, and the /compare hub in #752. git log shows the last change dates as home 2026-11-18 (#741), /pro 2026-11-18, /compare 2026-11-18 and /extensions 2026-11-18. /compare/square's own footer says its facts are "for WCPOS 2.0, released 2026-11-09", yet its lastmod is 2026-10-06. The dates are kept by hand ("Bump a route's date when its content changes"), and no change in the last six weeks has bumped them. This was a runner-up in rounds 11 and 12 and is still unchanged.
- Why it costs: Google uses lastmod only when it proves "consistently and verifiably accurate". Every money page now carries a date older than content that is visibly on the page, which teaches Google to ignore this site's lastmod. That removes the cheapest signal for getting the 2.0 titles, the new /pro FAQ rich result and the refreshed comparison pages recrawled quickly. Freshness matters most on the /compare pages, which compete on "2026" queries.
- Fix: Set each `CONTENT_UPDATED_AT` entry to its route's real last content change (from git: `/`, `/pro`, `/extensions` and `/compare` are 2026-11-18; check each `/compare/*` page in the same way) and add `/compare/foosales`. Optionally, add a sitemap test that fails when a route's page directory has a newer commit than its date.
- Scope: ok. It is a metadata field, with no copy, price or claim changes.

## Runner-up notes (max 3 lines)
- The /compare/* pages still have no in-body links to /pro or /extensions (`/compare/square` has 13 internal links, which is only the header and footer). This was my round-12 pick, and it is still open.
- The /compare hub uses the same anchor text, "Read the comparison", for all seven links, and the card H2s are not links. Linking each H2, e.g. "WCPOS vs Square for WooCommerce", would give each comparison page a descriptive anchor.
- The /pro title promises "Pricing", but the buy box ("Get Pro") is not a heading. Its H2s are only "What's included in Pro?" and "Frequently Asked Questions".
