# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns a tablet at the counter into the register for your existing WooCommerce store, with the same catalogue, stock and prices, and keeps working offline.
Why version 2: Opening and closing the register, split payments and today's sales are now free ("New in 2.0 · Open and close your register, split payments and see today's sales — free.").

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square at both viewports. The other seven /compare/* detail pages share the layout and have the same gap.
- Element: the page body ends "Which should you choose?" → "Choose WCPOS if: …" → "Frequently asked questions" → "Spot an error? Email support@wcpos.com …" → footer. The only next step in the body is a plain sentence in "What does it cost?": "Try everything first at demo.wcpos.com/pos (login demo / demo)." (text/compare-square.txt line 56). The page has no "Try Live Demo" or "Download Free" button anywhere. The only "Live Demo" is in the footer.
- Problem: this was named last round and is still open. A reader who reaches "Choose WCPOS if" and agrees has no button to act on. Home, /pro and /downloads all end on a clear red and dark button pair. The comparison pages are the only marketing pages that convince and then stop.
- Why it costs: "WCPOS vs Square" visitors have the highest intent on the site, because they are already choosing. The page wins the argument and then gives them a footer, so conversions are lost exactly where they are easiest to get.
- Fix: put the existing home `CtaSection` (Try Live Demo / Download Free, already translated in every locale) after the FAQ in the shared compare detail layout. Optionally, also add the same button pair inside the "Choose WCPOS if" card.
- Scope: ok (reuses an existing component and existing copy; makes no new claims)

## Worst defect — UI
- Page/viewport: every page at desktop width (1440). It is clearest on /support, home, /extensions and /compare.
- Element: the top nav item "Pro" is always red. `site-header.tsx:60` sets `highlight: true`, and `site-nav.tsx:28-36` maps it to `text-primary`. The active item uses `text-wcpos-red-accent` on a red-tinted pill, which is almost the same red.
- Problem: the nav uses one colour for two meanings: "you are here" and "we'd like you to click this". On /support (support-desktop-full.jpg), "Pro" and "Support" are both red, so two items look current. On home, /extensions and /compare no item is active, so the red "Pro" reads as the current page. The red Sign In button sits next to it, so the bar has three red accents competing on a dark ground.
- Why it costs: the nav is the main wayfinding element on every desktop page. When the active state is unclear, visitors lose track of where they are, and the CTA colour is spread so thin that the real calls to action stand out less. It also looks unresolved, which a product designer notices before reading any copy.
- Fix: in `navItemClass`, make the non-active `highlight` style neutral and slightly heavier (for example `text-foreground font-medium`), so red only ever means the current page. If "Pro" should still stand out, give it a small "Pro" badge instead of a text colour.
- Scope: ok (one class string in an existing component)

## Worst defect — SEO
- Page/viewport: /compare/square (meta description). All eight /compare/* detail pages have the same pattern.
- Element: meta description "WCPOS and Square POS with the Square for WooCommerce extension, compared by the maker of WCPOS — where in-person sales are recorded, syncing, locations, offline payments, card fees, and when Square is the better choice." The description is 219 characters. The other detail pages are 188–229 (oliver 199, woocommerce 188, jovvie 192, vitepos 198, yith 195, foosales 229; `messages/en.json` `compare.*.metadata.description`).
- Problem: search results cut a description at about 155–160 characters. Each description also spends its first 35–60 characters on "WCPOS and X … compared by the maker of WCPOS", which repeats the title. The part that sets these pages apart ("when Square is the better choice", offline payments, card fees) falls after the cut.
- Why it costs: these are the site's high-intent query pages ("wcpos vs square", "square woocommerce pos"). The snippet is the only pitch shown in search results, and right now it shows a cut-off list of topics. The honest "when X is the better fit" angle, which is what earns a click away from affiliate roundups, never appears.
- Fix: rewrite each compare detail description to 150 characters or fewer, leading with the decision. For example: "WCPOS vs Square for WooCommerce: where in-person sales land, sync, offline payments, card fees — and when Square is the better choice." Keep the maker disclosure on the page, where the "Who runs this comparison" card already shows it.
- Scope: ok (metadata copy only, no new claims; locales need the same trim)

## Runner-up notes (max 3 lines)
- /compare/square on phone still has about 85 px of doubled padding between the hero and the disclosure card. The round-4 fix (#722) reached only the hub, so the detail pages need the same `pb`/`pt` trim. Hero subtitles on these pages run 232–425 characters and are centred over 6–9 lines, so they should be left-aligned or cut down.
- /extensions on desktop: Windcave's "Pro" badge still drops onto its own line. The doc links repeat the full extension name ("Mercado Pago Terminal for WooCommerce documentation"), so arrows end up in different places from card to card. Use "Documentation →" for every card.
- On /support, the Turnstile box shows in captures as a square grey #333 panel and the "Ask" button looks disabled. A real visitor only sees this when challenged (`appearance: 'interaction-only'`), so it is not counted, but a `theme: 'dark'` option would match the page when it does appear.
