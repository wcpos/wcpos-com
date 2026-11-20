# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source point of sale that turns a device at the counter into a WooCommerce register using the store's own catalog, stock and prices.
Why version 2: The "New in 2.0" line says opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (/ and /nl), both viewports, hero subline directly under the H1
- Element: "WCPOS turns the tablet into your register — same catalog, same stock, same prices, even offline." (nl: "WCPOS verandert de tablet in je kassa — …")
- Problem: The definite "the tablet" assumes a tablet the visitor may not have, and it narrows the product to one device. The next section ("One POS. Web, desktop, iOS & Android.") and the hero mockup (tablet, printer, terminal, scanner) both say any screen works. The fold sentence that should say what WCPOS is reads like a tablet app. The German version ("macht dein Tablet zur Kasse") has the same narrowing.
- Why it costs: A shop owner whose counter has a Windows PC or a Mac reads the one explanatory line on the fold and may conclude this isn't for them before scrolling to the platform section. Also, "the tablet" reads like a translation slip, which weakens trust in the first sentence of copy.
- Fix: Change `home.hero` subline in en/nl/de (and siblings) to "WCPOS turns your tablet, phone or computer into a register — same catalog, same stock, same prices, even offline." Keep the offline clause exactly as it is.
- Scope: ok (copy only; the device list repeats the platforms the page already names; the offline wording is untouched)

## Worst defect — UI
- Page/viewport: /support, desktop (and phone), hero
- Element: H1 "WooCommerce POS help & support" (`support-chat.tsx`: `mb-2 text-3xl font-bold md:text-4xl`)
- Problem: It is the one marketing-page hero that is off the type scale. /pro, /compare, /extensions, /downloads and /compare/square all set the H1 at 48 px with tight tracking (`text-4xl md:text-5xl tracking-tight`). /support sets it at 36 px with normal tracking, and the lede sits 8 px under it, against about 16 px elsewhere. In the desktop fold it reads lighter than the "Start with these guides" H2 rhythm below it, and the input box and pale chips become the visual anchor instead of the headline.
- Why it costs: Moving from /pro or /downloads to /support, the header jumps down a size and the spacing tightens, so the page feels like it comes from another template. That makes it look less finished at the point where a stuck customer is judging how well supported the product is.
- Fix: In both `<h1>`s in `support-chat.tsx`, use the shared hero class `text-4xl md:text-5xl font-bold tracking-tight` with `mb-4`, matching /extensions and /compare.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /extensions, meta description (all locales)
- Element: "Extensions for WCPOS, the WooCommerce point of sale: card terminals from Stripe, Square, SumUp, PayPal, Mollie and Windcave, plus WPML, Polylang and ATUM."
- Problem: The search snippet lists six terminal brands next to a free plugin and never says the terminal integrations need Pro. The page does say it ("Extensions marked Pro need WCPOS Pro."), and every terminal card carries a Pro chip. The snippet promises something the landing page then qualifies.
- Why it costs: Someone searching "Stripe Terminal WooCommerce POS" clicks expecting a free integration and finds a paid gate, which means a bounce and a mismatch between snippet and page. Naming Pro in the snippet sets the expectation and qualifies the click.
- Fix: Reword `extensions.meta.description` (all 10 locales, ≤160 chars) to "WCPOS Pro extensions for card terminals (Stripe, Square, SumUp, PayPal, Mollie, Windcave), plus free WPML, Polylang and ATUM integrations for WooCommerce POS." Only mark WPML/Polylang/ATUM as free if their cards carry no Pro chip; otherwise drop "free".
- Scope: ok (metadata copy; no pricing change)

## Runner-up notes (max 3 lines)
- /pro and /de/pro desktop buy box: the Yearly row is cramped. "Updates & support for 1 year" leaves "year" on its own line, and in German "Am beliebtesten" drops below "Jährlich". This is a layout problem (the price column takes the width), not a wording one.
- Cookie banner: the buttons flip order between desktop (Decline · Accept) and phone (Accept / Decline), so the primary action moves.
- /support: the suggestion chips render at about 40% contrast before Turnstile is ticked and read as disabled, not as examples.
