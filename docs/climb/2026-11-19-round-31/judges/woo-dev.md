# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, with apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0 you can open and close the register, split payments and see today's sales for free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, every viewport and locale. This is the "Bring your own hardware" panel, plus the "Receipt printing" bullet in the home Free list. This is the fifth round I have named it, and it is unchanged.
- Element: "Receipt printers and barcode scanners: plug in what's already on your counter."
- Problem: This is still everything the site says about printers. It doesn't say how a printer connects, which receipt widths work, or whether the cash drawer kicks, and it links nowhere. `src/` and `messages/` hold about 25 docs.wcpos.com links. Every terminal has one, and so do barcode scanning, WPML and ATUM. None of them goes to a printing or hardware page. "Receipt printing" in the Free list is a bare bullet too.
- Why it costs: Hardware is one of the four things I check before I recommend a POS. My client has a printer, a scanner and a cash drawer at each of their two counters. "Plug in what's already on your counter" is a sales line, not a compatibility statement. To get an answer I have to search the docs or ask on Discord, which is the sales call the site is meant to save me.
- Fix: Add one link, "Supported printers, scanners and cash drawers →", pointing at the docs.wcpos.com printing or hardware page (the owner confirms the URL). Use one message key per locale. If the panel stays locked inside the owner's scroll-story PR, link the "Receipt printing" Free-list bullet to the same page instead. That bullet sits outside the scroll-story.
- Scope: ok if the fix is only a link to an existing docs page. Naming connector types or printer models would need the owner to confirm them for 2.0.

## Worst defect — UI
- Page/viewport: /downloads, phone 390 (/support has the same band).
- Element: The empty band between the header and the "DOWNLOADS" eyebrow (about 85 px of CSS height), above "Download WooCommerce POS / One register, every device." and the six-tile platform grid.
- Problem: On the first screen of the phone page, the detected-platform card starts at about y=560 CSS px. "Install the free plugin" is cut off by the cookie bar, and "Download for macOS" is not visible at all. The space goes to empty padding, an H1 that wraps to two lines, and a subtitle. Round 30 recorded this and deferred it. /pro already got the tighter hero padding in #826.
- Why it costs: The phone visitor came to this page to download. Neither the primary action nor the new 1.11 → 2.0 upgrade note is on the first screen, so they scroll before they can act. The page then feels slower than it is.
- Fix: Use the /pro (#826) phone hero padding on /downloads and /support, so the platform card and its first button move up by about 85 px.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /de/pro meta description, every viewport (`messages/de.json`, the pro `meta.description`).
- Element: "WCPOS Pro für WooCommerce: weitere Kassen und mehrere Filialen, Terminalzahlungen, Lager- und Preisbearbeitung, Bestell- und Kundenverwaltung." (142 chars)
- Problem: The en and nl /pro descriptions both end with "and full reports" / "en volledige rapporten". So does the visible de /pro subtitle ("vollständige Berichte"). The de snippet drops reports, the one Pro feature that 2.0 split between Free and Pro, so the German SERP snippet lists one feature fewer than the page itself. Round 30 named this too.
- Why it costs: Multi-day and multi-store reporting is a main reason a two-store client pays for Pro. A German searcher comparing Kassensysteme doesn't see it in the only copy that shows in the results. The snippet has also drifted from the en source, which the locale-parity work has been closing.
- Fix: "WCPOS Pro für WooCommerce: weitere Kassen und Filialen, Terminalzahlungen, Lager- und Preisbearbeitung, Bestell- und Kundenverwaltung, volle Berichte." (150 chars)
- Scope: ok (it restates existing en/de claims; nothing new)

## Runner-up notes (max 3 lines)
- /downloads Lighthouse mobile is 82 (TBT 460 ms, main thread 2.0 s, LCP 3.0 s). Round 30's 87 turned out to be noise, so rerun it before acting. If it holds, look at what hydrates on the platform picker.
- /downloads step 2 "Web → Open the live demo" still never says that the web register runs on my own store once the plugin is installed. A dev evaluating for a client wants the "where is it on my site" line.
- /pro "Each license can be activated on 2 sites, … one live site and one development site" next to "run several stores" leaves a two-store client unsure whether they need one license or two (licensing wording: front-desk hold).
