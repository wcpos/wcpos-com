# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free app that turns my tablet, phone or computer into a till for my WooCommerce shop, with the same products, stock and prices, even when the internet drops.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare (hub), desktop and phone
- Element: the Square card, "Square's POS plus a sync extension, versus a register built on WooCommerce: where in-person sales are recorded, syncing, locations, offline payments, card fees, and where Square is genuinely better." The FooSales card is the same kind of list: "A one-time Pro license or a yearly subscription per store: pricing, what happens when you stop paying, Tap to Pay, offline orders, apps, and where FooSales is genuinely better."
- Problem: I reach this page from the home link "Weighing up Square or FooSales?" with exactly those two on my shortlist. Each card only lists the topics its page covers. None of them gives me the answer. The deciding facts already sit on the detail pages: Square's in-person sales don't become WooCommerce orders, and stock catches up on an hourly check. FooSales is a subscription per store and stops working if you cancel. Neither fact is on the card.
- Why it costs: I skim. A contents list makes me open and read two long pages before I learn anything, and a shop owner deciding "which one do I try this week" often stops there. The hub is the one page built for my question, and it holds back the answer.
- Fix: rewrite the first clause of each hub card (`compare.hub.*Card.description`) as the page's main verdict, taken word for word from that page's short answer or glance table. For example, Square: "Sales made in Square's POS don't become WooCommerce orders, and stock catches up on an hourly check. Here is where Square is genuinely better." Keep the "where X is genuinely better" tail.
- Scope: ok. Copy only, with every fact already published and sourced on its detail page. Keep WCPOS price or licence wording off the cards to stay clear of the pricing hold.

## Worst defect — UI
- Page/viewport: /compare/square, phone (390 px)
- Element: "The short answer". It is two unbroken paragraphs: about 110 words for WCPOS ("WCPOS is a register built on WooCommerce itself: … for a one-time payment that never switches off.") and about 90 for Square. They come after a 6-line grey hero subtitle, and the first "Try Live Demo / Download Free" buttons only appear after both paragraphs.
- Problem: on phone the first screen and a half is all prose. There is no label telling me which paragraph is about which product, so I have to read the opening words to find out. The CTA and the "At a glance" table sit about two screens down (compare-square-phone-fold.jpg, phone-full).
- Why it costs: on my phone I want to see "WCPOS vs Square" side by side at a glance. A wall of text labelled "short answer" reads as the opposite. Most skimmers will scroll past it, and on the way they also scroll past the first CTA.
- Fix: give each short-answer paragraph a small bold run-in label ("WCPOS" / "Square for WooCommerce", reusing the glance-table column headers). Below `sm`, set the hero subtitle one step smaller so the short answer starts on the first screen. Styling and markup only, shared by the seven compare pages.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, mobile Lighthouse
- Element: Lighthouse mobile performance 69 (last round 94). TBT is 1,070 ms, `bootup-time` 2.0 s and `mainthread-work-breakdown` 3.4 s, and `forced-reflow-insight` fails. Desktop is 100.
- Problem: /downloads is now the slowest of the five measured pages on mobile, slower than home. A likely contributor is `src/components/downloads/sync-diagram.tsx`. Its animation-frame loop writes `style.left`/`style.top` on every node each frame, which forces layout, and its `visible` ref starts as `true`, so the loop does DOM work before the IntersectionObserver has reported anything. Part of the drop from 94 may be run-to-run noise, but the forced-reflow audit points at real work.
- Why it costs: /downloads is the "Download Free" target from every page. Slow mobile interactivity hurts Core Web Vitals (INP) on the page that converts, and a phone visitor taps "Install the free plugin" into a busy main thread.
- Fix: move the diagram nodes with `transform: translate(…)` instead of `left`/`top`, and start `visible` as `false` so the loop only runs once the diagram is on screen. Then re-run Lighthouse mobile 3× to confirm TBT drops.
- Scope: ok

## Runner-up notes (max 3 lines)
- For a market stall I would use my phone. The home page shows "iOS Beta / Android Beta", and /downloads says "the app and the plugin must both be on 2.0", but nothing says whether the phone betas work with the 2.0 plugin (needs-front-desk: product fact).
- Home on phone, in "Built for the demands of physical retail": the "Pro" badge on "Reports across days, registers & stores" wraps onto a line of its own with "stores".
- /compare/square: the glance table lists 8 Pro terminals, but "How do card payments work?" names 6, so I wonder which is right.
