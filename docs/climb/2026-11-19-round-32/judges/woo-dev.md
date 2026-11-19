# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, plus apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, every viewport and locale. The issue is the "Receipt printing" bullet in the Free list and "Barcode scanner support." in the "Fast product search" feature card. Both sit outside the owner's scroll-story. The "Bring your own hardware" panel inside the scroll-story has the same gap. This is the sixth round I have named it.
- Element: "Receipt printing" (Free list) and "Find products instantly with search, filters, and category browsing. Barcode scanner support." (feature card)
- Problem: These lines are all the home page says about printers and scanners, and neither one links anywhere. The site's own redirect table already sends visitors to the matching docs pages: `next.config.ts:106` points to `https://docs.wcpos.com/pos/product-panel/barcode-scanning` and `next.config.ts:108` to `https://docs.wcpos.com/receipts`. The neighbouring "Smooth checkout flow" card already links "card readers", so the pattern exists one card over. Earlier rounds held this back because there was no confirmed docs URL. The URLs above are ones the site already uses.
- Why it costs: I check hardware before I recommend a POS. My client has a printer, a scanner and a cash drawer at each of their two counters. "Receipt printing" with no detail doesn't tell me about thermal versus browser printing, receipt widths or the cash-drawer kick. Today I have to search the docs or ask on Discord to find out, and that is the sales call this site is meant to save me.
- Fix: Use the existing `<link>` rich-text pattern from the "card readers" card. Link "Receipt printing" to `https://docs.wcpos.com/receipts`, and turn "Barcode scanner support" into a link to `https://docs.wcpos.com/pos/product-panel/barcode-scanning`. That is one message change per locale for each key, with no new copy.
- Scope: ok. It adds links to docs pages the site already redirects to, and makes no new claims.

## Worst defect — UI
- Page/viewport: /extensions, phone 390. /support has the same hero, but its first screen survives it better.
- Element: The `spacing="hero"` band above "Extensions for WooCommerce POS" (`extensions/page.tsx:71`). There are about 85 CSS px of empty padding before the H1 and about 80 px more after "Extensions marked Pro need WCPOS Pro."
- Problem: The phone's first screen is all hero. The first extension card, "Stripe Terminal for WooCommerce", shows only its title and one line before the cookie bar covers it. Its docs link and the rest of the terminal list sit below the fold. #834 just fixed this exact pattern on /downloads, and /pro has had the tighter hero since #826.
- Why it costs: I came to this page to see which terminals and plugins integrate. On a phone I have to scroll before I see a single integration. The page then looks like a heading with nothing under it.
- Fix: Apply the #834 /downloads treatment to /extensions and /support. Below `sm`, use 40/40 px hero padding instead of the `hero` spacing, and keep the current values from `sm` up.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /es and /it home meta description, every viewport (`messages/es.json` and `messages/it.json`, `home.meta.description`).
- Element: es "Punto de venta gratuito para WooCommerce. Vende sin conexión, …" (159 chars); it "Punto vendita WooCommerce gratuito. Vendi offline, …" (154 chars)
- Problem: The en, de, nl, fr, pt, ja, zh and ko home descriptions all say open source. Only es and it drop it. On the same pages, the visible hero badge reads "Gratis y de código abierto" / "Gratuito e open source", so the snippet leaves out what the page itself leads with.
- Why it costs: "Open source" is the one word that separates WCPOS from Square, FooSales and Jovvie in a results page. It is also a search term that developers and agencies actually use ("TPV WooCommerce código abierto", "POS WooCommerce open source"). Spanish and Italian searchers get a snippet that reads like every other free-tier POS.
- Fix: es: "TPV gratuito y de código abierto para WooCommerce. Vende sin conexión, divide pagos, abre y cierra la caja, gratis en 2.0. Web y escritorio; iOS/Android beta." (158 chars; es.json already uses "TPV"). it: "Punto vendita WooCommerce gratuito e open source. Vendi offline, dividi i pagamenti, apri e chiudi la cassa, gratis in 2.0. Web e desktop; iOS/Android in beta." (159 chars). Both keep the existing offline wording unchanged.
- Scope: ok. It restates the existing badge claim. The offline phrase is left exactly as it is, because that wording is a front-desk hold.

## Runner-up notes (max 3 lines)
- /downloads step 2, "Web → Open the live demo", still never says that the web register runs at my own store's URL once the plugin is installed (fourth round).
- /pro: "run several stores, each with its own address, tax rates…" never says whether these stores are inside one WooCommerce site or across sites. Next to "2 sites", a two-store client can't tell whether one license covers them (front-desk hold: multi-store and the "2 sites" FAQ).
- /pro `SoftwareApplication` still has no requirements. /downloads shows "WordPress 5.6+ · WooCommerce 9.0+ · PHP 7.4+" for the plugin, but there's nothing for Pro (owner question from round 29; a test currently asserts it is absent).
