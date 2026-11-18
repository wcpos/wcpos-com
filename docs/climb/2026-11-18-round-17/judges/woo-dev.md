# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that turns a tablet into a register, selling from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report come free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (the "What's included in Pro?" list, with the FAQ further down the same page). The same wording is in nl/de.
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." Further down: "Each license can be activated on 2 sites, intended for one live site and one development site."
- Problem: Nothing on /pro, the /compare pages or the home page says that a Pro "store" is a location inside one WooCommerce site. The cashier picks a store when they connect to a multi-store site (wiki product/features.md, Connect screen). The license FAQ talks about "sites". So a reader can take "several stores" to mean several WooCommerce installs, and then the "2 sites (one live, one dev)" answer seems to cap them at one store.
- Why it costs: This is the first question my two-store client asks: one licence or two? Do they need one WooCommerce site with two POS stores, or two sites? The page can't answer it, so I would have to email support or book a call before I can quote. That is exactly the hesitation the brief says the site should remove. Multi-store is also Pro's headline unlock, so the doubt sits on the reason to buy.
- Fix: Change the card body to "…and run several stores (shop locations) from one WooCommerce site, each with its own address, tax rates, receipt template, pricing and authorized users." Make the same change in every locale and in the compare "Multiple stores / locations" row.
- Scope: ok. It is feature copy only and states an existing product fact. The license FAQ and the plan terms are untouched. The front desk should confirm the one-site wording against the Pro plugin before shipping.

## Worst defect — UI
- Page/viewport: every page except /pro, desktop 1440. It shows in this round's /, /extensions and /compare/square fold shots. It is unchanged since round 16.
- Element: the header nav item "Pro". `navItemClass(active, highlight)` in `src/components/main/site-nav.tsx` renders `highlight` items in full foreground colour.
- Problem: "Pro" is the only nav item in dark text. Downloads, Documentation, Support and Roadmap are muted grey. On a page that isn't in the nav, such as /extensions or /compare/*, nothing else is marked as active, so the dark "Pro" reads as "you are here". /pro itself uses a pink pill as its real active state, which makes the two treatments easy to confuse.
- Why it costs: On /extensions it suggests I'm in the Pro section, so every card reads as part of Pro. The wayfinding cue becomes a sales nudge, which a developer weighing an open-source tool notices.
- Fix: Drop the `highlight` colour so "Pro" matches its neighbours. If it must stand out, use a small badge, not the text colour that means "active".
- Scope: ok

## Worst defect — SEO
- Page/viewport: /extensions, all viewports. facts.json counts 13 internal links, which is the header and footer only.
- Element: the 12 "Pro" badges on the extension cards (`<Badge>{t('proTag')}</Badge>`, driven by `requiresPro`). The only body links are "Documentation →" to docs.wcpos.com and "All extensions in the documentation".
- Problem: This is the page that targets card-terminal searches (title "WooCommerce POS Extensions & Card Terminals", ItemList JSON-LD). It sends every body link off-site and never links /pro, even though 12 of its 15 items need Pro. The badge is a plain span with no legend, so it also doesn't say what "Pro" means: needs WCPOS Pro, or a separate paid add-on?
- Why it costs: The strongest commercial-intent page passes no anchor text or link equity to the page that sells what it requires. For me it is a dead end: I can't see from here whether Stripe Terminal is included in the Pro licence or extra without leaving for the docs.
- Fix: Add one line under the intro: "Extensions marked Pro need <link to /pro>WCPOS Pro</link>; the rest are free." Use the existing `t.rich` tag pattern, in all locales.
- Scope: ok

## Runner-up notes (max 3 lines)
- Home "Smooth checkout flow" card still names "card readers like Stripe Terminal and SumUp" with no link to /extensions. This is the third round I have flagged it.
- The /compare/square "Pro adds" list names the Coupons screen, store-specific pricing and the extension directory, but none of these appear in /pro's "What's included" list. The two pages disagree on what Pro contains.
- The /downloads 2.0.4 release note "now lists in differs the fields that differ" lost the code formatting on `differs`, so it reads as broken English.
