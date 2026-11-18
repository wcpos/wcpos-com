# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source register that runs off my WooCommerce shop on the tablet at my counter, with the same products, stock and prices, and it keeps going offline.
Why version 2: Opening and closing the register, split payments and today's sales are now free (the "New in 2.0" line above the headline).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: / (home), under the Free/Pro pricing cards, desktop and phone, all locales (`messages/*.json` `compareLine`, rendered in `src/components/home/pricing-teaser-section.tsx:151`)
- Element: "Weighing up Square or FooSales? See how WCPOS compares"
- Problem: This line names the two rivals on my shortlist, which is exactly my question. But "Square" and "FooSales" are plain text, and the only link goes to the generic /compare hub. To get my answer I have to click through to the hub, scroll past the hub's intro, find the right card and click again. On top of that, the line is small, muted `text-sm` under the "See Full Pricing & Features" button, so it's easy to miss. The site already has the two pages I want, /compare/square and /compare/foosales, two clicks away.
- Why it costs: This is the moment I'm deciding which of three to try this week. Every extra hop is a chance I close the tab and go to Square's own page instead. I named this as a runner-up in round 24 and it is still the same.
- Fix: Make "Square" link to /compare/square and "FooSales" to /compare/foosales (two more rich-text tags in `compareLine`, all 10 locales), and keep "See how WCPOS compares" pointing at the hub.
- Scope: ok (markup and links only; no new claim, no price wording)

## Worst defect — UI
- Page/viewport: /compare/square, phone 390x844 (same `Section` pattern on the other six /compare/* spokes)
- Element: the empty band between the hero lead ("…and when Square is the better choice.") and the "The short answer" H2
- Problem: The hero `Section` uses `spacing="hero"` (`py-20`, 80 px above the breadcrumb), with `pb-6` below. The short-answer `Section` then adds `spacing="compact"` (`pt-16`, 64 px). The phone fold shot shows about 90 px of empty dark space above the breadcrumb and about 190 px between the lead and "The short answer". As a result, the first screen holds only the breadcrumb, the title and a six-line grey intro. The answer starts at the very bottom of the screen, and the cookie bar covers it.
- Why it costs: I came for the answer, and the page labels it as one. On my phone I see none of it without scrolling, on a page that runs to about a dozen phone screens. This is the third round I've named it, and it is still unfixed (it was deferred in round 24).
- Fix: In `src/app/[locale]/(main)/compare/square/page.tsx` (and the six sibling spokes), add `max-sm:pt-10` to the hero `Section` and `max-sm:pt-4` to the short-answer `Section`.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro, all locales, in the head (`src/app/[locale]/(main)/pro/pro-product-json-ld.tsx:49`)
- Element: `operatingSystem: 'Windows, macOS, Linux, iOS, Android'`
- Problem: The /pro SoftwareApplication, which is the one that carries the Pro Offers, leaves out Web. The home and /downloads SoftwareApplication (`src/lib/software-application-json-ld.ts:14`) list "…, Android, Web", and that one has a test for it. The pages themselves sell the browser register too ("One POS. Web, desktop, iOS & Android."; the Web tile on /downloads). So two of the site's own schema blocks disagree about the same product, and the paid one leaves out the platform that needs no install. It has been deferred since round 23.
- Why it costs: It's a small one, but /pro is the page that has prices in its structured data. A search engine that reads the platforms from the markup sees a product that doesn't run in a browser, which is the easiest way to start for someone like me. I didn't find a larger SEO defect outside the blocked list: titles, canonicals, hreflang (11), lengths and Lighthouse SEO are all clean.
- Fix: Use the shared value (export the `operatingSystem` string from `software-application-json-ld.ts` and reuse it in `pro-product-json-ld.tsx`), and extend the existing test to the /pro block.
- Scope: ok

## Runner-up notes (max 3 lines)
- Counter plus market stall: the Free card says "One register", while act 1 says "the tablet at the counter, the phone on the shop floor" and /compare/square says "unlimited devices and cashiers". I can't tell whether my stall needs Pro. needs-front-desk (plan-term wording).
- Home act 3b "Internet drops? Keep selling" has no card-reader caveat, which matters at a market stall with weak signal; /downloads and /compare/square do give one. needs-front-desk (the offline-qualifier hold).
- /compare/square Sources says "checked again on 2026-11-18", but the "At a glance" note, the footer and `dateModified` all say 2026-10-06. That's a mixed freshness signal; one date should win.
