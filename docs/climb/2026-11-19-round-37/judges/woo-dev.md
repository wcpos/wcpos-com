# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin and app for WooCommerce. It turns a tablet into the store's register and sells from the same catalog, stock and prices, even offline.
Why version 2: Opening and closing the register, split payments and today's sales are now free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports and locales. This is the "More Registers & Multiple Stores" feature card (`pro.features.stores.description` in `messages/*.json`).
- Element: "Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users."
- Problem: The card lists everything that is per store except stock, which is the one thing a two-store client asks about first. Nothing on /pro says whether the stores draw on the shared WooCommerce stock or keep their own. The site does have the answer, but elsewhere: /extensions lists "WCPOS ATUM Integration — ATUM Multi-Inventory integration for WCPOS, linking inventory locations to POS stores" (wiki `architecture/plugin-atum.md`: without it, tills see aggregate WooCommerce stock). Worse, /compare/yith tells the reader to "choose YITH if you … sell from several stores with separate stock". With no counterpart on /pro, that reads as if WCPOS can't do it at all.
- Why it costs: Stock per location is the deciding question when I quote a two-store setup. If /pro doesn't answer it, I need a sales email or a support thread before I can recommend the product, or I recommend YITH because its page answered first.
- Fix: Add one sentence to the card: "Stores share your WooCommerce stock; for separate stock per store, add the ATUM integration." Link "ATUM integration" to /extensions, as the terminal card's "See all terminal extensions" already does. Do this in all ten locales.
- Scope: ok. It restates what /extensions and the ATUM extension already say. It makes no new claim and doesn't touch prices or terms.

## Worst defect — UI
- Page/viewport: /extensions at `md` and wider (1440 desktop capture). The cause is `src/app/[locale]/(main)/extensions/page.tsx:72`.
- Element: The gap between "Extensions marked Pro need WCPOS Pro." and the first group heading, "Card terminals and payments".
- Problem: Roughly 220 px of empty space, still there five rounds on. The hero Section's `lg:py-28` bottom padding (112 px) sits directly on top of the next `spacing="default"` muted Section's own top padding. The only visual break is a faint tone change. At 1440×900 the first terminal cards begin about 520 px down, and the cookie banner covers their second row.
- Why it costs: /extensions is the page I open to check hardware support. A short three-line hero followed by a big void pushes the terminal list below the fold and makes the page feel unfinished, on exactly the page I'd send a client.
- Fix: Cut the hero's bottom padding from `md` up (for example `md:pt-24 md:pb-10 lg:pt-28 lg:pb-12`), so the gap above "Card terminals and payments" is about the same as the 56 px (`mt-14`) between groups.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro, all locales. This is the SoftwareApplication JSON-LD `description` (`pro.schema.description`).
- Element: "Premium Point of Sale plugin for WooCommerce. Adds payment terminal integration, stock and price editing, order and customer management, full reports, custom payment gateways, and priority support."
- Problem: The structured data for the paid product leaves out what Pro mainly sells: more registers and multiple stores. Those come first in the meta description ("more registers and multiple stores, terminal payments…") and in the first feature card. The JSON-LD also omits the customer-facing display, so the two descriptions machines read for /pro disagree.
- Why it costs: Searches like "WooCommerce POS multiple stores" or "multi-location", and AI summaries built from the JSON-LD, get a product entity for WCPOS Pro with no multi-store signal. Multi-store is the main reason an agency like mine pays for Pro.
- Fix: Make it "WCPOS Pro adds more registers and multiple stores, payment terminal integration, a customer-facing display, stock and price editing, order and customer management, full reports, custom payment gateways and priority support to the WCPOS point of sale for WooCommerce." Do this in all ten locales.
- Scope: ok

## Runner-up notes (max 3 lines)
- /compare/square "How do card payments work?" prose still lists six terminals and calls Vipps MobilePay a "card-terminal integration". The "At a glance" row ten lines above it, fixed in #853, lists eight terminals plus Vipps "by QR code or push", so the page now contradicts itself.
- /downloads on phone: "Upgrading from 1.11? Sync every register first…" is still cut off under the cookie banner, right below the macOS button.
- Home "Works with the equipment you already have.": "plug in what's already on your counter" names no printer types and doesn't link to the docs hardware guides.
