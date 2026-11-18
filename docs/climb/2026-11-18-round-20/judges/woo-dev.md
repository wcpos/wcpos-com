# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, with apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports and locales. The first feature card, and the FAQ "How many sites can I use my license on?".
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." Later on the page: "Each license can be activated on 2 sites, intended for one live site and one development site."
- Problem: This is still unanswered after rounds 13–19. My client has two stores, and nothing on /pro says whether a Pro "store" is a location inside one WooCommerce site or a separate WooCommerce install. It also doesn't say whether the stores share one product list and stock pool. Other pages only hint at the answer: /compare/square says "Multiple stores / locations: Yes (Pro)", and the /extensions ATUM card says "linking inventory locations to POS stores". Read next to "2 sites = live + dev", the /pro page suggests two shops need two licences.
- Why it costs: This one fact decides both the quote (one licence or two) and the build (one site or two). Without it I have to email before I can recommend WCPOS, which is the sales call the site is meant to replace.
- Fix: Add one sentence to the card body, in all locales: "Stores are locations inside one WooCommerce site and sell from its products; per-location stock comes with the ATUM extension." Link "ATUM extension" to /extensions. Source: wiki `product/features/pro-and-add-ons.md`, the multi-store line ("store locations") and the ATUM add-on line.
- Scope: needs-front-desk (held as a product-fact and licence question since round 19. The location fact is in the wiki. Any sentence about the licence consequence is for the front desk to word.)

## Worst defect — UI
- Page/viewport: /support, phone 390 (and desktop until the Turnstile check completes). Visible in the phone fold.
- Element: The ask box placeholder "e.g. How do I connect a receipt printe", cut off before the "Ask" button. The "Ask" button and the three suggestion chips ("How many sites can I use my licence on?", "Which barcode scanners are supported?", "How do I sync products from WooCommerce?") look greyed out. The "Verify you are human" Cloudflare box sits below "Answered by Aide · trained on the WCPOS docs & wiki".
- Problem: `support-chat.tsx` disables the chips and the submit button while `verifying` (`disabled={verifying}`, line 300), and the Turnstile widget renders last. So the fold shows faded controls that don't respond, a cut-off placeholder, and the box that unlocks them below the credit line. Nothing on the page connects them.
- Why it costs: When I check a plugin before recommending it, the support page shows me how much care the project takes. Here the first thing I see looks broken. The chip I'd tap (the licence question) doesn't respond, and nothing tells me to tick the box below.
- Fix: While `verifying`, show one short line above the chips, such as "Tick 'Verify you are human' below to ask", or render the widget directly under the input. Shorten the placeholder so it fits at 390 px (for example "e.g. Connect a receipt printer").
- Scope: ok

## Worst defect — SEO
- Page/viewport: Home and /downloads, all locales. The `SoftwareApplication` JSON-LD from `src/lib/software-application-json-ld.ts`.
- Element: `{"@type":"SoftwareApplication","name":"WCPOS","operatingSystem":"Windows, macOS, Linux, iOS, Android","url":"https://wcpos.com", "offers":{"price":"0"}}`. The block has no `description`, `softwareVersion` or `softwareRequirements`, and every locale gets the en `url`.
- Problem: /downloads already shows "Latest 2.0.4 · WordPress 5.6+ · WooCommerce 5.3+ · PHP 7.4+", but the structured data has none of it. The one machine-readable description of the product doesn't say that it is a WooCommerce plugin, what it needs or which version it is. On /de and /nl, the entity points to the English URL.
- Why it costs: Search engines and AI answer tools use this block to describe the product. "WooCommerce POS requirements" and "WCPOS latest version" are exactly the questions a developer searches before installing, and the page that answers them hands the crawler an empty entity. The single en `url` also weakens the locale pages that hreflang works to keep separate. The seo judge has named this since round 17.
- Fix: Pass `extra` from both pages: `description` (the page's meta description), `url` (the locale URL), `softwareRequirements: "WordPress 5.6+, WooCommerce 5.3+, PHP 7.4+"` and, on /downloads, `softwareVersion` from the release data the page already fetches. Add "Web" to `operatingSystem`.
- Scope: ok

## Runner-up notes (max 3 lines)
- Home "Bring your own hardware": the body says only "thermal receipt printers, barcode scanners" and links nowhere. The site's own release notes name ESC/POS, Epson, PrintNode, Bluetooth and USB printing, 58/80 mm paper and cash-drawer kick. One clause and a docs link would answer my hardware question.
- /downloads: the lead "One till, every device." and the card title "Unlock the full till" say "till", while the rest of the en site says "register". Also, 2.0.4's "Developers:" line is changelog detail ("translations pinned to 2026.11.18"), not release copy for visitors.
- /pro: none of the eight feature cards links to its documentation, except the terminal card. For a developer, a "Docs" link per feature would remove the last reason to ask.
