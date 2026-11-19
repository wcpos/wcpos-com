# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, all viewports and locales. This is the "Bring your own hardware" panel (`home.…a3.b` in `messages/*.json`). /pro and /downloads add nothing on printers.
- Element: "Receipt printers and barcode scanners: plug in what's already on your counter."
- Problem: Hardware is one of the four things I have to sign off on before I recommend a POS. On the live pages this one sentence is everything the site says about printers and scanners. It doesn't say how a printer connects (USB, Bluetooth, network, a cloud service), what receipt widths are supported, or whether a cash drawer works. It also links nowhere. Card terminals get a full /extensions page with a docs link for each one. Printers get no link at all. The site does have the detail, in the 1.9.x plugin notes it ships with (`downloads.releaseHistory.fallback`): ESC/POS, Epson and PrintNode connectors, Bluetooth and USB printing, 58/80 mm thermal printing and cash-drawer kick. None of those notes is shown on the live pages.
- Why it costs: "Plug in what's already on your counter" is what a sales page says. It isn't a spec. My client has two counters, each with a printer, and I can't tell them their printers will work without leaving for the docs or asking on Discord. That is the sales call the site is supposed to save me. Every competitor I'm comparing names its supported printers.
- Fix: Add one link after the sentence, "Supported printers, scanners and cash drawers →", pointing at the docs page for hardware or printing. Optionally, name the connector types the 1.9.x notes already state, for example "ESC/POS, Epson or PrintNode receipt printers".
- Scope: ok if it is only the link, which is one message key in each locale plus an `<a>`. Naming connectors needs someone to confirm they are unchanged in 2.0. This panel is part of the home scroll-story in the owner's open PR, so the edit should be made on top of that PR or after it.

## Worst defect — UI
- Page/viewport: /downloads, desktop 1440 and phone 390.
- Element: "Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales." It is inside the expanded 2.0.0 entry of "What's new".
- Problem: This is the third round in a row with this defect. The hero download card has notes for Intel Macs and for macOS 12 Monterey, and none for the one upgrade path that loses data. On desktop the warning is at about y=3,350, about 2,700 px below "Download for macOS" (y≈630). The page is 4,228 px tall, so the warning is just above the footer. On phone it is several screens further down a page about 5,800 px tall. Nothing near the download button points to it.
- Why it costs: Every client I'd move to 2.0 is on 1.11 today. If someone installs the new app on a till that still has unsent offline sales, those sales are lost. The page gives a macOS 12 edge case more prominence than the warning that protects a store's takings. It's also the note an agency most needs to forward to the client before upgrade day.
- Fix: Add a third note in the existing note style under the download button: "Upgrading from 1.11? Sync every register first; unsent sales don't carry over. Read the 2.0 notes ↓". Link it to a new `id` on the 2.0.0 release entry, in every locale.
- Scope: ok. It restates the existing release note: one message key in each locale and one anchor.

## Worst defect — SEO
- Page/viewport: /pro, all locales. This is the `SoftwareApplication` JSON-LD in `src/app/[locale]/(main)/pro/pro-product-json-ld.tsx:49`.
- Element: `operatingSystem: 'Windows, macOS, Linux, iOS, Android'`. The object has no `softwareRequirements`.
- Problem: This is unchanged since round 26. The shared builder `src/lib/software-application-json-ld.ts` that home and /downloads use declares "…, Web" and `softwareRequirements: "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"`, and a test locks that to the visible copy. The /pro object is a hand-written copy that has drifted from it. It leaves out Web, which is the platform the home page and the demo lead with. It also leaves out the WordPress and WooCommerce requirement, which is what makes Pro a WooCommerce add-on in the first place. The page that carries the paid offers therefore has the least accurate product schema on the site.
- Why it costs: Rich results and AI answers to queries like "WCPOS Pro requirements" or "WooCommerce POS web" take their facts from the Offer page's schema. Search engines also get two different descriptions of the same product from two pages of the same site, and visitors find nothing on /pro that says which WooCommerce version Pro needs.
- Fix: On /pro, import `WCPOS_SOFTWARE_REQUIREMENTS` and the operating-system string from the shared helper. Set `operatingSystem` to include Web and add `softwareRequirements`. Add a test that /pro and home agree on both.
- Scope: ok

## Runner-up notes (max 3 lines)
- The /downloads 2.0.0 note still prints the raw URL "What's new: https://docs.wcpos.com/getting-started/whats-new". The same note says 2.0 handles "card readers … at the register itself" without saying that this needs Pro.
- /compare/square: the glance caption says "verified 2026-10-06", while Sources says "checked again on 2026-11-18". The glance's card-terminal list leaves out Windcave, PayArc and Mercado Pago, which /extensions lists.
- The /pro page never states the WordPress, WooCommerce or PHP requirements. Those appear only in /downloads step 1.
