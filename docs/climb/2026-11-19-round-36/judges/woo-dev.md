# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS for WooCommerce that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: Opening and closing the register, split payments and today's sales report are now free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: All seven /compare/* pages, every viewport and locale. On /compare/square it shows in the "Card payments" row of "At a glance" and in "How do card payments work?". `messages/en.json` holds 19 copies of "Vipps MobilePay".
- Element: "Pro terminal integrations: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Vipps MobilePay". In prose it reads "add card-terminal integrations for … Mollie Terminal, and Vipps MobilePay, installable one-click from the extension catalog".
- Problem: This is unchanged since round 35. The site's own /extensions page lists eight Pro card-terminal extensions. Mercado Pago Point Smart, PayArc and Windcave are missing from every comparison page. Vipps MobilePay is called a card-terminal integration, but /extensions describes it as payment "via QR code or push notification". The /extensions meta description names Windcave too. So the comparison pages, the very pages that claim to be "sourced and dated", disagree with the catalog in both directions.
- Why it costs: Hardware is the first thing I filter on. Take a client in NZ or AU on Windcave, or in LatAm on Mercado Pago, who reads "WCPOS vs Square". The page tells them their terminal isn't supported, and the comparison page is exactly where I decide whether to recommend. Once one list is wrong, I stop trusting the rest of the table.
- Fix: Use the cheapest fix that needs no claim check, so the work stays small. Replace the enumerated list with "Stripe Terminal, Square Terminal, SumUp, PayPal Reader and more — see all terminal extensions", linking to /extensions as `proAddsLinks.ext` already does. This drops Vipps from the "card-terminal" wording, so every brand named stays one that /extensions lists as a terminal. Apply it in all ten locales.
- Scope: ok. The fix removes names rather than adding claims, and it touches no prices or terms.

## Worst defect — UI
- Page/viewport: /support, desktop 1440 and phone 390 (full-page captures). The components are `src/components/support/discord-widget.tsx` and `discord-section.tsx`.
- Element: The `h-[600px]` box under "Prefer to talk to a human?" / "Open Discord".
- Problem: #849 shipped and is live, yet both of this round's captures still show a solid dark-grey slab with no messages. It is about 600 px on desktop and about 1,190 px of the 5,448 px page on phone, the largest element there. The cause is that the skeleton is removed on the iframe's `onLoad`. That event fires when WidgetBot's HTML shell has loaded, which is before its app has fetched and painted the channel. The component's own comment ("WidgetBot paints an empty dark panel while it boots") describes the very state that `onLoad` leaves on screen. The capture scrolls through the page, waits about 0.5 s and shoots, and that window is enough to catch it. A visitor on a mid-range phone or slow connection will catch it too.
- Why it costs: I come to /support to judge whether the project is alive and whether a client can get help. The page ends in what looks like a broken widget, right after an Ask box that looks disabled until the Turnstile tick. The panel undoes the trust that the guides block builds.
- Fix: Keep the skeleton until WidgetBot reports that it is ready: listen for the embed's `ready` postMessage, with a fallback timeout of about 5 s. Alternatively, mount the widget only on a "Show live chat" click and keep the box at about 160 px until then. Either way, no dark panel is ever shown without content.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /extensions, all locales. This is the `<meta name="description">` (the `extensions.metadata.description` message).
- Element: "Extensions for WCPOS, the WooCommerce point of sale: card terminals from Stripe, Square, SumUp, PayPal, Mollie and Windcave, plus WPML, Polylang and ATUM."
- Problem: The page's title is "WooCommerce POS Extensions & Card Terminals", so this snippet is what ranks for "<brand> terminal WooCommerce POS" searches. It names six terminal brands. It leaves out Mercado Pago and PayArc, which have their own cards on the page. It also never says that the terminals need WCPOS Pro, although the page's second line is "Extensions marked Pro need WCPOS Pro".
- Why it costs: A searcher who wants Mercado Pago or PayArc gets no snippet match from the one page built to answer that query. A searcher who clicks from "card terminals" expecting free support lands on a Pro gate, which raises pogo-sticking on the page whose job is to capture hardware searches.
- Fix: Use "WCPOS Pro card terminals: Stripe, Square, SumUp, PayPal, Mollie, Mercado Pago, PayArc and Windcave, plus WPML, Polylang and ATUM add-ons for WooCommerce POS." (157 characters), with matching translations within the description-length test.
- Scope: ok. It names only extensions the page already lists, and it adds no prices.

## Runner-up notes (max 3 lines)
- /extensions from `md` up: about 225 px of empty space between "Extensions marked Pro need WCPOS Pro." and "Card terminals and payments". The hero's `lg:py-28` sits on top of the next section's padding. This is the fourth round it has appeared.
- Home "Works with the equipment you already have.": "plug in what's already on your counter" names no printer types (ESC/POS, Epson, Star, PrintNode, Bluetooth) and has no link to the docs hardware guides, which /support already links (`docs.wcpos.com/hardware/receipt-printers`).
- /pro "More Registers & Multiple Stores" still doesn't say whether the stores sit in one WooCommerce site or share one stock pool. For a two-store client that question decides the quote, given the "2 sites: live + dev" licence FAQ.
