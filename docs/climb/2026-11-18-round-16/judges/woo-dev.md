# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone. This is the step 3 Pro card, "Want more? Go Pro". It is still live, and I named it in round 15 too.
- Element: "Unlock the full till — Payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: The card lists plain "Payments" first among the Pro unlocks. Higher on the same page, Free can "complete cash sales or sales on a separate card terminal". The line just above the card says Pro adds "terminal payments". The home Free card lists "Cash or card on your own terminal" and "Split payments". What Pro adds is card-reader integrations and custom gateways, not payments as such.
- Why it costs: This is the last card I read before I install. If it says payments are Pro, I would tell a client that Free can't take money, or I would have to check the docs before I can recommend Free for the second store. The site's Free/Pro line goes vague just where the client decides.
- Fix: Change "Payments" to "Card-reader payments" in every locale, to match "terminal payments" one line above and "Payment Terminal Integration" on /pro.
- Scope: ok. It is copy only, and it narrows an existing claim.

## Worst defect — UI
- Page/viewport: every page except /pro, desktop 1440. Seen in the /, /extensions and /compare/square fold shots.
- Element: the header nav item "Pro" (`highlight: true` → `text-foreground` in `src/components/main/site-nav.tsx` `navItemClass`)
- Problem: "Pro" is the only nav item drawn in full foreground colour; Downloads, Documentation, Support and Roadmap are muted grey. The active page is shown by a subtle red tint and pill, which most pages don't get, because they aren't in the nav. So on /compare/square or /extensions the one darker item reads as "you are here: Pro". The fold shots show exactly that: on /extensions, "Pro" is the only dark item.
- Why it costs: On /extensions or a comparison page I lose my place. It looks as if I'm inside the Pro section, so the Pro pills on /extensions read as "this whole page is Pro". It also makes the nav look like a sales nudge rather than wayfinding, which a developer weighing an open-source tool notices.
- Fix: Drop the `highlight` emphasis so "Pro" uses the same muted style as its neighbours. If it must stand out, use a treatment that can't be read as a state, like a small "Pro" badge, not a darker text colour.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (home), all viewports. facts.json still counts 13 internal links on home, all of them header and footer. This is the fourth round running.
- Element: the features grid, "Smooth checkout flow — … Pro connects card readers like Stripe Terminal and SumUp." and the "Pro"-tagged cards ("Order history & management Pro", "Reports across days, registers & stores Pro").
- Problem: The home body names specific terminals and Pro features but links neither to /extensions (the card-terminal page with ItemList JSON-LD) nor to /pro from those claims. /pro ("See all terminal extensions") and the /compare/* pages already carry contextual links like this. Home, the page with the most authority, does not.
- Why it costs: Home passes no anchor text ("card readers", "Stripe Terminal") to the page that targets card-terminal searches. A developer checking hardware support also hits a dead end and has to find "Extensions" in the footer.
- Fix: In the "Smooth checkout flow" card, link "card readers like Stripe Terminal and SumUp" to /extensions, using the `t.rich` tag pattern from #759.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro "More Registers & Multiple Stores" still doesn't say whether "stores" are locations in one WooCommerce site. Next to the FAQ "2 sites (one live, one development)", a two-shop agency can't tell if it needs one licence or two. needs-front-desk (plugin fact check).
- /downloads release notes, phone: the first two 2.0.4 notes render as full-paragraph bold (`strong` in the release body), while the "Developers:" note is plain grey. It is a wall of bold, and it makes the developer line look secondary.
- /extensions: five terminal cards share the same boilerplate, "Adds X Terminal support to WooCommerce for in-person payments". Nothing on them, like countries or reader models, helps me tell them apart.
