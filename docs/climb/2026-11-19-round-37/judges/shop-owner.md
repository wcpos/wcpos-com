# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source plugin that turns my tablet into the till for my WooCommerce shop, using the same products, stock and prices, even when the internet drops.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, phone and desktop, "Which should you choose?" section
- Element: "Choose WCPOS if: You want every sale, online and in person, to be a WooCommerce order sold from one catalog, with no second catalog to keep in sync, run more than one store, sell outside Square's eight countries, want a register in a web browser or in desktop apps for Windows, macOS and Linux, or want to use a payment gateway or card terminal other than Square."
- Problem: This is the box where I decide, and it is one 60-word sentence with five reasons joined by commas. It repeats itself ("sold from one catalog, with no second catalog to keep in sync"). On a phone it runs to 9 lines of grey text. I can't pick out the one reason that fits my shop (one counter, a market stall, already on WooCommerce). The "Where Square is genuinely better" list just above uses ticked bullets, so this verdict box reads worse than Square's side.
- Why it costs: This is the last step before the "Try Live Demo" button. A skimmer who can't find their case in the verdict leaves without trying the demo, or goes with Square because its reasons were easier to read.
- Fix: Turn `compare.square.choose.wcpos.body` (and the matching `square.body`) into a short bulleted list, one reason per line, with the same reasons and no new claims: "Every sale, online and in person, is a WooCommerce order from one catalog" · "You run more than one store" · "You sell outside Square's eight countries" · "You want a register in a web browser or in desktop apps for Windows, macOS and Linux" · "You want a payment gateway or card terminal other than Square". Do this in every locale.
- Scope: ok (copy and markup on one existing section; reuses the page's own wording)

## Worst defect — UI
- Page/viewport: /compare/square (and the other /compare/<slug> pages), phone 390 px, "At a glance" table
- Element: the small grey per-cell label "Square POS + Square for WooCommerce" above every Square answer, beside "WCPOS" above every WCPOS answer
- Problem: On phone each row stacks into two columns, and each answer carries its own column label. The Square label wraps to two lines in a ~190 px column and the WCPOS label takes one, so in all nine rows the Square answer starts a line lower than the WCPOS answer it is compared with. The repeated label also adds about 18 lines of grey to the table. The table header already gives the full name once.
- Why it costs: This table is the part of the page I actually skim. Answers that don't line up, plus a two-line grey label nine times, make it harder to compare row by row on the phone I'd be reading it on.
- Fix: In `glance-table.tsx`, use a short competitor name (new key, e.g. `colSquareShort`: "Square") for the `sm:hidden` per-cell label only. Keep the full "Square POS + Square for WooCommerce" in the table header.
- Scope: ok (one component's phone-only label plus one short string per comparison/locale)

## Worst defect — SEO
- Page/viewport: /compare/square, meta description (all viewports)
- Element: "When Square for WooCommerce is the better choice, and when WCPOS is: where sales are recorded, syncing, locations and fees. Compared by the maker of WCPOS."
- Problem: The search snippet lists topics but no facts. The page's strongest sourced finding never appears: Square POS sales are not synced to WooCommerce as orders, while every WCPOS sale is a WooCommerce order. Someone searching "Square for WooCommerce orders sync" gets a snippet that doesn't answer them.
- Why it costs: This is the comparison page most likely to be found by shop owners who already use Square. A snippet that only lists topics gets fewer clicks than one that states the answer.
- Fix: Rewrite `compare.square.metadata.description` (≤160 chars, every locale) to lead with that fact, e.g. "Square POS sales don't become WooCommerce orders; WCPOS sales do. Syncing, locations, offline and fees compared with sources, by the maker of WCPOS."
- Scope: ok (one metadata string; the fact is already stated and sourced on the page)

## Runner-up notes (max 3 lines)
- /compare/square "Where Square is genuinely better" still says "WCPOS keeps taking cash sales offline". The glance row and FAQ on the same page say card sales on a separate terminal also complete offline. Still on the front-desk offline hold; I'd still lift it.
- /de home: the hero eyebrow stays English, "POINT OF SALE FÜR WOOCOMMERCE", while the title and /de/pro H1 say "Kassensystem".
- /downloads on phone renders macOS first (server default `mac-arm`) and then switches after hydration. A real iPhone visitor may briefly see the macOS card.
