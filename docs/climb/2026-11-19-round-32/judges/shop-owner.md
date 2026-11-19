# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet into the till for my WooCommerce shop, with the same products, stock and prices as the website, and it keeps working when the internet drops.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare (the hub), phone and desktop
- Element: The page ends with "How these comparisons work" ("… Spot an error? Email support@wcpos.com and we will correct it and log the change.") and goes straight into the footer. The page has no "Try Live Demo" or "Download Free" button anywhere. Every other page captured this round (home, /pro, /compare/square, /downloads) closes with the dark "Ready to sell in-store with WooCommerce?" band (`CtaSection`, used at `compare/square/page.tsx:346`). The hub (`compare/page.tsx`) does not render it.
- Problem: I arrive here from the home link "Weighing up Square or FooSales? See how WCPOS compares", or from the footer "Compare" link. The page shows seven cards and a disclosure. If the card blurbs already convince me ("A one-time Pro license or a yearly subscription per store" is enough for me against FooSales), the only way forward is to open a long comparison page and scroll through it to find a button. The hub is the one page in the comparison funnel that doesn't let me try the product.
- Why it costs: This week's decision is "which one do I try?", and the hub is where someone with a shortlist lands. A page that is a dead end at the moment of decision loses the visitors who skim, and skimmers are most shop owners. It also feels unfinished next to the other pages, which all end with the same two buttons.
- Fix: Render the existing `<CtaSection />` after the "How these comparisons work" section in `src/app/[locale]/(main)/compare/page.tsx`. Use the same component and keys as the comparison pages, so no new copy is needed.
- Scope: ok (it reuses an existing component and existing strings; no new claim)

## Worst defect — UI
- Page/viewport: /compare hub and /extensions at phone width 390x844. /support has the same issue (it was deferred in round 31).
- Element: The phone heroes still use the full `spacing="hero"` padding: `compare/page.tsx:76` and `extensions/page.tsx:71`. On /compare, about 90 px of empty band sits between the nav and the 3-line H1 "Compare / WooCommerce POS / systems", and the first card's "Read the comparison →" link is cut off under the cookie bar. On /extensions, a similar band sits above "Extensions for WooCommerce POS", and about 170 px of gap follows "Extensions marked Pro need WCPOS Pro." before "Card terminals and payments". As a result, no terminal card fits completely on the first screen.
- Problem: The first phone screen of both pages is mostly heading and whitespace. Neither shows a single complete item from the list I came to see: a comparison or a card terminal. /downloads (#834), /pro (#826) and every comparison page already use the tighter phone hero, so these two pages look like they missed the tidy-up.
- Why it costs: On a phone, I decide in one screen whether to keep reading. An empty first screen on the page that answers "how does it compare to Square and FooSales?" makes the site feel slower and less finished than it is.
- Fix: Give both heroes the /downloads and /pro phone padding (`pt-10 pb-6` below `sm`, desktop unchanged), and reduce the top padding of the first /extensions section to `pt-8` on phone. Do the same for /support.
- Scope: ok (phone-breakpoint padding only on existing pages; no copy changes)

## Worst defect — SEO
- Page/viewport: /compare hub: `<title>` and the ItemList name (`compare.hub.metadata.title` in `messages/*.json`)
- Element: "Compare WooCommerce POS Systems | WCPOS" (39 characters)
- Problem: The hub is the page that should rank for "Square vs FooSales WooCommerce", "FooSales alternative" and "WooCommerce POS comparison". Its meta description names Square, FooSales and Oliver POS, but the title, which is the strongest on-page signal and the blue link in search results, names no competitor and leaves about 20 characters unused. The same string is reused as the JSON-LD ItemList name, so the generic wording appears twice.
- Why it costs: Shop owners with a shortlist search by competitor name. A generic title is less relevant to those queries and less likely to be clicked than a result that names the product they're weighing. The individual comparison pages each cover only one competitor, which leaves the hub as the only page that can match multi-competitor queries.
- Fix: Change the title to "Compare WooCommerce POS: Square, FooSales & More | WCPOS" (56 characters) and update the localized equivalents, keeping the competitor names as written. Keep within the existing `metadata-length.test.ts` bound.
- Scope: ok (one metadata field; it names competitors the page already covers)

## Runner-up notes (max 3 lines)
- Home Free card says "One register" and /pro says "it runs one register". "Unlimited devices and cashiers" appears only on the comparison pages. As a counter-plus-market-stall owner, I'd assume the stall tablet needs Pro. This is plan-terms wording, so it needs the front desk.
- The home hero says "5,000+ Active Stores", but the stats band lower down says "5,000+ Active Installations". It's the same number under two labels, which a sceptical skimmer notices (still open from round 31).
- /compare/square "The short answer" is one 90-word paragraph per product, about 13 lines on phone. Two or three short bullets per side would read faster for a skimmer.
