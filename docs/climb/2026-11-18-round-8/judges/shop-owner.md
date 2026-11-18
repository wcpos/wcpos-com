# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free register app for my WooCommerce shop that runs on a tablet at the counter with the same products, stock and prices as my website, and keeps working when the internet drops.
Why version 2: In 2.0 I can open and close the register, split a payment and see today's sales, all for free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (/), desktop and phone. The whole page body, from the hero down to the closing "Ready to sell in-store with WooCommerce?" band.
- Element: The only link to the comparisons is "Compare", a small entry in the footer's PRODUCT column. Nothing above the footer mentions Square, FooSales or WooCommerce's own POS, and nothing links to /compare. The home page has 13 internal links.
- Problem: My shortlist is Square for WooCommerce, WCPOS and FooSales. The site has a sourced, dated page for each of those match-ups, and those pages tell me plainly when the other product is the better pick. That is exactly the proof I need to choose this week. But the home page never tells me those pages exist. The header has no Compare entry, and the "Start free. Upgrade when you need more." section ends at "See Full Pricing & Features" without showing how the price compares with anyone else's.
- Why it costs: Someone weighing two or three alternatives decides by comparing them. If I can't find the comparison here, I go to a review site or to Square's own page, and the site's most persuasive, most honest content never gets read by the people it was written for.
- Fix: Under the home pricing cards, next to "See Full Pricing & Features", add one line: "Weighing Square, FooSales or WooCommerce's own POS? See how WCPOS compares →", linking to /compare. Use the existing compare strings and route it through each locale's messages.
- Scope: ok (one link and one line of copy on an existing section; no claims, no prices; this is separate from the header-nav Compare entry, which is still the front desk's call)

## Worst defect — UI
- Page/viewport: /compare/square (and every /compare/* page), phone 390 px.
- Element: The first screen holds only the H1 "WCPOS vs Square for WooCommerce", a 6-line intro, and the "Who runs this comparison" card ("This page is published by kilbot, the maker of WCPOS. We obviously have a horse in this race…"), which is 8 lines on phone. "The short answer" starts below the fold, and the "At a glance" table starts about three screens down.
- Problem: I tapped through to see Square against WCPOS. My whole first screen is preamble and a disclaimer card, which is as tall as the intro. The answer and the table I came for are two scrolls away. Desktop has room for this, but on a phone the hierarchy is upside down.
- Why it costs: Phone visitors who skim decide in the first screen whether the page will answer them. A wall of caveats before any facts reads as hedging, and some will bounce before they reach the strong "every sale is a WooCommerce order" contrast.
- Fix: On phone, show "The short answer" before the disclosure card, or shrink the card to one line ("Published by the maker of WCPOS; every fact sourced and dated. How we compare →") that expands to the full text. Keep the full card where it is on desktop.
- Scope: ok (a reorder or styling change in the shared compare component; no copy changes needed)

## Worst defect — SEO
- Page/viewport: /pro, all viewports, meta description (facts.json).
- Element: "Upgrade WCPOS with Pro: terminal payments, stock and price editing, order and customer management, full reports, and priority support."
- Problem: The description never says "WooCommerce" or "POS". It also leaves out what #737 made Pro's headline feature on the page itself: more registers and multiple stores. Someone searching "WooCommerce POS multiple registers" or "multi-store WooCommerce POS" sees a snippet that doesn't match their search, and the snippet doesn't match the page's own first feature either.
- Why it costs: /pro is the page that earns money. If its search snippet leaves out the platform name and the main reason a growing shop upgrades, it gets fewer clicks from exactly those buyers. A shop with a counter and a market stall is the multi-register case.
- Fix: Rewrite it within the /compare budget (en ≤155, de–pt ≤160, ja/ko/zh ≤100), for example: "WCPOS Pro for WooCommerce POS: more registers and multiple stores, card terminals, stock and price editing, orders, customers and full reports." Do the same in each locale.
- Scope: ok (metadata only, no price or plan terms)

## Runner-up notes (max 3 lines)
- The /compare disclosure says "published by kilbot". A non-technical owner doesn't know who kilbot is, and it reads like a bot. Home already names "Paul" in a review, so a named person or "the WCPOS team" would earn more trust.
- On /downloads, the Web tile and step 2 offer only "Open the live demo". Nothing says the web register for my own shop is at my store's address once the plugin is installed.
- facts.json flags a `code` element overflowing on /downloads at phone width. It isn't visible in the fold shot, but it is worth a quick look.
