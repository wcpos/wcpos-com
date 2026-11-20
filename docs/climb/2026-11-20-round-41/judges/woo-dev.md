# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin and apps that turn a tablet, phone or computer into a register running off the client's own WooCommerce catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says register open and close, split payments and today's sales are now free. It answers the question, but it reads as a feature caption, not as a reason to switch.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /downloads, step 1 plugin card, all viewports (the same gap on /pro and in the /pro FAQ)
- Element: "Latest 2.0.4 · WordPress 5.6+ · WooCommerce 9.0+ · PHP 7.4+"
- Problem: The site never says whether WCPOS works with WooCommerce High-Performance Order Storage (HPOS). "HPOS" appears on none of the eleven captured pages, and nothing in `messages/en.json` mentions it. It is supported: `woocommerce-pos.php` and `woocommerce-pos-pro.php` both call `FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true )`. The 2.x docs page "Order Storage (HPOS)" goes further and recommends switching to HPOS to speed up POS checkout.
- Why it costs: When I'm about to put a plugin that writes orders onto a client's store, "HPOS compatible?" is my first question, ahead of features. WooCommerce now creates new stores with HPOS on and warns in wp-admin about plugins that are not compatible. The requirements line is exactly where I look for this answer. Because it isn't there, I either install the plugin to check in WooCommerce → Settings → Features or ask on Discord. The site has every other spec I need, so this one gap is the step that sends me to a sales-style conversation.
- Fix: Add "HPOS compatible" to the requirements line, for example "… · WooCommerce 9.0+ (HPOS compatible) · PHP 7.4+", and link it to the docs "Order Storage (HPOS)" page. That is one message key (`downloads` plugin card meta) in each locale.
- Scope: ok. This is not a new claim: both plugins declare HPOS compatibility in code, and docs 2.x documents it. The front desk may want to confirm the wording.

## Worst defect — UI
- Page/viewport: /downloads, phone 390x844, "Three steps to your first sale" → step 2 "Pick your device"
- Element: Desktop app card "macOS (Apple Silicon) · / macOS (Intel) · Windows · Linux" and Web card "Set up on your store · / Open the live demo"
- Problem: Each "·" is drawn in the same span as the link before it, inside a `flex-wrap` row (`downloads/page.tsx` lines 299–304 and 314–318). At phone width the row wraps after the dot, so the first line ends in a dangling "·" and the next line starts with a link that has no separator. In the Web card the two links end up stacked, with an orphan dot on the right of the first line. In de and nl the labels are longer, so more lines wrap this way.
- Why it costs: On the page I use to pick a build for each register, the download links look broken and unfinished. It's small, but it is the conversion page, and it makes three or four links harder to tell apart.
- Fix: At phone width, drop the dots and space the links with `gap-x-3` (or a `list-none` list with `sm:` separators). Keep the dots only from `sm` up, where the row doesn't wrap. Alternatively, hide a separator that ends a line with `[&>span:last-child]`-style markup.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /compare/square, meta description (desktop and phone; it is the search snippet)
- Element: "When Square for WooCommerce is the better choice, and when WCPOS is: where sales are recorded, syncing, locations and fees. Compared by the maker of WCPOS."
- Problem: The snippet lists topics but gives no answer. The page's answer is sourced and plain: "orders placed in Square's POS are not synced to WooCommerce", stock catches up at the next scheduled check (one hour by default), and the extension links one location at a time. None of that reaches the search result, though it is exactly what someone searching "Square for WooCommerce POS orders" wants to know.
- Why it costs: For a two-store client, the one-location limit and the missing orders are the deciding facts. A snippet that only says "here's what we compare" loses the click to a result that states the answer. This is the strongest comparison page on the site, and its description is the weakest part of it. Round 40 carried this forward; it is still live.
- Fix: Rewrite `compare.square.meta.description` around the answer, within about 155 characters. For example: "Square for WooCommerce syncs products and stock, not orders, and links one location. WCPOS makes every in-person sale a WooCommerce order. Sourced, dated." Do the same in each locale.
- Scope: ok (every fact is already on the page)

## Runner-up notes (max 3 lines)
- /pro "More registers & multiple stores" still doesn't say whether stores share WooCommerce stock or how ATUM fits. The front desk still holds this (fifth round).
- /downloads subtitle "One register, every device." reads as a limit to anyone planning several registers, and the same page says "Every register in sync" two sections later.
- /extensions: five terminal cards carry the same boilerplate, "Adds X Terminal support to WooCommerce for in-person payments.", and none of them says it works at the WCPOS register. The text is thin and near-duplicate on the page that targets "card terminals".
