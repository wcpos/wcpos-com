# Judge: seo (SEO specialist)

## 10-second test
What is WCPOS: A free, open-source point of sale for WooCommerce that turns a tablet into your till, using the same catalogue, stock and prices as the online store, even offline.
Why version 2: The "New in 2.0" line above the H1 says that opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home (`/`, every locale), desktop and phone, in the "Built for the demands of physical retail" feature grid.
- Element: The card "Smooth checkout flow" with a **Pro** badge: "Add items, apply discounts, choose payment method. Supports Stripe Terminal, SumUp, cash, and custom gateways."
- Problem: The grid says checkout itself is a paid feature. One section further down, the Free column lists "Basic checkout" and "Split payments", and the hero says 2.0 made the register free. #716 corrected the reports card but kept the Pro flag on checkout (`features-section.tsx`, f2 `pro: true`). The card also mixes free things (cash, discounts, choosing a tender) with Pro things (Stripe Terminal, SumUp) under one Pro badge.
- Why it costs: A shop owner scanning the grid sees five Pro badges out of six cards, and the first of them is checkout. They conclude the free version can't really sell, which works against the main 2.0 message and the "Download Free" CTA. That pushes people towards "WooCommerce POS free" alternatives.
- Fix: Set f2 to `pro: false` and reword it in all locales to keep the free part and name terminals as the Pro add-on, e.g. "Add items, apply discounts, take cash or split a payment. Card terminals such as Stripe Terminal and SumUp come with Pro."
- Scope: ok. This is a factual correction of a Free/Pro line under the round-2 front-desk ruling (prove it from the released 2.0.x plugin in the PR body). No price, term or plan change.

## Worst defect — UI
- Page/viewport: `/compare` hub, phone (390×844).
- Element: The gap between the hero paragraph ("…and we say when a competitor is the better fit.") and the "Who runs this comparison" card.
- Problem: About 250 px of empty dark band sits between the hero and the disclosure card. It is the `spacing="hero"` bottom padding plus the `spacing="compact"` top padding of the next `<Section>` in `compare/page.tsx`. Below it come the long hero paragraph and the disclosure card. The fold therefore shows no comparison, and the first "WCPOS vs …" card starts almost two screens down.
- Why it costs: Visitors arrive on this hub from "WooCommerce POS comparison" or "best WooCommerce POS" searches wanting the list. On phone they see a wall of meta-text and a blank band, with nothing to tap. That raises bounce and pogo-sticking, which is the user signal this page most needs.
- Fix: Use a smaller bottom padding for the hub hero below `md` (or give the disclosure section `pt-0` on phones), so that the disclosure card and the first comparison card come up a full band sooner.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/extensions`, all ten locales, desktop and phone.
- Element: `<title>Extensions | WCPOS</title>` (de "Erweiterungen | WCPOS"), the meta description "The extensions available for WCPOS, each with a link to its documentation.", and H1 "Extensions".
- Problem: This page is the site's only list of eight card-terminal integrations (Stripe Terminal, Square Terminal, SumUp, PayPal Reader, Mollie, Windcave, PayArc, Mercado Pago) and of the WPML, Polylang and ATUM integrations. Yet the title, description and H1 never say WooCommerce, POS, card terminal or any provider name. "Extensions" is a navigation label, not a query. The sceptic flagged the same title and description in round 2, and the fix for /downloads (#714) showed the pattern.
- Why it costs: Searches such as "WooCommerce POS Stripe Terminal", "WooCommerce card reader POS" and "SumUp WooCommerce POS" are the high-intent queries from shop owners who already have a terminal. With this title and description, the page can only rank on brand searches, and its snippet gives no reason to click.
- Fix: Set `extensions.metadata.title` and `.description` in `messages/*.json`, e.g. "WooCommerce POS Extensions: Card Terminals & Integrations | WCPOS" and "Connect Stripe Terminal, Square, SumUp, PayPal Reader, Mollie and more card readers to WCPOS, plus WPML, Polylang and ATUM integrations." Localise them, and give the H1/subtitle the same keyword.
- Scope: ok

## Runner-up notes (max 3 lines)
- `/downloads` still emits only `Organization` JSON-LD, although it carries the version (2.0.4), the OS list and the download links. Add `SoftwareApplication` (operatingSystem, softwareVersion, downloadUrl). Its H1 "One till, every device." has no keyword either.
- `/pro` H1 is just "WCPOS Pro", and the visible FAQ has no `FAQPage` JSON-LD (compare/square has one). An H1 like "WCPOS Pro for WooCommerce POS" would match the title.
- `/compare` is linked only from the footer on home and /pro. One in-body link ("How WCPOS compares →") near the home Free/Pro block would pass weight to the hub.
