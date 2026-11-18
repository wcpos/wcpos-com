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
- Page/viewport: /downloads, all viewports and locales. Step 3, "Want more? Go Pro" (`downloads.page.steps.pro.body`, `cardTitle`, `cardBody` in `messages/*.json`).
- Element: "A licensed plugin that adds terminal payments, refunds and stock control on the same foundation." The card under it says "Unlock the full till / Terminal payments, refunds, stock & pricing, order management, full reports, multi-store and priority Discord support."
- Problem: Free is limited to one register. /pro ("More Registers & Multiple Stores", listed first), the /pro FAQ ("it runs one register, and more registers … need Pro") and the 2.0.0 notes on this same page ("Free includes one register; more registers need Pro") all say so. The step that pitches Pro on the install page leaves registers out of both lines, and the body line also leaves out stores. That is the main reason any multi-till or multi-store shop upgrades. The step also says "till" where the rest of the site says "register". This is the third round this has been raised (designer, seo).
- Why it costs: My client has two stores and needs at least two registers. The install page is where I work out the bill of materials. It tells me Pro is for terminals, refunds and stock, so I'd assume the free plugin covers the second register, find out otherwise after install, and go back to the client with a cost I didn't quote. The page's own release notes contradict the pitch, which makes me trust its other claims less.
- Fix: In every locale, lead the body with registers and stores, for example "A licensed plugin that adds more registers and stores, terminal payments, refunds and stock control on the same foundation." Make the card body start "More registers & stores, terminal payments, …" and change "Unlock the full till" to "… register". This wording already appears on /pro, so it adds no new claim.
- Scope: ok

## Worst defect — UI
- Page/viewport: /downloads, phone 390 (it also shows on desktop). The "What's new" release history (`release-history.tsx`, `defaultOpen` on the 2.0.0 entry).
- Element: The open "2.0.0 Nov 9, 2026" accordion. It has about 25 bullets of grey body text, including the "Since beta 3, for testers on the 2.0 beta" list and "Developers: sync protocol 3 …". It also prints a bare wrapped URL as link text: "What's new: https://docs.wcpos.com/getting-started/whats-new".
- Problem: On phone, the open 2.0.0 body runs about 4,300 px of a 14,580 px page, nearly a third of it, with no "show more" break and no end marker until the 1.11.10 row. The two upgrade warnings that matter (sync every till first; needs WooCommerce 9.0) are at the top. Under them is a wall of beta-tester and internal detail at the same weight. The bare URL breaks mid-path across two lines.
- Why it costs: I want the release notes, and the opening warnings are exactly right. But on a phone the page no longer has an end, and the footer and the rest of the history are thumbed past a beta changelog meant for testers. A raw URL as link text looks like pasted GitHub markdown, not a page someone finished.
- Fix: Keep 2.0.0 open, but cap its body at about 600 px with a fade and a "Show all 2.0.0 notes" toggle, which leaves the two warnings visible. Render bare-URL link text as "What's new in 2.0" (or the URL's page title).
- Scope: ok

## Worst defect — SEO
- Page/viewport: /downloads, all locales. The `SoftwareApplication` JSON-LD (`wcposSoftwareApplication` in `src/lib/software-application-json-ld.ts`, called at `downloads/page.tsx:181`). Carried over from round 21, still not fixed.
- Element: `{"@type":"SoftwareApplication","name":"WCPOS","applicationCategory":"BusinessApplication","operatingSystem":"Windows, macOS, Linux, iOS, Android","offers":{"price":"0"},"url":…,"description":…,"downloadUrl":…}`. It has no `softwareVersion`, no `softwareRequirements` and no "Web".
- Problem: The page already has `freeVersion` (it prints "Latest 2.0.4") and now prints the corrected "WordPress 5.6+ · WooCommerce 9.0+ · PHP 7.4+". Neither fact reaches the one machine-readable entity for the product. `operatingSystem` leaves out the web app that the page title promises ("… for Mac, Windows, Linux & Web").
- Why it costs: "WCPOS latest version" and "WooCommerce POS requirements" are the queries a developer runs before recommending a plugin. AI answer engines and rich results read exactly these fields. Since #792 the visible requirement is right, but crawlers still get nothing, or older copies that said 5.3+.
- Fix: On /downloads, pass `softwareVersion: freeVersion` (when present) and `softwareRequirements: "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"` in `extra`. Add "Web" to `operatingSystem`.
- Scope: ok

## Runner-up notes (max 3 lines)
- The terminal lists disagree. /pro: "Stripe Terminal, Square Terminal, SumUp, Mollie, PayPal Reader and more". /compare/square counts "Vipps MobilePay" (a QR/push gateway) as a card terminal and leaves out Windcave, PayArc and Mercado Pago, which /extensions lists. One canonical list would settle the hardware question.
- Home "Bring your own hardware" ("thermal receipt printers, barcode scanners … Plug in what's already on your counter") links no docs. The site has no printer docs link anywhere, so the supported printer question (USB, network, ESC/POS) still needs a support ticket.
- /pro multi-store (front desk, since round 13): the card still never says that stores live inside one WooCommerce site and share its catalog. Next to "2 sites = live + dev", my two-store client reads it as two licences.
