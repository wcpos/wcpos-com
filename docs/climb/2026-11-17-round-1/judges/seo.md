# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point-of-sale plugin for WooCommerce that turns a tablet into a register selling from the same catalog, stock and prices as the online store.
Why version 2: not answered

## Scores
| Track | Score |
|---|---|
| Marketing | 6 |
| UI | 7 |
| SEO | 7 |

## Worst defect — Marketing
- Page/viewport: home (`/`), desktop and phone, all locales
- Element: hero block "POINT OF SALE FOR WOOCOMMERCE / Your WooCommerce store, at the counter. / WCPOS turns the tablet into your register — same catalog, same stock, same prices, even offline." Nothing on the home page says "2.0" (text/home.txt has no match for 2.0 or "version 2").
- Problem: WCPOS 2.0 shipped on 9 Nov 2026, but the home page doesn't mention it anywhere: not in the fold, the badges ("5,000+ Active Stores · Free & Open Source · Since 2014"), the feature grid or the meta description. The only places that describe what 2.0 adds are deep pages: /compare/square ("WCPOS 2.0 has its own checkout… split one order across several payments", "Since 2.0, the free version also includes one register with an opening float… numbered closures… Reports screen") and the version numbers on /downloads.
- Why it costs: A returning user or a shop owner who heard about the release gets no sign that anything changed, so the release does nothing for conversion. It also gives the home page no fresh "WooCommerce POS 2.0" text for searchers to find.
- Fix: Add a small "New in WCPOS 2.0" line or badge above the H1, or as a fourth hero badge. It should name 2.0 features the site already states (built-in checkout with split payments; a free register with float, cash in/out and closing count) and link to /changelog or the release notes.
- Scope: ok (2.0 is released and the claims already appear on the site; this adds no new feature claims)

## Worst defect — UI
- Page/viewport: /pro (and /de/pro, /nl/pro), phone 390 and desktop 1440
- Element: the hero "WCPOS Pro / Everything in the free POS, plus payment terminals…", followed by a large empty band before "What's included in Pro?"
- Problem: The hero is a `Section spacing="hero"` and the next section adds its own top padding. The result is a blank band of about 180px on desktop and about 250px on phone. On phone the first screen shows only the H1, a grey paragraph and white space: no price, no "Get Pro" button and no feature. On desktop the price card starts at y≈500 and its buy button is cut off by the fold.
- Why it costs: This is the money page, and the first screen has no price and no buy button. Visitors have to scroll past empty space to reach the buy box, and the page looks unfinished.
- Fix: Use the compact/default spacing on the Pro hero section, or drop its bottom padding, so "What's included" and the Get Pro card start right under the subtitle.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro (all locales). The same pattern is on /downloads.
- Element: `<title>Pro - Premium Features | WCPOS</title>` and `<h1>WCPOS Pro</h1>`. /downloads has `<title>Downloads | WCPOS</title>` and the H1 "One till, every device."
- Problem: The Pro title and H1 never say "WooCommerce" or "POS" except inside the brand name. "Premium Features" is a generic phrase nobody searches for. This is the commercial page for queries like "WooCommerce POS pro", "WooCommerce POS card terminal" and "WooCommerce POS Stripe Terminal", but its strongest on-page signals target only the brand. The home and /compare titles do target "Point of Sale for WooCommerce" and "WooCommerce POS", so the gap is specific to these pages.
- Why it costs: Without the query terms in the title and H1, /pro can only rank for searches that include "WCPOS". In results, "Pro - Premium Features" tells a shop owner nothing about card terminals or WooCommerce, which hurts click-through.
- Fix: Change `pro.metadata.title` in messages/*.json to something like "WCPOS Pro – WooCommerce POS with Card Terminals & Reports", and give the H1 or subtitle the phrase "WooCommerce POS" (for example "WCPOS Pro: the full WooCommerce POS"). Do the same for /downloads, e.g. "Download WCPOS – WooCommerce POS for Web, Windows, macOS, iOS & Android".
- Scope: ok

## Runner-up notes (max 3 lines)
- The home page renders two `<h1>` elements and each story H2 twice in every locale, because the pinned and static ScrollStory variants are both in the DOM, hidden only by CSS (scroll-story.tsx:281–285). Give only one variant semantic headings.
- Offline and Tap to Pay claims contradict the 2.0 facts. The home meta description says "sell offline", act 4 says "Internet drops? Keep selling", and the hero device mockup shows a "TAP TO PAY" label, but checkout needs connectivity and Tap to Pay is not in 2.0. Separately, home says "$129/year" while /compare/square says it "never auto-renews" (wording only, so it needs the front desk).
- On mobile, /de scores 72 for performance (TBT 850 ms) while the same page in English scores 92 (TBT 130 ms). Re-run Lighthouse to rule out noise; if it repeats, profile the German bundle.
