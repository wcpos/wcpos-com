# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet into the till for my WooCommerce shop, using the same products, stock and prices, and it keeps going when the internet drops.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare (hub) and every /compare/* page, both viewports. The "Who runs this comparison" box appears in all of them.
- Element: "This page is published by WCPOS, the makers of WooCommerce POS." On the hub it sits just below the card "WCPOS vs WooCommerce's official POS" ("Free and built into WooCommerce's mobile app…"). Source: `messages/en.json:1921`.
- Problem: My shortlist says "the WooCommerce POS app". This box is meant to tell me who I'm dealing with, and it calls WCPOS "the makers of WooCommerce POS". A few lines higher, the same page compares WCPOS with "WooCommerce's official POS" as a competitor. As a skimmer I can't tell which product on my list WCPOS is, or whether this site is WooCommerce's own. The hub lead ("written by the maker of WCPOS") and the meta descriptions ("Compared by the maker of WCPOS") already use the clear name, so only this box is off.
- Why it costs: The box exists to build trust before I read the verdicts. Instead it muddles the brand at the exact point where I'm comparing WCPOS with WooCommerce's own POS. If I think I've mixed up two products, I either lose trust ("are they passing themselves off as WooCommerce?") or I pick the wrong thing to try this week.
- Fix: Change the sentence to "This page is published by WCPOS, the makers of the WCPOS plugin and apps." to match the hub lead. Make the same edit to the `whoRuns` body in all ten locales.
- Scope: ok (one copy string, no new claim; the meaning matches wording the page already uses)

## Worst defect — UI
- Page/viewport: /pro, phone 390x844 (/de/pro and /nl/pro are the same)
- Element: the hero "WCPOS Pro for WooCommerce POS" in `<Section spacing="hero" className="pb-8 …">` (`pro/page.tsx:166`, `py-20` on phone), followed by the "Get Pro" card.
- Problem: About 85 px of empty dark space sits between the header and the H1, and about 70 px more between the subtitle and the "Get Pro" card. The first screen therefore shows the Yearly option and only the top of Lifetime. The "Get Started" button is below the fold, under the consent bar. Round 28 tightened this same hero padding on the /compare pages on phone (#823), but /pro still uses the full `hero` padding.
- Why it costs: On my phone I open Pro to check the price and the buy button. About a fifth of the first screen is blank. I have to scroll before I can see both options next to each other or tap anything, and the page feels slower to get to the point than the comparison pages I just came from.
- Fix: On the /pro hero, set the phone padding to match #823: `pt-10 pb-6 md:pt-24 md:pb-10 lg:pt-28`. Also trim the price section's phone top padding, so "Get Started" fits in the first 750 px. Keep the desktop padding as it is.
- Scope: ok (one page's section padding at one breakpoint; no copy or price change)

## Worst defect — SEO
- Page/viewport: /pro (all locales), structured data
- Element: the `SoftwareApplication` in `pro/pro-product-json-ld.tsx` has `operatingSystem: 'Windows, macOS, Linux, iOS, Android'` and no `softwareRequirements`. The shared helper `src/lib/software-application-json-ld.ts`, used by home and /downloads, says `'Windows, macOS, Linux, iOS, Android, Web'` and gives `softwareRequirements: 'WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+'`.
- Problem: The site describes the same product in two different ways. The /pro markup leaves out the web register, which the home page puts first ("Web, desktop, iOS & Android"), and it leaves out the requirement that WordPress and WooCommerce are installed. /pro is the page that carries the price `offers`, so search engines get the least complete version of the product on the page most likely to be shown for "WooCommerce POS pricing".
- Why it costs: Rich results and AI summaries take platform and requirement facts from the priced entity. A shop owner searching for a browser-based WooCommerce till can be told that Pro has no web version, and the duplicate markup that disagrees with itself weakens trust in both versions. This is the fourth round this drift has been on the carry-over list.
- Fix: In `pro-product-json-ld.tsx`, add `Web` to `operatingSystem` and set `softwareRequirements: WCPOS_SOFTWARE_REQUIREMENTS`, imported from the shared helper. Extend the existing test so that home, /downloads and /pro must give the same values.
- Scope: ok (metadata fields only; the values already appear on the site)

## Runner-up notes (max 3 lines)
- Home "Bring your own hardware" ("plug in what's already on your counter") still links nowhere. "Will my receipt printer work?" is my next question, and there's no supported-hardware link to answer it.
- For a counter plus a weekend stall, "Free forever. One register" doesn't tell me whether two devices can share that register (the comparison tables say "unlimited devices and cashiers"). This is plan-terms wording, so it's front-desk held.
- /pro has no customer quote near "Get Started". The home page's market-vendor review (a ceramicist with a lifetime Pro licence) would reassure a stall owner right at the moment of paying.
