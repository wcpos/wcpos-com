# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A point of sale for WooCommerce. It turns a tablet into the shop's register and sells from the same catalog, stock and prices, even offline. It is free and open source, has been around since 2014, and 5,000+ stores use it.
Why version 2: The line above the eyebrow answers it: "New in 2.0 · Open and close your register, split payments and see today's sales — free."

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, desktop and phone, all locales. The copy is in `messages/en.json:2359`, `:2375` and `:2459`.
- Element: "every sale is a WooCommerce order, so there is nothing to sync" (The short answer), "Sells from your WooCommerce products and stock; nothing to sync" (At a glance) and "sold from one catalog with nothing to sync" (Which should you choose?).
- Problem: This was named last round and is still live. The home page's H2 is "Synced with WooCommerce. Yours, even offline.", and /downloads says "Every till in sync". This page tells the same visitor, three times, that WCPOS has nothing to sync. The intended meaning is that there is no second system to keep in step, but read literally the page denies the offline sync that the home page sells.
- Why it costs: This page ranks for "Square for WooCommerce" queries and calls itself "An Honest Comparison" in its title. A self-contradiction on the headline difference gives a sceptical shop owner, or a competitor, an easy reason to discount the whole page.
- Fix: Change the three phrases to "so there is no second system to keep in step" / "no second catalog to sync" / "with no second catalog to keep in step", and change the nine locales to match.
- Scope: ok. It narrows existing copy and adds no new claim.

## Worst defect — UI
- Page/viewport: /downloads, phone (390x844), first screen.
- Element: The six platform tiles ("macOS / Windows / Linux / iOS & iPad / Android / Web") sit above the detected-platform card that holds the "Download for macOS" button.
- Problem: The tile grid takes about 360 px of the phone fold. The detected card ("macOS Detected · Version 2.0.4") starts low on the screen, and its download button falls below the fold, under the cookie banner on every first visit. The page has already detected the device, yet the visitor has to scroll past a picker they do not need before they reach the one action the page exists for.
- Why it costs: /downloads is the conversion page and the target of every "Download Free" CTA. Most first visits come on phones, and those visitors see no download button on the first screen.
- Fix: Below `sm`, show the detected-platform card first and the tile picker after it (an `order-*` swap), or reduce the tiles to a single compact icon row on phone.
- Scope: ok. It is one component's layout, with no copy changes.

## Worst defect — SEO
- Page/viewport: The /compare hub, desktop and phone, all locales. The source is `src/app/[locale]/(main)/compare/page.tsx:95-112` and `messages/en.json:1931-1961`.
- Element: Seven cards, each with an unlinked H2 ("WCPOS vs Oliver POS", "WCPOS vs Square for WooCommerce", "WCPOS vs FooSales" …). The only link on each card is the identical anchor "Read the comparison".
- Problem: The hub is the main in-body source of internal links to the seven comparison pages; apart from it they get only the footer's generic "Compare". Every one of those hub links carries the same anchor text, "Read the comparison". The descriptive, query-matching text ("WCPOS vs Square for WooCommerce", the exact H1 and target query of each page) is printed as a plain H2 beside the link and passes nothing. Screen-reader link lists show seven identical "Read the comparison" entries, a known Lighthouse and WCAG "link purpose" weakness. The leaf pages also show no visible breadcrumb back to /compare, even though they emit `BreadcrumbList` JSON-LD.
- Why it costs: Anchor text is the strongest on-site signal for which query a page should rank for. The competitor-alternative pages target the highest-intent searches a WooCommerce shop owner makes ("Oliver POS alternative", "Square for WooCommerce vs …"), and none of them gets a keyword anchor from its own hub.
- Fix: Wrap each card's H2 text in the same `<Link href={href}>`. Alternatively, make the CTA include the title, e.g. "Read WCPOS vs Square for WooCommerce" via a `{name}` placeholder in `hub.*.cta`.
- Scope: ok. It is markup on one existing page plus an optional message key.

## Runner-up notes (max 3 lines)
- The /compare/* pages emit `BreadcrumbList` JSON-LD but show no visible breadcrumb ("Compare › WCPOS vs Square"). A shared breadcrumb above the H1 would make the markup match visible content and give the hub a link back from every leaf.
- /downloads mobile Lighthouse dropped from 98 (LCP 2.3 s) in round 14 to 94 (LCP 3.0 s) this round, after #763 changed the sync diagram. Check that the diagram is not now the LCP element or render-blocking on phone.
- The shared `SoftwareApplication` JSON-LD (`src/lib/software-application-json-ld.ts`) still has no `description` or `softwareVersion`. Adding `softwareVersion` from the 2.0.4 release that /downloads already shows would tie the structured data to 2.0.
