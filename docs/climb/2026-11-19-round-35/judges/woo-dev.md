# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce, plus apps, that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free. This comes from the "New in 2.0" line above the H1.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: All seven /compare/* pages, every viewport and locale. The clearest case is /compare/square: the "Card payments" row in "At a glance", "How do card payments work?" and the short answer. In `messages/en.json` the same six-name list appears 16 times.
- Element: "Pro terminal integrations: Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, Vipps MobilePay". In prose it reads "…add card-terminal integrations for Stripe Terminal, SumUp, PayPal Reader (Zettle), Square Terminal, Mollie Terminal, and Vipps MobilePay".
- Problem: The site's own /extensions page lists eight Pro terminal extensions under "Card terminals and payments". Three of them (Mercado Pago Point Smart, PayArc and Windcave) are missing from every comparison page. The list also calls Vipps MobilePay a card-terminal integration, but /extensions describes it as payment "via QR code or push notification". The /extensions meta description also names Windcave, so the site disagrees with itself about which hardware Pro supports.
- Why it costs: Hardware support is the first filter I apply. Take a client in NZ or AU on Windcave, or in LatAm on Mercado Pago, who reads "WCPOS vs Square". The page tells them their terminal isn't supported, and the comparison pages are exactly where an evaluator decides. A list that is wrong in two directions also makes me doubt the rest of the "sourced and dated" tables.
- Fix: Make one shared terminal list match the /extensions catalog: Stripe Terminal, Square Terminal, SumUp, PayPal Reader (Zettle), Mollie, Mercado Pago Point, PayArc, Windcave. List Vipps MobilePay separately as a "QR/push payment" extension. Alternatively, end the list with "and more — see all terminal extensions" linking to /extensions. Do this in all ten locales.
- Scope: ok. It restates integrations the site already lists on /extensions. It makes no new product claim and does not touch prices.

## Worst defect — UI
- Page/viewport: /support, phone 390 and desktop 1440 (full-page captures). The component is `src/components/support/discord-section.tsx`.
- Element: The `h-[600px]` box under "Prefer to talk to a human?" / "Open Discord".
- Problem: This is the third round it has appeared. Both captures show a solid dark-grey slab with nothing in it: about 525 px tall on desktop and about 485 px on phone, where it is the largest element on the page. The WidgetBot embed did not render inside it. The box is fixed at 600 px so that nothing shifts, which means that when the embed fails or is slow, the empty frame is all a visitor sees. On desktop, about 130 px of stacked section padding also separates the guides from this block.
- Why it costs: I come to /support to judge whether the project is alive and whether I can get help for a client. The page ends in what looks like a broken widget, right after an Ask box that looks disabled until the Turnstile tick. That undoes the trust the new guides block just built.
- Fix: Replace the always-mounted 600 px box with a small click-to-load card of about 160 px. It holds "Open Discord" plus a "Show live chat here" button, and `<DiscordWidget />` mounts only after that click. Also drop one of the two stacked section paddings.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/sitemap.xml` (the `updatedAt` map in `src/app/sitemap.ts`). This affects `/` and `/support` in all ten locales.
- Element: `<loc>https://wcpos.com</loc>…<lastmod>2026-11-18` and `<loc>https://wcpos.com/support</loc>…<lastmod>2026-11-18`. In fact 120 of the 180 sitemap URLs carry the same `2026-11-18`.
- Problem: On 2026-11-19, the home page got a new review heading and locale-formatted stats (#845, #846), and /support got a new guides block with five docs links (#847). The hand-kept per-route dates were not bumped, so the sitemap now understates the freshness of the two pages that just changed. With one date shared by most of the site, `lastmod` no longer separates edited pages from untouched ones.
- Why it costs: Google uses `lastmod` only when it is consistently accurate. Stale or uniform dates teach the crawler to ignore it, which slows the recrawl of /support. /support is the page whose new in-body docs links were added precisely to give it something to rank on.
- Fix: Set `'/'` and `'/support'` to `'2026-11-19'` in `updatedAt`. Add a test or checklist step so that each climb PR touching a route's page or messages bumps that route's date.
- Scope: ok

## Runner-up notes (max 3 lines)
- /pro "More Registers & Multiple Stores" lists per-store address, tax, receipts, pricing and users, but never says whether stores share one stock pool. The only hint is the ATUM card on /extensions ("linking inventory locations to POS stores"), and that question decides a two-store quote. It sits next to the held multi-store wording.
- /pro has no link to the live demo and no docs link for any Pro feature except terminals, so I can't verify Reports or Customer display without a sales-style conversation.
- /downloads release notes print the raw URL "What's new: https://docs.wcpos.com/getting-started/whats-new" as visible body text.
