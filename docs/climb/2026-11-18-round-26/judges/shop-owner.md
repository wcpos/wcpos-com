# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free point-of-sale add-on that turns a tablet into a till for my WooCommerce shop, using the same products, stock and prices, and it keeps working offline.
Why version 2: In 2.0 I can open and close the register, split a payment and see today's sales, all free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /compare/square and /compare/foosales (both viewports). The same sentence is on /compare/vitepos; /compare/yith-pos and /compare/woocommerce-pos have a variant.
- Element: "Where Square is genuinely better" → "WCPOS keeps taking cash sales offline, but connected card readers need a connection." On FooSales: "WCPOS keeps taking cash sales offline, but connected card readers and online gateways need a connection."
- Problem: The same page's "At a glance" table and its FAQ say WCPOS completes "cash sales or sales on a separate card terminal offline", and /downloads says the same. The "genuinely better" bullet is the part a skimmer reads, and it shrinks that to cash only. It contradicts the page's own table and undersells 2.0. In 2.0, Card-tender sales on an external terminal do complete offline.
- Why it costs: My weekend market stall has patchy signal, so "can I still take cards at the stall?" is the question that decides between WCPOS, Square and FooSales. On both of my shortlisted comparisons, the honest-trade-offs section tells me WCPOS is cash-only offline, so I'd lean towards Square or FooSales. The page also looks careless when its table says something different.
- Fix: In messages/*.json, change these offline bullets (compare square, foosales and vitepos `offline`, plus the yith-pos subtitle and the woocommerce-pos "choose" body) to "WCPOS keeps taking cash sales and sales on a separate card terminal offline, but connected card readers (and online gateways) need a connection." This matches the table wording already on each page.
- Scope: ok (it repeats a claim already on the same pages and in the product facts; no new claim)

## Worst defect — UI
- Page/viewport: every page at phone width (390x844). Worst on /pro, where it hides the pricing card.
- Element: the consent banner "We use an anonymous analytics cookie to understand how the site is used. No ads, no third-party tracking. Privacy policy" with Decline and Accept (`src/components/consent/consent-banner.tsx`, `flex-col` below `sm`).
- Problem: On phone the banner stacks three lines of text above a separate row of buttons, about 270px of the 844px screen (around a third of what's left under the header). On /pro it covers the Lifetime $399 option and the "Get Started" button in the first screen. On /compare/square it cuts the "short answer" off mid-sentence.
- Why it costs: When I open the Pro page on my phone, the price choice and the button to buy are under a cookie notice. A first visitor sees a third of each first screen taken up by it, and the page feels cramped and slower to take in.
- Fix: Compact the banner below `sm`: `text-xs`, `p-3`, and put Decline and Accept on the same row as a two-line message (or drop "No ads, no third-party tracking." on narrow screens), for a height of about 110px or less.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, mobile Lighthouse.
- Element: the "How it fits together" sync diagram (`src/components/downloads/sync-diagram.tsx`, `useAnimationFrame` drift loop) together with the scroll-driven `GetStartedSteps` motion.
- Problem: Mobile performance is 68, the lowest of every audited page outside the blocked /de. Total blocking time is 1,310 ms, main-thread work 3.9 s, bootup 2.4 s and max potential FID 640 ms; /compare scores 97 and /pro 87. The diagram runs an endless JavaScript animation loop on every frame with no in-view gate, so it uses the main thread even while the visitor is reading the download card at the top.
- Why it costs: /downloads is where a convinced visitor goes to act, and it ranks for "download WooCommerce POS". A TBT this high is a Core Web Vitals (INP) risk on the conversion page, and on a mid-range phone the page feels sticky at the moment I'm trying to tap "Download".
- Fix: Start the diagram's rAF loop only while it is in view (IntersectionObserver or motion's `useInView`, and return early when not visible), or replace the drift with a CSS keyframe animation. Lazy-load the diagram below the fold.
- Scope: ok

## Runner-up notes (max 3 lines)
- /compare/square (phone): the demo login "demo.wcpos.com/pos (login demo / demo)" sits in the middle of a paragraph, and the first button to act on is at the very bottom of a 27,000px page. A "Try the live demo" button after "Which should you choose?" would help a skimmer.
- /pro: the proof is only "5,000+ active stores". The market-vendor review from the home page (ceramicist, lifetime Pro) would reassure a stall owner right where they're deciding to pay.
- /downloads (phone): the test browser, which reported as a Mac, was shown "macOS Detected" at 390px; a real phone visitor should be offered the web app or iOS first. Worth confirming that detection uses the phone's own user agent.
