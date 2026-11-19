# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, plus apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /downloads, every viewport. The issue is step 2, "Pick your device", and the "Web" tile in the hero platform chooser. The source is `src/components/downloads/platforms.ts:35` (`web: … href: 'https://demo.wcpos.com/pos'`) and `downloads.platforms.web` in `messages/*.json`.
- Element: Step 2: "Web" / "Open the live demo". Hero chooser: "Web" with "No install needed" and "Open the web demo".
- Problem: This is the setup sequence ("Three steps to your first sale"), and the web register is the option most of my client's counters would use. The only Web action on the page is the public demo, though. Nothing on /downloads says that after step 1 the web register runs on my client's own WordPress site, or how to open it there. The same page already explains the architecture: "Every app connects to the free WordPress plugin", and the plugin card reads "That's the whole install". The Web path still ends on someone else's store. The site already links an installation guide (`https://docs.wcpos.com/getting-started/installation`), but not from here.
- Why it costs: Before I recommend a POS for two stores, I want to know what the cashier opens on the counter tablet. A "Web" tile that only leads to a demo makes the browser version look like a trial and not a deployment target. To find out, I have to go into the docs or ask on Discord. This is the fourth round other judges have carried this item.
- Fix: Add a second link to the Web entry in step 2 (and in the chooser panel), for example "On your own store: setup guide →" pointing to `https://docs.wcpos.com/getting-started/installation`. Keep "Open the live demo" next to it as the secondary action. One message key per locale plus one link. It names no URL path and makes no new claim.
- Scope: ok

## Worst defect — UI
- Page/viewport: /support, phone 390 and desktop 1440 (both full-page captures). The component is `src/components/support/discord-section.tsx`.
- Element: The `h-[600px]` box under "Prefer to talk to a human?" / "Open Discord". It holds the WidgetBot embed, which is about 2.8 MB according to the component's own comment.
- Problem: In both captures the box is a solid dark-grey 600 px slab with no content. On phone it takes about 480 of the page's roughly 1,240 content pixels above the footer. On desktop it fills 740 × 580 px. Above it there is also about 200 px of empty space between the Turnstile box and the H2: the chat `Section`'s bottom padding is stacked on the Discord `Section`'s top padding. Before the widget loads, or if it never does (the page's load time was 5.1–5.9 s this round, against about 1 s for the other pages), the visitor sees an empty panel. That panel is the largest element on the page. The page that is meant to help reads as broken.
- Why it costs: I come to /support with a concrete question ("which scanners?", "two stores, one licence?"). The AI box is greyed out until I tick Turnstile, and the chips look disabled. Under that sits an empty slab. Nothing on the page looks usable, so the page looks unmaintained, and that is the one impression a developer weighing long-term support can't afford to get.
- Fix: Replace the always-mounted 600 px box with a click-to-load facade. Use a short card of about 160 px that holds the existing "Open Discord" button and a "Show live chat here" button, and mount `<DiscordWidget />` only after that click. Also drop the chat section's bottom padding (or the Discord section's top padding) so the H2 sits directly under the form.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /support (all locales), every viewport.
- Element: The H1 "WooCommerce POS help & support", followed by one H2, "Prefer to talk to a human?". The only crawlable body text is the subtitle, three `<button>` example questions ("Which barcode scanners are supported?", …) and "Answered by Aide · trained on the WCPOS docs & wiki".
- Problem: The title and description target "WooCommerce POS help" and name "scanners, printers or syncing". The page body has no answer content and no in-body link to the documentation. "WCPOS docs" in the Aide line is plain text, and the example questions are buttons that only work after a Turnstile tick. The JSON-LD is only `Organization`. Search engines get a thin page whose topical terms point nowhere, and the 13 internal links are all nav and footer links.
- Why it costs: Searches like "WooCommerce POS barcode scanner" or "WCPOS receipt printer setup" are exactly how an agency developer arrives. /support is the page whose title matches those searches, but it has nothing to rank with and passes no link to the docs pages that do answer them. A visitor without JavaScript, or one who won't tick a captcha, also gets nothing.
- Fix: Under the form, add a "Popular guides" row of plain links to docs URLs the site already uses: installation (`/getting-started/installation`), barcode scanning (`/pos/product-panel/barcode-scanning`), receipts (`/receipts`), extensions (`/extensions`). Also make "WCPOS docs" in the Aide line a link to `https://docs.wcpos.com`. That is one small list component plus message keys per locale.
- Scope: ok

## Runner-up notes (max 3 lines)
- The home hardware links ("Receipt printing", "Barcode scanner support") still link nowhere. This is the seventh round. It is listed as a front-desk hold, so it is not my pick this time, but it is still the first thing I check.
- /support is the only top-level page without the closing "Ready to sell in-store" band that #839 added to /compare and /extensions. The page ends on the Discord box.
- /pro: "run several stores, each with its own address, tax rates…" next to "2 sites" still leaves a two-store client unsure whether one licence covers them (front-desk hold).
