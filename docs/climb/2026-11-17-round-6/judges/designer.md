# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns a tablet at the counter into the register for an existing WooCommerce store, with the same catalogue, stock and prices, and that keeps selling offline.
Why version 2: Opening and closing the register, split payments and today's sales are now free ("New in 2.0 · Open and close your register, split payments and see today's sales — free."). This is the smallest line of text above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (/), both viewports. This is the first section under the hero. The same line is in nl and de, through `messages/*.json` `home…platforms` / the "One POS" heading.
- Element: "One POS. Web, desktop, iOS & Android." with the five equal platform chips "Web · Windows · macOS · iOS · Android", which sit directly under the "New in 2.0" headline. The home meta description has the same problem: "…all free in WCPOS 2.0. Desktop, web and mobile apps."
- Problem: the home page presents the 2.0 features first and then shows iOS and Android as finished equals of web and desktop. The site's own /downloads page labels both "iOS & iPad Beta · Join the TestFlight beta" and "Android Beta · Join on Google Play". The iOS and Android 2.0 store apps are not out. So a visitor who reads "New in 2.0 … free" and then taps iOS expects the register and split-payment features on a phone, and does not get them.
- Why it costs: on the home page the site says more than it does on /downloads, and the visitor finds the gap one click later. For a product whose pitch is honesty ("tell you plainly", "no middleman"), a contradiction between two of its own pages costs more trust than leaving the beta label in place.
- Fix: put the existing "Beta" badge that /downloads uses on the iOS and Android chips in the home platform section. In the home meta description, change "Desktop, web and mobile apps" to "Desktop and web apps; mobile in beta", in each locale.
- Scope: ok (it reuses the site's own /downloads label and adds no claims)

## Worst defect — UI
- Page/viewport: every page at desktop width (1440). It is clearest on /support (support-desktop-fold.jpg), home, /extensions, /compare and /downloads.
- Element: the top-nav item "Pro" is always red. `src/components/main/site-header.tsx:60` sets `highlight: true`, and `site-nav.tsx:28-36` maps it to the primary red. The active item ("Support" on /support) is also red, on a red-tinted pill.
- Problem: this is still open from round 5. Red means two things in the nav: "you are here" and "please click this". On /support, "Pro" and "Support" are both red, so two items look current. On home, /extensions and /compare no item is active, so the red "Pro" reads as the current page. The red "Sign In" button sits next to it, so the bar has three competing red accents on a dark ground.
- Why it costs: the nav is the only wayfinding element on every page. When the active state is unclear, visitors lose their place. Spending the accent colour on a static link also weakens the red that the real calls to action ("Try Live Demo", "Get Started") rely on.
- Fix: in `navItemClass`, give the non-active `highlight` state a neutral, slightly heavier style (e.g. `text-foreground font-medium`), so red only ever means the current page. Do the same for the mobile-menu branch at `site-nav.tsx:166`.
- Scope: ok (class strings in one existing component)

## Worst defect — SEO
- Page/viewport: /compare/square (meta description). All eight /compare/* detail pages, in every locale, follow the same pattern.
- Element: "WCPOS and Square POS with the Square for WooCommerce extension, compared by the maker of WCPOS — where in-person sales are recorded, syncing, locations, offline payments, card fees, and when Square is the better choice." (219 characters, facts.json). The other detail pages run 188–229 characters (`messages/en.json` `compare.*.metadata.description`).
- Problem: this is still open from round 5. Search results cut a description at about 155–160 characters. The first ~60 characters repeat the title ("WCPOS and … compared by the maker of WCPOS"), and the part that sets the page apart ("when Square is the better choice") falls after the cut.
- Why it costs: these are the site's highest-intent query pages ("wcpos vs square", "square woocommerce pos"). The search snippet is their only pitch, and right now it shows a truncated list of topics rather than the honest "when X is the better fit" angle, which is what wins a click over affiliate round-ups.
- Fix: rewrite each compare detail description to 150 characters or fewer, starting with the decision. For example: "WCPOS vs Square for WooCommerce: where in-person sales land, offline payments, card fees — and when Square is the better choice." Then trim the locales to match.
- Scope: ok (metadata copy only, no new claims)

## Runner-up notes (max 3 lines)
- /compare/square on phone: the H1 still starts about 170 px below the nav, and the hero subtitle is centred over 6 lines (compare-square-phone-fold.jpg). Left-align the subtitles of the detail pages and trim `pt` the way #727 trimmed `pb`.
- /pro on phone: the buy box is `order-first` (`pro/page.tsx:181`), so "$129 USD /yr" and "Get Started" come before any of the six Pro features. Consider putting the features first below `lg`, or a one-line feature summary above the box.
- /support has the title "Support | WCPOS" (15 characters) and a 104-character description; "WCPOS Support — WooCommerce POS help & docs" would earn the brand+support query.
