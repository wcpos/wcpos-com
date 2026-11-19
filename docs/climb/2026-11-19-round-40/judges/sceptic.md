# Judge: sceptic (competitor-aware sceptic)

## 10-second test
What is WCPOS: A free, open-source plugin plus apps that turn the tablet, phone or computer I already own into a register for my existing WooCommerce store, selling from the same catalog and stock.
Why version 2: The small line above the kicker says 2.0 makes register open/close, split payments and today's sales free. It answers the question, but it reads as a caption, not a headline.

## Scores
| Track | Score |
|---|---|
| Marketing | 8 |
| UI | 8 |
| SEO | 9 |

## Worst defect — Marketing
- Page/viewport: /pro, all viewports (feature list, last item; the same line feeds the nl/de Pro pages)
- Element: "Custom payment gateways — Take payments with any WooCommerce-compatible gateway, not just the built-in options."
- Problem: "Any" is an overclaim, and the site contradicts it. /compare/woocommerce-pos says "WCPOS does not support WooPayments in-person payments" and "WCPOS has no WooPayments in-person integration". WooPayments is the most common WooCommerce gateway. Every comparison page is also more careful: it says "your store's other WooCommerce payment gateways at the register". The one unqualified claim sits on the page where the buyer is asked for $129 or $399.
- Why it costs: A buyer weighing WCPOS against the official WooCommerce POS (WooPayments built in) or Square reads "any gateway" on /pro, then finds the exception on a comparison page. After that, every other claim on the paid page reads as marketing, not fact. The site's trust story ("every number is sourced… check everything") is undone on the page where money is asked for.
- Fix: Reword to match the comparison pages, e.g. "Turn on your store's other WooCommerce payment gateways at the register, not just cash and card." Leave out "any".
- Scope: ok

## Worst defect — UI
- Page/viewport: All pages, desktop header (and the phone menu)
- Element: Header nav "Downloads · Pro · Documentation · Support · Roadmap", with no "Compare"
- Problem: The site's strongest asset for someone shopping competitors is seven sourced, dated comparisons (Square, FooSales, Oliver, official WooCommerce POS, Jovvie, Vitepos, YITH). Nothing in the header leads to them. They are reachable only from a small red text link at the bottom of /pro ("Compare WooCommerce POS systems"), one line in the home pricing section, and the footer. A secondary item like "Roadmap" gets a header slot; Compare does not.
- Why it costs: Visitors like me arrive with Square or FooSales already open in another tab. With no header path to "how is this different", the honest comparisons go unseen, and the visitor decides on vendor pages that frame WCPOS as the weaker option.
- Fix: Add `{ label: t('compare'), href: '/compare' }` to the nav items in `src/components/main/site-header.tsx`, between Pro and Documentation. The footer already has the localized "Compare" label.
- Scope: ok

## Worst defect — SEO
- Page/viewport: /pro (and /de/pro, /nl/pro), all viewports
- Element: H1 "WCPOS Pro for WooCommerce POS"; H2s "What's included in Pro?", "Get Pro", "Frequently asked questions"
- Problem: The paid page's only H1 says "POS" twice and carries none of the intent its title targets ("Pro Features & Pricing for WooCommerce POS"). Its three H2s are generic, so the heading outline names none of the things Pro is bought for (more registers, multi-store, card terminals, reports). Every other technical item is strong: Lighthouse SEO 100, canonical, 11 hreflang, SoftwareApplication + FAQPage. So this heading outline is the weakest SEO signal on the money page.
- Why it costs: Searches like "WooCommerce POS multiple registers" or "WooCommerce POS card terminal" have nothing in the headings to match, and the tautological H1 makes a weak snippet and accessibility landmark.
- Fix: Change the H1 copy to something like "WCPOS Pro: more registers, card terminals and full reports for WooCommerce". Do the same in de/nl.
- Scope: ok

## Runner-up notes (max 3 lines)
- /compare/square: "What Square for WooCommerce doesn't do" still opens "As verified on 2026-10-06" while the rest of the page says "checked again 2026-11-18". The mixed dates look stale. Also, "At a glance" lists 8 terminal integrations but the card-payments section lists 6.
- /downloads: "your phone shows the new stock level … updating in real time" is the very claim WCPOS uses against Square's one-hour sync, and it is given no proof or qualifier.
- Home "Synced with WooCommerce. Yours, even offline. … Internet drops? Keep selling" is still unqualified, while the meta description and compare pages now say cash/terminal sales only.
