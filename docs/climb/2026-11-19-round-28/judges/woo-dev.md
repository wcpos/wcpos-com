# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS for WooCommerce that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, every viewport and locale. This is the "Bring your own hardware" panel (`home.…a3.b` in `messages/*.json`). /pro and /downloads say nothing more about printers. This is the second round I have named it.
- Element: "Receipt printers and barcode scanners: plug in what's already on your counter."
- Problem: Printers and scanners are one of the four things I check before I recommend a POS, and this sentence is all the live site says about them. It doesn't say how a printer connects (USB, Bluetooth, network or a cloud service), which receipt widths work, or whether a cash drawer kicks. It also has no link. Card terminals get a whole /extensions page with a Documentation link for each of the eight. The only printer facts are in the 1.9.x notes that ship in `downloads.releaseHistory.fallback` (ESC/POS, Epson and PrintNode, 58/80 mm, cash-drawer kick), and the live pages don't show those notes.
- Why it costs: "Plug in what's already on your counter" is a sales line, not a spec. My client has a printer at each of their two counters, and I can't promise those printers will work without going to the docs or asking on Discord. Answering that is the sales call the site is supposed to save me.
- Fix: Add one link after the sentence, "Supported printers, scanners and cash drawers →", pointing at the docs page for hardware or printing.
- Scope: ok, if the fix is only the link: one message key in each locale and an `<a>`. Naming connector types would need someone to confirm they are unchanged in 2.0. The panel is part of the scroll-story in the owner's open PR, so make the edit on top of that PR or after it merges.

## Worst defect — UI
- Page/viewport: /downloads, desktop 1440 and phone 390.
- Element: "Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales." It sits inside the expanded 2.0.0 entry of "What's new".
- Problem: This is the fourth round in a row with this defect. Round 27 rebuilt the download card around "Install the free plugin", which makes the card the upgrade starting point. The card now has three notes: plugin first, Intel Mac, and macOS 12 Monterey. None of them covers the one upgrade path that loses data. On desktop the warning is about 2,700 px below the "Download for macOS" button (y≈680), just above the footer. On phone it is several screens further down. Nothing near the buttons points to it.
- Why it costs: Every client I would move to 2.0 is on 1.11 today. If someone installs the new plugin or app while a till still holds unsent offline sales, those sales are lost. The card gives a macOS 12 edge case more room than the warning that protects a store's takings. It is also the note an agency most needs to forward to a client before upgrade day.
- Fix: Add a fourth note under the buttons, in the existing note style: "Upgrading from 1.11? Sync every register first; unsent sales don't carry over. Read the 2.0 notes ↓". Link it to a new `id` on the 2.0.0 release entry, in every locale. The key must also go into `DOWNLOADS_CLIENT_MESSAGES`, or it will show the raw key the way #817 did.
- Scope: ok. It restates the existing release note: one message key in each locale and one anchor.

## Worst defect — SEO
- Page/viewport: /pro, every locale. This is the `SoftwareApplication` JSON-LD in `src/app/[locale]/(main)/pro/pro-product-json-ld.tsx:49`.
- Element: `operatingSystem: 'Windows, macOS, Linux, iOS, Android'`, and the object has no `softwareRequirements`.
- Problem: This is the third round I have named it, and it is unchanged. The shared builder `src/lib/software-application-json-ld.ts:14,22` that home and /downloads use declares "…, Web" and `softwareRequirements: "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"`, and a test pins it. The /pro object is a hand-written copy that has drifted from the builder. It leaves out Web, the platform the demo leads with. It also leaves out the WordPress and WooCommerce requirement, which is what makes Pro a WooCommerce add-on at all. The page that carries the paid offers has the least accurate product schema on the site.
- Why it costs: Rich results and AI answers to queries such as "WCPOS Pro requirements" or "WooCommerce POS web" take their facts from the schema on the Offer page. Two pages of the same site now give search engines two different descriptions of one product.
- Fix: On /pro, import `WCPOS_SOFTWARE_REQUIREMENTS` and the operating-system string from the shared helper, and add a test that /pro and home agree on both.
- Scope: ok

## Runner-up notes (max 3 lines)
- The /downloads 2.0.0 note still prints the raw URL "What's new: https://docs.wcpos.com/getting-started/whats-new". It says 2.0 handles "card readers … at the register itself" without saying that needs Pro.
- /pro never states the WordPress, WooCommerce or PHP requirements in visible copy. They appear only in /downloads step 1.
- The /pro license FAQ ("2 sites … one live site and one development site") next to "run several stores" leaves my two-store client unsure whether they need one license or two. This is the /pro multi-store front-desk hold.
