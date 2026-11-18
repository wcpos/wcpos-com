# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home, every viewport and locale, in act 3 of the scroll story (`home.story.a3.b`).
- Element: "Receipt printers and barcode scanners: plug in what's already on your counter."
- Problem: Hardware is one of the four things I have to answer before I recommend a POS, and this sentence is the site's whole answer for printers. No marketing page says which printers work: ESC/POS or Epson, USB, network or Bluetooth, raw printing or the browser print dialog, or whether the web app can print at all. None of them links to a hardware doc either. The only printer details on wcpos.com are in old 1.x release-note fallbacks on /downloads: "per-printer connectors (ESC-POS, Epson, PrintNode, cloud)" and "Bluetooth printer setup". Scanners have the same gap on the home page, even though the site already links `docs.wcpos.com/pos/product-panel/barcode-scanning` elsewhere. Card terminals, by contrast, get their own /extensions page with a docs link for each brand.
- Why it costs: My client has two stores and needs a printer and a scanner at each counter. "Plug in what's already on your counter" doesn't let me tell them whether to keep their current printers or buy new ones. I'd have to email support or dig through the docs site myself, which is the sales call the site should save me. It also reads as a claim made without any backing.
- Fix: Link "Receipt printers" and "barcode scanners" in act 3 to their docs pages (the scanner URL is already used on the site; the owner gives the printer URL). If 2.0 still supports them, add the printer types the site already names in its release notes, for example "ESC/POS and Epson printers, including Bluetooth, or PrintNode", in every locale.
- Scope: ok. The links alone are safe to ship. Naming printer types only repeats facts already on the site, but the owner should confirm they still hold for 2.0. The edit is copy and a link in `messages/*.json` and `CopyAct3`. Check for a collision with the owner's open scroll-story PR before merging.

## Worst defect — UI
- Page/viewport: /downloads, desktop 1440 and phone 390.
- Element: The upgrade warning "Sync every till before upgrading: 2.0 starts a new local database and does not carry over unsent 1.11 sales. … The app and the plugin must both be on 2.0". It sits inside the 2.0.0 entry of "What's new", in the release history at the bottom of the page.
- Problem: The hero card around "Download for macOS" already holds two small notes, for Intel Macs and for macOS 12. It has no note for the case that can lose data, an upgrade from 1.11. That warning is about 2,700 px below the download button on desktop, past "How it fits together" and "Three steps to your first sale". On phone it is several screens further down. It is also the fifth entry in a list whose first four entries are collapsed. Anyone who downloads from the fold never sees it.
- Why it costs: I'm upgrading the registers of an existing 1.11 client. If any till has unsent offline sales when the new app is installed, those sales are lost, and the page puts that warning where nobody looks. The one message that protects the store's data is lower in the hierarchy than the macOS 12 note.
- Fix: Add a third note in the same style under the download button: "Upgrading from 1.11? Sync every register first; unsent sales don't carry over. Read the 2.0 notes ↓". Link it to a new `id` on the release-history section.
- Scope: ok. It restates the release note: one message key in each locale and one anchor.

## Worst defect — SEO
- Page/viewport: The seven /compare spokes, every locale (`compare.<spoke>.metadata.title` with the `'%s | WCPOS'` template in `src/app/[locale]/layout.tsx`).
- Element: "WCPOS vs Square for WooCommerce (2026) | WCPOS", "WCPOS vs Jovvie (2026) | WCPOS", "WCPOS vs FooSales (2026) | WCPOS", "WCPOS vs Oliver POS (2026) | WCPOS", and so on.
- Problem: Every spoke title shows the brand twice and spends nine characters on "| WCPOS". Most never say what the products are. "WCPOS vs Jovvie (2026)" and "WCPOS vs FooSales (2026)" don't contain "WooCommerce" or "POS", and those are the words someone shopping for an alternative searches with ("Jovvie alternative", "FooSales WooCommerce POS"). Some spokes are only 22 to 30 characters long, so the room is there. The hub title already does this right: "Compare WooCommerce POS Systems | WCPOS".
- Why it costs: These seven pages are the cluster most likely to win searches at the comparison stage. A title that repeats the brand and leaves out the category is weaker for ranking and click-through. Google is also more likely to rewrite it with its own wording.
- Fix: Give each spoke an absolute title without the second brand that carries the category, for example "WCPOS vs Jovvie: WooCommerce POS Compared (2026)" or "WCPOS vs Square for WooCommerce: POS Compared (2026)". Keep each under 60 characters in every locale, and add a test that no spoke title contains "WCPOS" twice.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro "More Registers & Multiple Stores" still doesn't say whether two stores share one WooCommerce site and one licence, or whether each store keeps its own stock. It is still the first question a two-store client asks (front-desk hold since round 17).
- /compare/square lists six Pro payment integrations ("Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Vipps MobilePay"), while /extensions lists Mercado Pago, PayArc and Windcave as well.
- /pro "pair it to a till with a code" still says "till", and on /downloads 2.0.0 is open while 2.0.4 (Latest) is collapsed.
