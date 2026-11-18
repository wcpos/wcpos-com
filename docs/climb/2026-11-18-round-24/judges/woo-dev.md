# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin for WooCommerce that turns a tablet into the register and sells from the store's own catalog, stock and prices, even offline.
Why version 2: In 2.0, opening and closing the register, split payments and today's sales report are free ("New in 2.0" line above the H1).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports and locales. The first card under "What's included in Pro?" (`pro` multi-store feature copy in `messages/*.json`).
- Element: "More Registers & Multiple Stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users."
- Problem: My client has two stores, so the first thing I need to know is whether each store keeps its own stock. The card lists five things a store can have on its own and leaves stock out. Nothing on /pro links to an answer. The site does have one, but on another page: /extensions lists "WCPOS ATUM Integration (Pro): ATUM Multi-Inventory integration for WCPOS, linking inventory locations to POS stores." The site's own /compare/yith then counts separate stock against WCPOS. Its row reads "Unlimited stores and registers, with separate stock for each store" for YITH, against "more registers and multi-store management in Pro" for WCPOS. Its outro says "If you … sell from several stores with separate stock … YITH Point of Sale may be the better fit." The ATUM route is never mentioned.
- Why it costs: For a two-store client, separate stock is the deciding question. As the pages stand, I would read /pro, find nothing on stock, check /compare/yith and recommend YITH. Or I would have to ask sales or support. The site already has the answer in a page I'd have no reason to open.
- Fix: Add one clause and a link to the /pro multi-store card in every locale: "Need separate stock for each store? Link ATUM Multi-Inventory locations to your POS stores with the ATUM integration →" (link to /extensions, or straight to docs.wcpos.com/extensions/atum). Optionally add the same pointer to the WCPOS cell of the /compare/yith stores row.
- Scope: ok. It restates the /extensions catalog entry, so it is not a new claim and not a pricing or licensing change. Ask the owner to confirm that the wording "separate stock per store" is accurate for the ATUM integration before it ships.

## Worst defect — UI
- Page/viewport: /extensions, phone 390 (also any card narrow enough that the title fills its last line).
- Element: The "Pro" chip after the card titles "Mollie Terminal for WooCommerce", "PayArc Terminal for WooCommerce", "PayPal Reader for WooCommerce", "Square Terminal for WooCommerce" and "Stripe Terminal for WooCommerce".
- Problem: On these five cards the chip sits alone on a line under the title, as an orphan with a blank row beside it. It shares a line only when the title happens to be short enough, as on Mercado Pago's second line. The cause is in `extensions/page.tsx`: the `<Badge>` is a sibling of an inline `<h3>`, so the browser can break the line between the last word and the chip. The round-23 designer judge reported this, and it is still live in this capture.
- Why it costs: This is the page I open to check which terminals are supported. On phone every card gets taller, the list of eight terminals is longer to scroll, and the loose chips look like a layout bug on the page that is meant to show off the integrations.
- Fix: Wrap the title's last word and the badge in one `whitespace-nowrap` span, or move the badge inside the `<h3>` with a non-breaking space before it, so the chip always stays on the title's last line.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare hub, all locales (meta description, `compare.hub.metadata.description`).
- Element: "Honest, sourced comparisons of point of sale systems for WooCommerce — architecture, real free-tier limits, pricing, offline support, and when to choose each one." (162 characters)
- Problem: The hub's description runs past the roughly 155-character snippet length in 7 of the 10 locales: en 162, de 187, nl 192, fr 204, es 202, pt 184 and it 172. Every other captured page is now 142 to 158 characters. The hub is the parent page of the seven-page comparison cluster, and since #800 the spokes link to each other, so it is the page most likely to rank for "WooCommerce POS comparison". The shop-owner judge reported this in round 23, as I did in my round-23 runner-up notes. It was not picked.
- Why it costs: Search results will cut the snippet off around "…and when to choose" in en, and around the middle in fr and es. The selling point ("when to choose each one") is the part that gets dropped, and Google is more likely to rewrite the snippet with text of its own choosing.
- Fix: Cut it to 155 characters or fewer in every locale, for example en "Sourced comparisons of WooCommerce POS systems: architecture, real free-tier limits, pricing, offline support, and when to choose each one." (139). Add the hub key to the existing metadata length test.
- Scope: ok

## Runner-up notes (max 3 lines)
- Home act 3 still says "Card terminals … Plug in what's already on your counter." That overclaims, because connecting a reader needs Pro and one of the brands on /extensions. This was my round-23 marketing defect, and it is still unfixed.
- On /downloads the open release is 2.0.0, while 2.0.4 ("Latest") is collapsed. Someone upgrading today needs 2.0.4's fixes first.
- /pro "Customer-facing display … pair it to a till with a code" still says "till". The rest of /pro says "register".
