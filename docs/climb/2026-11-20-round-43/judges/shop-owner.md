# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source app that turns my tablet, phone or computer into a till for my WooCommerce shop, using the same products, stock and prices, and it keeps working when the internet drops.
Why version 2: 2.0 adds opening and closing the register, split payments and today's sales report, all free ("New in 2.0 · Open and close your register, split payments and see today's sales — free.").

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /compare/square, all viewports (the "Which should you choose?" section; desktop-full and phone-full captures).
- Element: "Choose WCPOS if: You want every sale, online and in person, to be a WooCommerce order sold from one catalog, with no second catalog to keep in sync, run more than one store, sell outside Square's eight countries, want a register in a web browser or in desktop apps for Windows, macOS and Linux, or want to use a payment gateway or card terminal other than Square." (`messages/en.json` `compare.square.choose.wcpos.body`; the Square card's `choose.square.body` is the same kind of single sentence.)
- Problem: The box where I actually decide is one 60-word sentence with five reasons strung together, and it doesn't parse: "…with no second catalog to keep in sync, run more than one store…" reads as if the missing catalog runs a store. "Sold from one catalog, with no second catalog" also says the same thing twice. Everything else on the page above it ("What Square doesn't do", "Where Square is genuinely better") is a scannable ✓/✗ list, so the verdict is the hardest part of the page to read.
- Why it costs: I skim. This is the last thing I read before choosing between Square and WCPOS for my counter and market stall, and I can't pick out which reason applies to me. The page's strongest point (every sale becomes a WooCommerce order) is buried at the start of a run-on sentence, right above the only call to action in the box.
- Fix: Render both choose cards as short bullet lists, one reason per item (for WCPOS: "Every sale, online and in person, is a WooCommerce order" / "You run more than one store" / "You sell outside Square's eight countries" / "You want a register in a browser or a Windows, macOS or Linux app" / "You use a gateway or card terminal other than Square"). Use the same copy, split into an array, and the ✓ list style the page already uses. Then do the same across the other comparison pages, which share the pattern.
- Scope: ok (copy and markup on an existing page; no new claims).

## Worst defect — UI
- Page/viewport: /compare/square, desktop 1440 (seen in compare-square-desktop-full.jpg, "Which should you choose?" section). The component is shared, so every comparison page that uses it is likely affected; I only have captures of the Square page.
- Element: The "Try Live Demo" and "Download Free" buttons inside the "Choose WCPOS if:" card.
- Problem: The right edge of the "Download Free" button sits past the card's right border (button ends at about x=711, card border at about x=707). The two buttons don't fit side by side in a card about 355px wide. Cause: `src/components/compare/choose-actions.tsx` switches to `sm:flex-row` at 640px, but the cards only go two-up at `md` inside a `max-w-3xl` container, so from 768px up each card is too narrow for both buttons in one row. German and Dutch labels ("Kostenlos herunterladen", "Gratis downloaden") will overflow further.
- Why it costs: A button spilling out of its card looks broken, and it sits on the one card that's meant to close the sale, on the page a Square-vs-WCPOS shopper lands on. It undercuts the polished, sourced feel of the rest of the page.
- Fix: Add `flex-wrap` to the actions row (or keep the buttons stacked inside the two-column cards, e.g. `sm:flex-row md:flex-col` or full-width buttons) so they stay inside the card at every width and in every locale.
- Scope: ok (one component's classes).

## Worst defect — SEO
- Page/viewport: /compare/square, metadata (all viewports).
- Element: `<title>`: "WCPOS vs Square for WooCommerce (2026)" (`compare.square.metadata.title`).
- Problem: The title never uses "POS" as a word of its own: "WCPOS" is one token, and "Square for WooCommerce" is the extension's name. The searches a shop owner like me types ("Square POS vs WooCommerce POS", "WooCommerce POS Square alternative") match the title only on "Square" and "WooCommerce". The H1 is identical, so neither carries the category term. The other headline signals (H2s, description) are fine.
- Why it costs: This is the money page for buyers comparing against Square, and its title and H1 miss the category keyword the rest of the site ranks on ("WooCommerce POS"), which weakens how relevant it looks for comparison searches. The title has about 20 characters to spare.
- Fix: Change the title to something like "WCPOS vs Square for WooCommerce: POS Compared (2026)" (about 52 characters, within the metadata-length test), and check that the other locales' titles keep their own word for POS.
- Scope: ok (one metadata field per locale).

## Runner-up notes (max 3 lines)
- There's no "Compare" item in the header nav. A visitor weighing Square or FooSales only finds the comparisons through a small grey "Weighing up Square or FooSales?" line under the home pricing cards, or in the footer.
- The Square page lists different terminals in two places: the WCPOS "Card payments" table cell names Mercado Pago, PayArc and Windcave, while the "How do card payments work?" prose names Vipps MobilePay instead and leaves those three out. Pick one list or end both with "and more".
- Capture notes: the phone full-page shots have stitching repeats (the compare-square phone tile repeats the page top mid-capture), and the cookie banner sits over the middle of the pro and compare full shots. I didn't count either against the site.
