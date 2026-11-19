# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, with apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, every viewport and locale. This is the "Bring your own hardware" panel (`home.…a3.b` in `messages/*.json`). This is the third round I have named it, and it is unchanged.
- Element: "Receipt printers and barcode scanners: plug in what's already on your counter."
- Problem: This sentence is still the only thing the live site says about printers. It doesn't say how a printer connects (USB, Bluetooth, network or a cloud service), which receipt widths work, or whether a cash drawer kicks. It links nowhere. The site never links a printing docs page. It does link `docs.wcpos.com/pos/product-panel/barcode-scanning` elsewhere, and each card terminal on /extensions gets its own "Documentation →" link. Neither /pro nor /downloads says anything more. "Receipt printing" in the Free plan list is a bare bullet as well.
- Why it costs: Hardware is one of the four things I check before I recommend a POS. My client has a printer and a scanner at each of their two counters. "Plug in what's already on your counter" is a sales line, not a compatibility statement. I still have to search the docs or ask on Discord before I can tell the client yes, and answering that question is the sales call the site is supposed to save me.
- Fix: Add one link after the sentence, "Supported printers, scanners and cash drawers →". Point it at the docs.wcpos.com hardware or printing page; the owner needs to confirm that URL. Use one message key per locale.
- Scope: ok if the fix is only the link. Naming connector types would need the owner to confirm they still hold in 2.0. The panel is part of the scroll-story in the owner's open PR, so make the edit on top of that PR or after it merges.

## Worst defect — UI
- Page/viewport: /downloads, desktop 1440 and phone 390.
- Element: "Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales." It sits inside the expanded 2.0.0 entry of "What's new".
- Problem: This is the fifth round I have named it, and nothing has changed. The download card under "macOS Detected" has three notes: install the plugin first, the Intel build, and macOS 12 Monterey. None of them mentions the one upgrade path that loses data. The warning is in the release history at the bottom of the page, just above the footer: thousands of pixels below "Download for macOS" on desktop, and several screens further down on phone. Nothing near the buttons points to it.
- Why it costs: Every client I would move to 2.0 runs 1.11 today. If someone installs the new app or plugin while a till still holds unsent offline sales, those sales are lost. The card gives a macOS 12 edge case more room than the warning that protects a store's takings. This is the note an agency most needs to forward before upgrade day.
- Fix: Add a fourth note under the buttons, in the existing note style: "Upgrading from 1.11? Sync every register first; unsent sales don't carry over. Read the 2.0 notes ↓". Link it to a new `id` on the 2.0.0 release entry, in every locale. Add the key to `DOWNLOADS_CLIENT_MESSAGES` as well, or the page will show the raw key the way #817 did.
- Scope: ok. It restates the existing release note: one message key in each locale and one anchor.

## Worst defect — SEO
- Page/viewport: /pro, every locale. This is the `SoftwareApplication` JSON-LD in `src/app/[locale]/(main)/pro/pro-product-json-ld.tsx` (around line 49).
- Element: `operatingSystem: 'Windows, macOS, Linux, iOS, Android'`, and the object has no `softwareRequirements`.
- Problem: This is the fourth round I have named it, and it is unchanged. Home and /downloads use the shared builder `src/lib/software-application-json-ld.ts`. It declares "…, Android, Web" and `softwareRequirements: "WordPress 5.6+, WooCommerce 9.0+, PHP 7.4+"`, and a test pins that value. The /pro object is a hand-written copy that has drifted from the builder. It leaves out Web, which is the platform the demo leads with. It also leaves out the WordPress and WooCommerce requirement, which is what makes Pro a WooCommerce add-on at all. The page that carries the paid offers has the least accurate product schema on the site.
- Why it costs: Rich results and AI answers take facts for queries such as "WCPOS Pro requirements" or "WooCommerce POS web app" from the schema on the Offer page. The site now gives search engines two different descriptions of one product.
- Fix: On /pro, import `WCPOS_SOFTWARE_REQUIREMENTS` and a shared operating-system constant from the builder module, and add a test that /pro and home agree on both.
- Scope: ok

## Runner-up notes (max 3 lines)
- /downloads, the 2.0.0 note: it prints the raw URL "What's new: https://docs.wcpos.com/getting-started/whats-new" instead of a link. It also says "card readers handled at the register itself" without saying that integrated readers need Pro.
- /pro never states the WordPress, WooCommerce or PHP requirements in visible copy. They appear only in /downloads step 1 ("WordPress 5.6+ · WooCommerce 9.0+ · PHP 7.4+").
- The /pro license FAQ says "2 sites … one live site and one development site". Next to "run several stores", that leaves my two-store client unsure whether they need one license or two. This is the /pro multi-store front-desk hold.
