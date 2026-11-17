# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into a register running on the store's own catalog, stock and prices, even offline.
Why version 2: The fold now answers it: 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 7 |

## Worst defect — Marketing
- Page/viewport: home (`/`), all viewports and locales, plus /pro.
- Element: The fold line says "New in 2.0 · Open and close your register, split payments and see today's sales — free." Lower on the same page, the feature grid has "End-of-day reports **Pro** — Generate sales reports for each shift or day. Cash up quickly, track performance." The pricing table lists "End-of-day reports" under Pro. On /pro the hero says "plus payment terminals, store management at the register, end-of-day reports" and the feature card says "End-of-Day Reports — Close the register with end-of-day summaries of sales, payments, and takings."
- Problem: The page contradicts itself. The first screen says closing the register and today's sales are free in 2.0. Three scrolls later, cashing up and shift or day reports are labelled Pro. According to the product facts, today's report on this register is free, and Pro widens it to other days, registers and stores. The Pro wording sells the free feature back to the visitor.
- Why it costs: A shop owner checking the 2.0 claim reaches the grid and can't tell what is free. That weakens the one 2.0 message the fold now delivers, and it invites "bait" complaints after install. It also makes /pro's strongest selling point look like something they already have.
- Fix: Reword the Pro reports item on home (grid and pricing list) and on /pro (hero, card and meta description) to what Pro actually adds. For example, "Reports across days, registers and stores — today's register report is free." Do this in messages/*.json.
- Scope: needs-front-desk. It changes how a feature is split between Free and Pro, which round 1 treated as pricing-adjacent. No price changes.

## Worst defect — UI
- Page/viewport: /pro (also /de/pro and /nl/pro), phone 390.
- Element: The "Get Pro" card ("Yearly $129 USD /yr · Lifetime $399 USD once · Get Started").
- Problem: On phone the buy card comes after the subtitle, the "What's included in Pro?" intro and all six feature blocks, about 1,150 CSS px down, roughly three screens. The first screen is the H1, a grey paragraph, the start of the feature list and the cookie bar. It has no price, no button and no link to the price.
- Why it costs: This is the money page, and a visitor who came from the "See Full Pricing & Features" link or a "WooCommerce POS pro pricing" search has to hunt for what they came for. Many phone visitors leave before the third screen.
- Fix: Below `lg`, put the Get Pro card right after the hero (CSS `order` on the existing grid). Alternatively, add a small "See pricing" link in the hero that jumps to the card.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, all locales.
- Element: `<title>Downloads | WCPOS</title>`, the H1 "One till, every device." and the JSON-LD, which has only `Organization` (facts.json).
- Problem: This is the page Google should rank for "WooCommerce POS app", "WCPOS download" and "WooCommerce POS for Windows/Mac/iPad". Yet the title, H1 and structured data never say "WooCommerce", "POS", "app" or a platform name. "Downloads" is a navigation label, not a query. Home already emits `SoftwareApplication`, but the page that actually carries the version (2.0.4), the operating systems and the download links has none. The meta description is fine. Round 1 fixed the same gap on /pro and noted /downloads as next.
- Why it costs: The page can only rank on brand searches. In app-download results, "Downloads | WCPOS" loses the click to a competitor whose title names the platform. Without `SoftwareApplication` (operatingSystem, softwareVersion, downloadUrl), the page can't get an app rich result either.
- Fix: Set `downloads.metadata.title` in messages/*.json to "Download the WooCommerce POS App – Windows, Mac, iOS, Android & Web | WCPOS" (localised), and add a `SoftwareApplication` JSON-LD with the operatingSystem list and the current version to the downloads page.
- Scope: ok

## Runner-up notes (max 3 lines)
- Home still renders two identical H1s and duplicate story H2s in every locale (pinned and static ScrollStory both in the DOM). The fold mockup still shows "TAP TO PAY", which isn't in 2.0. Both are parked behind PR #204; fix them as soon as it lands.
- /de mobile performance is 65 (TBT 1,020 ms, LCP 4.0 s) against 92 for /. Round 1 measured 72, so it repeats and isn't noise: profile the German home bundle.
- /extensions has the title "Extensions | WCPOS" and the description "The extensions available for WCPOS…". It should target "WooCommerce POS card terminal" (Stripe, Square, SumUp…). /de's description starts "Point of Sale für" while its title uses "Kassensystem".
