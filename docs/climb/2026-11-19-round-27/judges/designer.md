# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into the shop's register, selling from the same catalog, stock and prices as the online store, even offline.
Why version 2: The red "New in 2.0" line above the kicker answers it on desktop and phone: you can now open and close the register, split payments and see today's sales, free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, desktop and phone, all locales. This is where both home "Download Free" buttons land.
- Element: The detected card reads "macOS · Detected · Version 2.0.4 · Apple Silicon · .dmg" and has a full-width red "Download for macOS" button. The plugin appears only as an inline link in a grey line above it: "Every app connects to the free WordPress plugin — install it first."
- Problem: The visual weight is on the second step. The app does nothing until the plugin is on the store, yet the plugin gets body-size link text while the .dmg gets the page's only primary button. On phone, the plugin sentence sits at the bottom edge of the fold behind the cookie bar, and the red button is below the fold. The real step 1 card ("Install the free plugin", with "WordPress.org" and ".zip" buttons) is about 1,300 px further down on desktop and about three screens down on phone, under "Three steps to your first sale". This is the third round I have named it, and the capture is unchanged.
- Why it costs: "Download Free" is the site's main conversion path. A shop owner who follows the red button installs a desktop app that opens to a store-URL login that can't work yet. That is the worst possible first run, straight after a home page that promises an easy setup.
- Fix: In the download card, put an outline button "1 · Get the free plugin" directly above the red one, linking to the existing WordPress.org plugin target (or to the step 1 card). Prefix the red button with "2 ·". Use only copy and links already on the page.
- Scope: ok. Component styling and existing copy on an existing page, with no new claim.

## Worst defect — UI
- Page/viewport: /support, phone (390), all locales. `src/components/support/discord-section.tsx`.
- Element: "Prefer to talk to a human? / Join store owners and the team in our live Discord community." Below it is a fixed 600 px WidgetBot iframe. Both captures show it as a blank grey slab, and on phone it is about 70% of the screen.
- Problem: On phone, the only way to reach a person is a 600 px chat embed nested inside the page scroll. It traps touch scrolling and needs a Discord login inside an iframe. "Discord community" is not a link, and there is no button that opens Discord in its own app or tab. Until the embed loads, the visitor sees a dead grey block, which makes up most of the page's height above the footer. This is the second round, and it is unchanged.
- Why it costs: A visitor who asks for a human is the one closest to churning. On phone, they get something that looks broken instead of a one-tap way into Discord. Only the footer "Discord↗" link does the job, and few people find it.
- Fix: Add a primary "Open Discord" button under the subtitle, using the footer's existing Discord invite href. Make the embed `hidden md:block` (or `h-[420px] md:h-[600px]`).
- Scope: ok. Markup and styling of one existing component, reusing an existing link, with no new claim.

## Worst defect — SEO
- Page/viewport: /compare/square, all viewports and locales. `src/lib/compare-page-json-ld.ts:12`, plus the caption and footer strings in `messages/*.json`.
- Element: The glance caption and the page footer say "Square facts verified 2026-10-06" and "Facts about Square verified 2026-10-06". The Sources intro on the same page says "read on 2026-10-06 and checked again on 2026-11-18". The `WebPage` JSON-LD `dateModified` is `2026-10-06`, while `sitemap.ts` gives the route a `lastModified` of `2026-11-18`.
- Problem: The page sends three different freshness signals. The structured data and the two visible "verified" lines say six weeks old. The sitemap and the page's own Sources say yesterday. Search engines read `dateModified` and visible dates to decide which date to show, so the spoke most likely to rank for "Square vs WooCommerce POS" displays the older date. A visitor who reads the dates also sees the page contradict itself. That is a bad look on a page that sells itself as "sourced and dated".
- Why it costs: A comparison page's click-through depends on looking current. A stale or inconsistent date in the snippet loses clicks to fresher competitor pages, and the mismatch weakens the trust the page is built on.
- Fix: Set `COMPARE_FACTS_VERIFIED.square` to `2026-11-18`, and reword the caption and footer to "verified 2026-10-06, last checked 2026-11-18" in all ten locales. Both dates are already stated on the page. Do the same for `woocommerce-pos` if its Sources records a recheck.
- Scope: ok. A metadata field and existing dates on an existing page, with no new claim.

## Runner-up notes (max 3 lines)
- /compare/square phone: about 90 CSS px of empty space between the lede and "The short answer" (fifth round). /compare hub desktop: seven cards in one 475 px column, with about two thirds of the 1440 px width empty. A two-column grid at `lg` would halve the scroll.
- /pro feature list: headings switch case style, so "Customer-facing display" (sentence case) sits among "More Registers & Multiple Stores", "Stock & Price Editing" and others in title case, and the home feature cards are all sentence case. Pick one style; sentence case matches home.
- /de/pro purchase card still mixes "du" ("Hol dir Pro … Wähle nur") with "Sie" ("Testen Sie zuerst … upgraden Sie"). It reads as machine translation, so change both to "du".
