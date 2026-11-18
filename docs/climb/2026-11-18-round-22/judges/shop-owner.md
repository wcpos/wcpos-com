# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free till app that plugs into my WooCommerce shop, so the tablet on my counter sells from the same products, stock and prices as my website, even when the internet drops.
Why version 2: You can now open and close the register, split a payment and see today's sales for free (the red "New in 2.0" line above the headline).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square, all viewports (the comparison I'd open first, since Square is on my shortlist)
- Element: the "Who runs this comparison" box says "every number is sourced and dated, we link to competitors' own pricing pages … Check everything.", and the footer says "Facts about Square verified 2026-10-06 against Square's own pages (its fees page, its pricing announcement, and its help articles…)". The page has no link to any of them. Its only outbound link is the demo (`src/app/[locale]/(main)/compare/square/page.tsx`, and there is no `square.sources` key in `messages/en.json`). FooSales, Vitepos and YITH each have a Sources list.
- Problem: The claim that decides Square vs WCPOS for me, "orders placed in Square's POS are not synced to WooCommerce", is shown as a quote from "WooCommerce's own FAQ". I'm invited to check it, but there's nothing to click. The page promises links in one box and then doesn't give them.
- Why it costs: Square is the big-name option on my list, and this page is WCPOS talking about a competitor. If I can't check the key claim in one click, I treat it as sales talk and the strongest argument for WCPOS stops counting. A promise the page breaks also makes the honest "Where Square is genuinely better" section less believable.
- Fix: Add a "Sources" section to /compare/square in the same format as the FooSales one, linking the Square for WooCommerce FAQ/docs, Square's fees page, the Square Free announcement, and the offline-payments, Tap to Pay and availability help articles the footer already names (these are existing facts and URLs, with no new claims).
- Scope: ok

## Worst defect — UI
- Page/viewport: /compare/square, phone 390x844 (the same hero layout is on the other /compare/* pages)
- Element: the hero (breadcrumb "Compare WooCommerce POS systems", H1 "WCPOS vs Square for WooCommerce", grey intro paragraph), then "The short answer"
- Problem: About 80px of blank space sits above the breadcrumb (`Section spacing="hero"`, py-20). Another roughly 90px sits between the intro and "The short answer" (hero `pb-6` plus the next section's `compact` `py-16`). On the phone fold, the answer's first line is cut off behind the cookie bar, and the fold shows no answer, no table and no button: only a title and a grey preamble.
- Why it costs: On my phone between customers I skim. The first screen says "here is how that compares" but doesn't compare anything, so I have to scroll past white space before I see a single fact. That makes a page that is actually useful feel slow and padded.
- Fix: On phone width, give the compare hero a smaller top padding (e.g. `max-sm:pt-10`) and give the short-answer section `max-sm:pt-6`, so that "The short answer" and its first sentence land inside the 844px fold.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare/square (and its six sibling /compare/* pages), all viewports
- Element: the body has no links to the other comparisons. The only route to "WCPOS vs FooSales" is the breadcrumb back to /compare or the footer "Compare" link (in-content links are only /pro, /extensions and the demo).
- Problem: The seven comparison pages are siblings that never link to each other, so each one only gets link equity from the hub and the site-wide footer. Shoppers like me with Square and FooSales on the same shortlist are exactly the people who read two of these, and the page never offers the next one.
- Why it costs: Weak internal linking among the pages that target the most valuable commercial queries ("WCPOS vs Square", "FooSales alternative"). For visitors it means an extra hop back to the hub, which loses some of them, and it lowers the pages-per-session signal on the highest-intent pages.
- Fix: Add a short "Other comparisons" row above the CTA on each /compare/* page, linking the other six with their existing card titles (reuse the hub's `COMPARISONS` list and drop the current page).
- Scope: ok

## Runner-up notes (max 3 lines)
- The home "Weighing up Square or FooSales? See how WCPOS compares" goes to the hub; linking "Square" and "FooSales" straight to /compare/square and /compare/foosales would save me a click.
- On /compare/square almost all the body copy is `text-muted-foreground` grey, and in "The short answer" the WCPOS paragraph is dark and bold while the Square one is grey. That reads as slanted on a page that sells itself as fair.
- For my weekend market stall I can't find a plain line on home saying which phone app runs at a stall today (iOS/Android are "Beta"); the market-vendor quote does the persuading on its own.
