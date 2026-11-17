# Judge: designer (product designer)

## 10-second test
What is WCPOS: A free, open-source register app that runs your WooCommerce store at the counter on a tablet, with the same catalog, stock and prices, and it keeps working offline.
Why version 2: The red "New in 2.0" line says it: opening and closing the register, split payments and today's sales are now free.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 7 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: home (/), and /de and /nl too, at both viewports. Section "Built for the demands of physical retail".
- Element: "Smooth checkout flow [Pro] — Add items, apply discounts, choose payment method. Supports Stripe Terminal, SumUp, cash, and custom gateways." Five of the six feature cards carry a Pro badge, and checkout is one of them.
- Problem: The grid labels checkout as Pro. One scroll further down, the Free column lists "Basic checkout" and "Split payments", and the hero says 2.0 made the register free. A shop owner skimming the grid sees five Pro badges out of six and takes away "the free version is a search box; selling costs money". That is the opposite of the 2.0 story.
- Why it costs: This is the section where a visitor decides whether the free tier is enough to try. A Pro tag on the most basic POS task, taking a payment, undercuts "Free & Open Source" and "free in 2.0". It also contradicts the pricing table directly below, which hurts trust.
- Fix: Set `pro: false` on the checkout card (`src/components/home/features-section.tsx:33`). Reword `messages/*.json` "Smooth checkout flow" to "Add items, apply discounts, take cash or card, split payments. Pro adds Stripe Terminal, SumUp and custom gateways."
- Scope: ok. Copy and a flag only. Free checkout and split payments are already stated on the page.

## Worst defect — UI
- Page/viewport: home feature grid, desktop and phone, worst in de/nl. The same card pattern is on /extensions.
- Element: the "Pro" badge beside a card title that wraps. Examples: "Reports across days, registers & stores", "Lagerbestand & Preise spontan bearbeiten", "Berichte für verschiedene Tage, Kassen & Geschäfte", "Rapporten over dagen, kassa's en winkels", and on /extensions "Mercado Pago Terminal for WooCommerce" and "Windcave Terminal for WooCommerce".
- Problem: The `<h3>` is `flex items-center` (`src/components/ui/feature-card.tsx:50`). When the title wraps, the badge drops to the far right edge of the card, centred between the two lines. It is cut loose from the word it qualifies, while on one-line titles it sits right after the text. In the same grid the badge appears in two different places. Long German and Dutch titles make it happen on most cards.
- Why it costs: Inconsistent placement looks unfinished, and the ragged right edge breaks the scan line across the grid. Each localisation adds more wrapping cards, so the non-English home pages look the least polished.
- Fix: Keep the badge inline with the end of the title: make the h3 a block with the badge `inline-flex align-middle ml-2 shrink-0`, or use `flex items-start flex-wrap`. Apply the same change to the extensions card title row.
- Scope: ok. One component's styling.

## Worst defect — SEO
- Page/viewport: /extensions (all locales).
- Element: title "Extensions | WCPOS"; meta description "The extensions available for WCPOS, each with a link to its documentation."; the H1 and subtitle repeat the same text.
- Problem: The page lists Stripe, SumUp, Square, Mollie, PayPal, Windcave and Mercado Pago terminals plus WPML, Polylang and ATUM integrations. These are exactly what a store owner searches for ("woocommerce pos stripe terminal", "woocommerce pos wpml"). Yet neither the title nor the description says WooCommerce, POS, terminal or any integration name. Every other key page now has a searchable title; this one is the generic leftover.
- Why it costs: The page has the strongest long-tail intent on the site (hardware and plugin compatibility), but it is invisible for those queries. The bland snippet also loses the click when it does show.
- Fix: In `messages/en.json` `extensions.metadata` (and the locale equivalents), set the title to "WooCommerce POS Extensions: Card Terminals, WPML & More | WCPOS". Write a description that names Stripe, SumUp, Square and Mollie terminals and the WPML, Polylang and ATUM integrations. Optionally use the same wording for the hero subtitle.
- Scope: ok. Metadata and copy only, and every name is already on the page.

## Runner-up notes (max 3 lines)
- /de/pro buy box switches from du to Sie: "Testen Sie zuerst die kostenlose Version — upgraden Sie erst, wenn sie sich bewährt hat" (`messages/de.json:470-471`). The rest of the page and site says du.
- The nav "Pro" link is permanently red (`text-primary`, `site-nav.tsx:33`), the same colour as the active item, so on /support two links look current and on home Pro looks selected.
- The /de and /nl home stats band shows "5,000+" while the de/nl hero and buy box use "5.000+". "In Entwicklung seit" under "2014" reads backwards.
