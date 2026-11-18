# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source till for my WooCommerce shop that turns a tablet into my register, using the same products, stock and prices, and it keeps going when the internet drops.
Why version 2: The red "New in 2.0" line says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (the "Get Pro" buy box)
- Element: Under "Get Started", the only nudge to try before paying is "Try the free version first — upgrade once you know it does the job". It links to /downloads (`pro/page.tsx:119`). Nowhere on /pro is there a link to the live demo. The page also never says "demo", and the only proof under the price is "5,000+ active stores".
- Problem: I'm deciding this week between Square, FooSales and this one, and the price box is where I make that call. The site already has the easiest trial I could ask for: the home page's "Try Live Demo" opens demo.wcpos.com with Pro switched on, with no install. But from the price box, "try it first" sends me to a downloads page full of WordPress plugin and desktop installers. I'm not technical, and installing a plugin on my live shop to test it is exactly the step I put off.
- Why it costs: Square and FooSales both let me poke at the app before I pay. Here, when I'm about to spend $129, the low-effort "click around first" path has disappeared, so I leave the page to "think about it", which usually means I don't come back.
- Fix: In the /pro buy box, next to "Try the free version first", add "or try the live demo", linking to the same demo URL as the home "Try Live Demo" button, in all ten locales.
- Scope: ok (one link in the existing note, pointing to an existing demo; prices and plan terms untouched)

## Worst defect — UI
- Page/viewport: /compare (hub), phone 390 px
- Element: The cards run "WCPOS vs Oliver POS", "WCPOS vs WooCommerce's official POS", "WCPOS vs Square for WooCommerce", Jovvie, Vitepos, YITH, and "WCPOS vs FooSales" comes last. Meanwhile the lead says "Sourced, dated comparisons with Square, FooSales, Oliver POS…".
- Problem: This hasn't changed since round 19. Round 19's new home line ("Weighing up Square or FooSales? See how WCPOS compares") now sends me to this hub with Square and FooSales in mind. On my phone the first card I see is Oliver, which I've never heard of. Square is about two screens down and FooSales about five, just above "More comparisons are on the way." The cards all look alike and there's no jump list, so their order is the only hierarchy on the page, and it breaks the promise of the line that brought me here.
- Why it costs: The home fix only pays off if the click lands on what it promised. As it is, I scroll past four products I didn't ask about, and the page reads like a list of filler, not an answer. Some visitors will give up before they reach FooSales.
- Fix: Reorder `COMPARISONS` in `src/app/[locale]/(main)/compare/page.tsx` to match the lead and the home line: Square, FooSales, WooCommerce's official POS, Oliver, then Jovvie, Vitepos and YITH. The ItemList JSON-LD follows the same order.
- Scope: ok (array order in one component; no copy or claim change)

## Worst defect — SEO
- Page/viewport: /compare/square (and every /compare/* page), all locales
- Element: The title "WCPOS vs Square for WooCommerce (2026) | WCPOS", the visible "Square facts verified 2026-10-06 …" and "We re-verify every quarter". facts.json lists the JSON-LD as only Organization, FAQPage and BreadcrumbList, and `grep -rln dateModified src` finds nothing.
- Problem: These pages promise freshness in the title and the body, but no machine-readable date backs that up, so search engines have to guess the date from the prose. For "Square for WooCommerce vs …" and "FooSales alternative" searches, a dated snippet is what makes a sourced comparison stand out from vendor pages and stale listicles.
- Why it costs: The main thing these pages offer, current and sourced facts, can't show in the result. The snippet may carry no date or the wrong one, and that weakens the click against Square's and FooSales' own pages.
- Fix: Add an `Article` JSON-LD node to the shared compare template, with `headline` (the H1), `datePublished` and `dateModified` (each page's existing verified date), and `author`/`publisher` pointing to the existing Organization.
- Scope: ok (metadata only; the dates already appear on the page; no new claims)

## Runner-up notes (max 3 lines)
- The home lead still says "WCPOS turns the tablet into your register". Whose tablet? It should read "your tablet" (German already says "dein Tablet").
- The ceramicist's "sell … at markets" review is the best proof for a market-stall seller like me. It sits in the home carousel only and never appears on /pro beside the price.
- /compare/square's "Choose WCPOS if:" is one 70-word sentence. Split into bullets like the "doesn't do" list, it would skim much better on a phone.
