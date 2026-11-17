# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free, open-source plugin that turns a tablet into the till for my WooCommerce shop, with the same products, stock and prices, even when the internet drops.
Why version 2: Version 2.0 makes opening and closing the register, split payments and today's sales free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (`/`), desktop and phone. The same card appears on /nl and /de because it comes from one component.
- Element: the "Built for the demands of physical retail" card "Smooth checkout flow **Pro** — Add items, apply discounts, choose payment method. Supports Stripe Terminal, SumUp, cash, and custom gateways." (`messages/*.json` `home.features.items.f2`, `pro: true` in `src/components/home/features-section.tsx:33`). The Free column below it lists only "Basic checkout".
- Problem: Round 2 fixed the reports card, but this one is still wrong. A Pro badge on "checkout … cash" tells me I have to pay to ring up a sale and take cash. The hero on the same page says split payments are free in 2.0. /compare/square says the free 2.0 version has "a tender pane beside the cart [that] takes cash, records cards taken on a separate terminal, and can split one order across several payments". Only the terminal integrations and the other WooCommerce gateways are Pro.
- Why it costs: My first question about any free tier is whether I can take money with it. I'm weighing this against Square's free plan and FooSales, and this badge makes the free version sound like a demo. Then /compare tells me otherwise, so now I trust neither page.
- Fix: drop the Pro badge from f2 and rewrite it as checkout that is free: "Add items, apply discounts, take cash or card on your own terminal, and split one sale across several payments." Move "Stripe Terminal, SumUp and other gateways" into the Pro list, which already has "Payment terminal integration". Change "Basic checkout" in the Free column to "Checkout with cash, card and split payments". Do this in all ten locales.
- Scope: ok (factual correction of tier copy to match facts the site already states on /compare; no price, plan or table-structure change)

## Worst defect — UI
- Page/viewport: home, phone 390px, all locales. Worst on /de, also visible on / and /nl.
- Element: the two stacked hero buttons, "Live-Demo testen" and "Kostenlos herunterladen" (en: "Try Live Demo" / "Download Free").
- Problem: on phone each button sizes to its own label, so the stack has two different widths. On /de the red demo button is about 200 CSS px wide and the black download button about 250 px. The two edges don't line up, and the secondary button looks bigger than the primary one.
- Why it costs: these buttons are the first thing my thumb goes to. Two ragged widths look unfinished on the screen that is meant to earn my trust. Since the black one is larger, it also pulls my eye away from the demo, which is the low-risk thing I'd actually try this week.
- Fix: below `sm`, give both hero CTAs the same width (`w-full max-w-xs` on each button, or a column stack with `items-stretch` at a fixed max width). Desktop doesn't change.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /extensions, all viewports and locales.
- Element: `<title>Extensions | WCPOS</title>` and the meta description "The extensions available for WCPOS, each with a link to its documentation."; the H1 is "Extensions".
- Problem: this is the one page that lists the card terminals I'd search for ("Square Terminal for WooCommerce", "SumUp Terminal for WooCommerce", "Stripe Terminal for WooCommerce", Mollie, PayPal Reader, Mercado Pago). Yet its title and description name none of them and don't say WooCommerce POS. A navigation label is wasted on a page that should catch "WooCommerce POS card reader" and "Square Terminal WooCommerce" searches. Round 2's sceptic named it, and it is still unchanged.
- Why it costs: I already own a Square terminal, so "can I keep using it?" is a search I'd type. This page answers it, but with a title like that it won't rank or get the click.
- Fix: new `extensions.meta.title` and `meta.description` in all ten locales, e.g. "WooCommerce POS Extensions: Stripe, Square & SumUp Terminals | WCPOS". Have the description name the terminal integrations the page already lists.
- Scope: ok

## Runner-up notes (max 3 lines)
- /compare/square (and its sibling pages) is a dead end: about 23,000 px on phone, then the footer, with no Try Live Demo, Download Free or "see other comparisons" button. The only link in the body is the inline demo URL.
- /compare is still linked only from the footer, with nothing in the header nav or the home body. A shop owner with Square and FooSales on a shortlist never finds the comparisons that would win them over.
- /compare/square's "Offline" row says "take cash sales offline". 2.0 also completes Card-tender (external terminal) sales offline, so WCPOS sounds weaker than it is right next to Square's offline card payments.
