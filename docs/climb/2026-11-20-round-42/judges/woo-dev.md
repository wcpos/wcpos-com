# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS plugin and apps that turn a tablet, phone or computer into a register for the client's own WooCommerce store, selling from the same catalog, stock and prices, even offline.
Why version 2: The "New in 2.0" line says register open and close, split payments and today's sales report are now free. That answers the question, but it reads as a caption above the kicker, not as the headline news.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /pro, "What's included in Pro?" card 1, all viewports (also the same row on /compare/square, "Multiple stores / locations")
- Element: "More registers & multiple stores — Add registers beyond the free one, and run several stores, each with its own address, tax rates, receipt template, pricing and authorized users." The card has no link. The terminal card right below it does: "See all terminal extensions".
- Problem: My client has two stores, so this card is the one I'm reading the page for. It doesn't answer the two questions I have to settle before I can recommend Pro. First, is a "store" a location inside one WooCommerce site, or a second WooCommerce install? Second, do the stores share stock? The /pro page has no link to the documentation at all; the only outbound link in the feature list goes to /extensions. The answers already exist, in plain words, on the 2.x docs page "Stores" (docs.wcpos.com/manage-store/stores): stores are "all inside your one WooCommerce site". It also says "All stores share the same WooCommerce stock. To count stock per store, use ATUM Multi-Inventory", and that fully separate shops mean WordPress Multisite. The site just doesn't point there.
- Why it costs: I can't tell whether the client needs one Pro licence on one site or a licence per site plus ATUM, and the licence FAQ ("2 sites, one live and one development") makes that harder to guess. That uncertainty is what sends me to Discord or to a competitor whose page answers it. This is the fifth round this gap has come up. A link avoids the product statement the front desk is holding, because it adds no claim: it points to documentation that already makes the statement.
- Fix: Give the stores card a link like the terminal card's, `features.stores.link` → "How stores share products, stock and orders" → https://docs.wcpos.com/manage-store/stores, in each locale. Reuse the `link: { label, href }` shape that `pro/page.tsx` line 133 already uses.
- Scope: ok. It is a link to existing docs, with no new claim and no licence wording. The front desk may want to confirm that it doesn't pre-empt the held stores/stock statement.

## Worst defect — UI
- Page/viewport: /de and /nl home, phone 390x844, hero H1
- Element: de "Dein WooCommerce- / Shop an / der Ladentheke."; nl "Je WooCommerce- / winkel, aan / de toonbank."
- Problem: The H1 renders as three lines. The middle one is a short two-word fragment ("Shop an", "winkel, aan"), which splits the preposition from its noun, and the H1 then rags badly against the centred body copy. The cause is `text-balance` at every width on the scroll-story H1 (`story-copy-blocks.tsx` line 99, from #877). At 390 px the hyphenated compound already forces the first break, and balancing then evens out the remaining two lines at the wrong point. The en H1 is fine. The de "New in 2.0" line also leaves "kostenlos." alone on its own line.
- Why it costs: This is the first headline a German or Dutch visitor sees. It reads as a broken phrase, so the site looks machine-translated just where it should feel native. Two of the ten locales show it on the most-visited page.
- Fix: `text-balance` → `sm:text-balance` on that heading, or keep "an der" / "aan de" together with a non-breaking space in the de and nl `a1.h` strings. Check de and nl at 390 px.
- Scope: ok (one class or two message strings). The file sits in the scroll-story, so check it against the owner's open PR before merging.

## Worst defect — SEO
- Page/viewport: /extensions (and every locale's /extensions), all viewports, "Card terminals and payments" section
- Element: Five cards with the same template: "Adds Stripe Terminal support to WooCommerce for in-person payments." The same sentence repeats for Square Terminal, Mollie Terminal, PayArc Terminal and PayPal Reader.
- Problem: This is the page whose title targets "WooCommerce POS Extensions & Card Terminals", and half its terminal body text is one sentence with the brand name swapped. None of those five says it works at the WCPOS register. The Mercado Pago and Windcave cards beside them do ("…from WooCommerce and WooCommerce POS", "…from the WooCommerce POS order-pay page"). The text comes from `src/lib/extensions-catalog.json`, a snapshot of wcpos/extensions `catalog.json`, so it is the same English boilerplate on all ten locale URLs.
- Why it costs: Thin, near-duplicate copy gives a search engine nothing to rank the page on for "Stripe Terminal WooCommerce POS" or "SumUp WooCommerce POS". It also leaves me unsure whether these are WCPOS add-ons or generic WooCommerce gateway plugins. That difference decides whether I'm buying Pro for the client.
- Fix: Rewrite the five descriptions on the Mercado Pago/Windcave pattern, for example "Take in-person card payments on a Stripe Terminal reader from the WCPOS register." Make the change in wcpos/extensions `catalog.json` (companion PR) and re-copy the snapshot at the new commit.
- Scope: ok (copy only; the claim is already on /pro, "Take in-person card payments on Stripe Terminal, Square Terminal, SumUp…")

## Runner-up notes (max 3 lines)
- /downloads subtitle "One register, every device." reads as a limit to anyone planning several registers, and "One store at the centre. Every register in sync." comes two sections later. "One store, every device." would match it.
- /compare/square: the table lists eight Pro terminals, but the "How do card payments work?" prose lists six (no Mercado Pago, PayArc or Windcave).
- Home free list: "Multi-currency" has no explanation and no link. I can't tell whether it means WooCommerce multi-currency plugins (which ones?) or per-store currency.
