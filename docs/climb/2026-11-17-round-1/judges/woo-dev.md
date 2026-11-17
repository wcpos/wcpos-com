# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that runs the register off your existing WooCommerce catalogue, stock and prices on a tablet, even offline.
Why version 2: not answered (nothing on the home page, fold or below, says 2.0 shipped or what changed; the only "2.0" a visitor finds is the version number on /downloads).

## Scores
| Track | Score |
|---|---|
| Marketing | 6 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro (desktop and phone), and the Pro card in "Start free. Upgrade when you need more." on the home page.
- Element: the "What's included in Pro?" list: "Payment Terminal Integration / Stock & Price Editing / Order Management / Customer Management / End-of-Day Reports / Custom Payment Gateways", next to the home Free card's "Free forever. No transaction fees. No limits."
- Problem: Multi-store is never mentioned on the page where you'd buy. The site's own compare pages (messages/en.json `proAdds`, the Oliver FAQ "Multi-store management is a core WCPOS Pro feature: per-store addresses, tax rates, receipt templates, pricing, and authorized users", and the About copy "card readers, refunds at the till, end-of-day reports, multi-store") list multi-store management, more registers and store-specific pricing as Pro features. /pro and the home Pro card leave all three out, and the home Free card says "No limits".
- Why it costs: My client has two stores, so this is the first thing I check. On /pro I can't tell whether two stores (with their own tax rates, addresses and receipts) need Pro, or whether Free's "No limits" covers it. The license FAQ ("2 sites … one live site and one development site") makes it murkier still. Either I dig through competitor comparison pages to find the answer, or I book the sales call the site should have saved me. Leaving out the feature that matters most to multi-location shops also undersells Pro.
- Fix: Add a "Multi-store management" item to the /pro feature list and the home Pro card. Reuse the compare-page wording (per-store addresses, tax rates, receipt templates, pricing, users; more registers). Change "No limits" to "No product or order limits" so it no longer clashes with Pro's register and store features.
- Scope: ok (the claim is already on the site; no price or licence change)

## Worst defect — UI
- Page/viewport: /pro, desktop 1440x900 (and the German /de/pro on phone).
- Element: the hero "WCPOS Pro" + "Everything in the free POS, plus payment terminals…" followed by ~190px of empty band before "What's included in Pro?" and the "Get Pro" card.
- Problem: The first screen is a centred title, one grey sentence and blank space. The price card starts at y≈500 and the "Get Started" button is below the fold, under the cookie bar. On the German phone page the heading, intro and cookie bar fill the whole first screen, and the first Pro feature only appears after a scroll.
- Why it costs: This is the conversion page, and the first screen shows neither what Pro costs nor a button. A visitor comparing options has to scroll to learn there is a $129 / $399 choice. The empty band reads as a page that hasn't finished loading.
- Fix: Cut the hero's vertical padding on /pro (`spacing` of the hero Section) so the "Get Pro" card and its "Get Started" button sit inside the 900px fold on desktop.
- Scope: ok

## Worst defect — SEO
- Page/viewport: / (and every locale home, e.g. /de, /nl), both viewports.
- Element: H1 "Your WooCommerce store, at the counter." appears twice in the DOM. Every scroll-story H2 is also doubled ("One POS. Web, desktop, iOS & Android.", "Works with the equipment you already have.", "Synced with WooCommerce. Yours, even offline.") (facts.json home-desktop/home-phone h1/h2).
- Problem: `scroll-story.tsx` renders the animated desktop story (`hidden md:block`) and the stacked `StoryStatic` (`md:hidden`). Both are in the HTML, so the page ships two H1s and duplicate H2s. The desktop text capture also shows two full fake POS screens ("POS — US Store R1/R2 … Charge $69") of crawlable product text ahead of the real H1.
- Why it costs: Two identical H1s plus a block of mock catalogue text ("Tote Bag $29, Candle $24…") before the real copy weakens the home page's topical signal for "WooCommerce POS". The demo text dilutes what Google takes the page to be about. Lighthouse SEO 100 doesn't check for this.
- Fix: Keep one H1 (render the copy once, or make the hidden variant's heading a non-heading element with `aria-hidden` on the duplicate). Mark the mock POS screens `aria-hidden`/`data-nosnippet` so they don't count as page text.
- Scope: ok

## Runner-up notes (max 3 lines)
- The home page never says WCPOS 2.0 is out (shipped 9 Nov 2026). Add one line or badge to the hero ("WCPOS 2.0 is here: plugin, desktop and web") linking to the changelog.
- The home phone scroll-story mockup shows a "TAP TO PAY" label, and Tap to Pay is not in 2.0. "Internet drops? Keep selling" and the Free card's "Offline mode" also overstate things, because checkout needs a connection.
- Licence FAQ "2 sites … one live site and one development site" doesn't say how a client with two separate WooCommerce sites should license. A one-line answer would save the sales question.
