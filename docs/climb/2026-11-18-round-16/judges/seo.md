# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce. It turns a tablet into the shop's register, sells from the same catalog, stock and prices, and keeps working offline. It has been around since 2014 and runs in 5,000+ stores.
Why version 2: The line above the eyebrow answers it: "New in 2.0 · Open and close your register, split payments and see today's sales — free."

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, step 3 card, desktop and phone, all locales.
- Element: "Want more? Go Pro — A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." and "Unlock the full till — Payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: The Pro card lists plain "Payments" first among the things Pro unlocks. The home page's Free column lists "Cash or card on your own terminal" and "Split payments", and the same /downloads page says cash and Card-tender sales complete offline for free. Only integrated card readers are Pro. A visitor on the conversion page reads that taking payments needs a paid licence. This was named last round and is still live.
- Why it costs: "Do I have to pay to take payments?" is the first doubt a shop owner has about a free POS. Answering it wrongly on the download page, just before they install, either scares off a free user or sets up a refund request from someone who bought Pro for something Free already does.
- Fix: Change "Payments" to "Card-reader payments" in the `downloads` step-3 list. "terminal payments" in the line above is already accurate. Update all ten locales.
- Scope: ok. It narrows existing copy and adds no new claim.

## Worst defect — UI
- Page/viewport: /downloads, phone (390x844), first screen.
- Element: The six platform tiles ("macOS / Windows / Linux / iOS & iPad / Android / Web") sit above the "macOS Detected · Version 2.0.4" card that holds the "Download for macOS" button.
- Problem: The tile grid fills about 360 px of the phone fold. The detected card starts at about y=1120 of 1688 (device pixels), and its download button is below the fold and under the cookie banner. The page has already detected the device, yet the visitor has to scroll past a picker they do not need to reach the one action the page exists for. The capture is unchanged from round 15.
- Why it costs: /downloads is the target of every "Download Free" CTA on the site. On phone, the first screen shows a heading, a tagline and a picker, but no download.
- Fix: Below `sm`, put the detected-platform card before the tile picker (an `order-*` swap in the downloads hero), or shrink the tiles to one compact icon row on phone.
- Scope: ok. It is one component's layout, with no copy changes.

## Worst defect — SEO
- Page/viewport: The /compare hub, desktop and phone, all locales. The source is `src/app/[locale]/(main)/compare/page.tsx:97-112` and `messages/en.json:1931-1963` (`hub.*.cta`).
- Element: Seven cards. Each has an unlinked H2 ("WCPOS vs Oliver POS", "WCPOS vs Square for WooCommerce", "WCPOS vs FooSales" …) and one link, always with the same anchor: "Read the comparison".
- Problem: The hub is the only in-body page that links to the seven comparison pages. Every one of its links carries the same generic anchor. The query-matching text, which is each leaf's exact H1 and target query, is printed as a plain H2 that passes nothing. In a screen reader's link list the seven entries are indistinguishable. Round 15's breadcrumb fixed the link from each leaf up to the hub, but not the link from the hub down to each leaf. This was named last round and is still live.
- Why it costs: Anchor text is the strongest on-site signal for which query a page should rank for. These are the highest-intent searches a WooCommerce shop owner makes ("Square for WooCommerce vs", "Oliver POS alternative", "FooSales alternative"), and none of the seven pages gets a keyword anchor from its own hub.
- Fix: Wrap each card's H2 text in the same `<Link href={href}>`, styled as a heading link. Alternatively, make the CTA name its target, e.g. "Read WCPOS vs Square for WooCommerce" through a `{name}` placeholder in `hub.*.cta`.
- Scope: ok. It is markup on one existing page, plus an optional message key.

## Runner-up notes (max 3 lines)
- The /pro `<title>` promises "Pricing", but the pricing block ("Get Pro" / "Hol dir Pro") is not a heading in the outline. The page has only two H2s, so the price section has no H2 that a search engine or skim reader can find.
- The shared `SoftwareApplication` JSON-LD still has no `softwareVersion` or `description`. Adding `softwareVersion: "2.0.4"`, from the release /downloads already shows, would tie the structured data to 2.0.
- On the home page, the "Works with the equipment you already have" section and "Pro connects card readers like Stripe Terminal and SumUp" do not link to /extensions, the page that targets "WooCommerce POS card terminals".
