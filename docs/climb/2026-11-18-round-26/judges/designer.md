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
- Problem: The visual weight is on step 2. The app is a client and does nothing until the plugin is on the store, yet the plugin gets body-size link text while the .dmg gets the page's only primary button. On phone, the plugin sentence sits at the bottom of the fold under the cookie bar, and the red button is below the fold. The real step 1 card ("Install the free plugin", with WordPress.org and .zip buttons) is about three screens further down, in "Three steps to your first sale". I named this last round and the capture is unchanged.
- Why it costs: "Download Free" is the site's main conversion path. A shop owner who follows the red button installs a desktop app that opens to a store-URL login that can't work yet. That is the worst possible first run, right after the home page promised an easy setup.
- Fix: In the download card, put an outline button "1 · Get the free plugin" directly above the red one, linking to the existing plugin target (or to the #get-started step 1 card). Prefix the red button with "2 ·". Use only copy and links already on the page.
- Scope: ok. Component styling and existing copy on an existing page, with no new claim.

## Worst defect — UI
- Page/viewport: /support, phone (390), all locales. `src/components/support/discord-section.tsx`.
- Element: "Prefer to talk to a human? / Join store owners and the team in our live Discord community." Below it is a fixed `h-[600px]` box holding the WidgetBot iframe. The phone capture shows it as a blank grey 600 px skeleton.
- Problem: On phone the only way to reach a human is a 600 px chat embed nested inside the page scroll. It is about 70% of the screen, a touch-scroll trap, and needs a Discord login inside an iframe. The subtitle says "Discord community" but isn't a link, and there is no button that opens Discord in its own app or tab. Until the 2.8 MB embed loads, the visitor sees a dead grey slab. The page also has about 180 px of empty space between the Turnstile box and this H2 (desktop and phone), so the section reads as detached.
- Why it costs: A visitor who is stuck enough to ask for a person is the one most likely to churn. On phone, where most of them arrive, they get a broken-looking grey block instead of a one-tap way into Discord. Only the footer "Discord↗" link does the job, and few people will find it.
- Fix: Add a primary "Open Discord" button under the subtitle, using the footer's existing Discord invite href. Make the embed `hidden md:block` (or `h-[420px] md:h-[600px]`). Halve the top gap of the section.
- Scope: ok. Markup and styling of one existing component, reusing an existing link, with no new claim.

## Worst defect — SEO
- Page/viewport: Home, all viewports and locales. `home.pricing.compareLine`, rendered at `src/components/home/pricing-teaser-section.tsx:151`.
- Element: "Weighing up Square or FooSales? <link>See how WCPOS compares</link>". The only link goes to /compare.
- Problem: The home page names the two comparisons that matter most, but neither name is a link. Home is still the thinnest page for internal links (13, against 19 on /compare/square and 20 on /compare). The site's most authoritative URL passes no direct equity or descriptive anchor to /compare/square or /compare/foosales, the two spokes aimed at the highest-intent queries. This is unchanged from round 25.
- Why it costs: Keyword-anchored links from the home page are the cheapest ranking signal those spokes can get, and right now they sit two clicks deep. A shop owner weighing Square also has to go through the hub and find the card again.
- Fix: Change it to "Weighing up <square>Square</square> or <foosales>FooSales</foosales>? <link>See how WCPOS compares</link>", linking the tags to /compare/square and /compare/foosales, in all ten locales.
- Scope: ok. A copy and markup change on an existing line, with no new claim.

## Runner-up notes (max 3 lines)
- /de/pro, Pro purchase card: the card says "Hol dir Pro … Wähle nur, wie lange du Updates möchtest", then switches to "Testen Sie zuerst die kostenlose Version — upgraden Sie erst, wenn sie sich bewährt hat" (`messages/de.json:483-484`). The mixed du/Sie forms of address next to "Loslegen" read as machine translation. Change both to the "du" form.
- Home "Works for stores of all kinds", phone: each testimonial card opens with a roughly 110 px coloured band that holds only an icon. That is three empty bands in a row, and they push the proof below the fold. Shrink the band to an inline icon beside the chip.
- Lighthouse mobile performance fell across the board this capture (/downloads 68 with 1.3 s TBT, / 90, /pro 87). That is most likely box noise. Rerun before acting on it.
