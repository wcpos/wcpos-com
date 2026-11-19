# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source register app that sells from my existing WooCommerce catalog on a tablet, phone or computer, and keeps working offline.
Why version 2: It adds register open/close, split payments and today's sales for free. I can see it, but Square, FooSales and Woo's own POS already treat those as table stakes, so it reads as catching up more than as a reason to switch.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (/), desktop and phone fold; also /pro (desktop and phone), and the nl/de equivalents
- Element: hero proof chip "5,000+ Active Stores" (`home…b1`). The same claim appears on /pro as "5,000+ active stores" (`proof`) and in the Oliver comparison as "5,000+ active stores run WCPOS according to WordPress.org".
- Problem: The source is WordPress.org, which counts active *installations*. The site says so itself further down the same home page ("5,000+ Active Installations") and in every comparison table ("5,000+ active installs, 3.7 stars (81 reviews)"). Installs include staging and dev sites, and Pro's own FAQ says each license is meant for "one live site and one development site". So "stores" inflates the only usage number on the page, and the page contradicts it a few screens later.
- Why it costs: A buyer comparing POS options checks the WordPress.org listing first. When the headline proof number turns out to be relabelled, every other claim gets discounted, including the "Who runs this comparison… check everything" promise on /compare. It is the cheapest credibility loss on the site and sits right in the fold.
- Fix: Change the chip to "5,000+ active installs" (home b1, /pro proof, Oliver FAQ response, and the nl/de/etc. strings) so it matches the stats block and the comparison tables.
- Scope: ok (copy only; same number, accurate label)

## Worst defect — UI
- Page/viewport: /compare/square, phone (390px), "At a glance" table
- Element: the WCPOS "Card payments" cell: "Free: cash, and card sales taken on your own standalone terminal, recorded on the order. Pro terminal integrations: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Mercado Pago, PayArc, Windcave; Vipps MobilePay by QR code or push"
- Problem: On a phone the glance table keeps two half-width columns (about 140px each). This cell wraps to about 12 lines, while Square's cell is 3 ("Square payments, including Tap to Pay on iPhone and Android"). Offline (8 lines vs 4), Price (6 vs 2) and Devices (7 vs 5) show the same lopsided pattern. The "glance" turns into a scroll, and WCPOS looks like the option buried in caveats. The list also disagrees with the prose below it, which names six integrations and leaves out Mercado Pago, PayArc and Windcave.
- Why it costs: The glance table is where a switcher decides. Visually, the WCPOS column reads as "it's complicated" and Square's as "it just works", which is the opposite of what the page argues.
- Fix: Below `sm`, stack each glance row (label, then WCPOS full width, then Square full width). Shorten the Card payments cell to "Free: cash and your own standalone terminal. Pro: 8 terminal integrations incl. Stripe Terminal, SumUp and Square Terminal", with the full list kept in "How do card payments work?" (and matched there).
- Scope: ok (one component's responsive styling plus one copy cell; no new claims)

## Worst defect — SEO
- Page/viewport: /downloads, Lighthouse mobile
- Element: page performance 69. Total blocking time 1,070 ms, main-thread work 3.4 s, JS bootup 2.0 s, forced-reflow audit failing. Every other audited page scores 78–100 on mobile.
- Problem: The page that turns interest into installs is the slowest on mobile. The likely cost is the two motion/react client components that hydrate on load: the orbiting "How it fits together" sync diagram (rAF loop and getBoundingClientRect) and the scroll-linked "Three steps" circles. The diagram already skips frames off-screen, but its JS still boots up front. The exact split is not proven from the captures.
- Why it costs: Core Web Vitals (INP/TBT) feed mobile ranking for "download WooCommerce POS" queries. A phone visitor who taps "Download" meets a janky page at the moment of commitment.
- Fix: Render the sync diagram and step circles as static markup first and load the motion versions via `next/dynamic` when they scroll into view, or on idle. Re-run Lighthouse mobile on /downloads and aim for TBT under 300 ms.
- Scope: ok (two components on an existing page; no visual redesign)

## Runner-up notes (max 3 lines)
- Home "Built for the demands of physical retail": 4 of 6 cards carry a Pro badge, so the free product's showcase mostly sells Pro. A sceptic reads that as "free is a demo".
- /compare/square "Where Square is genuinely better" opens with "Square Free ($0/month)… WCPOS Pro costs $129 or more" but leaves out that WCPOS Free is also $0 with no card fees. This touches price wording, so needs-front-desk.
- Home meta description says "free" twice ("Free, open-source… free in 2.0") and "Sell offline" without the cash/standalone-terminal limit that every other page states.
