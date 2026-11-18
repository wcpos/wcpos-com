# Judge: woo-dev (WooCommerce developer)

## 10-second test
What is WCPOS: A free, open-source POS for WooCommerce that turns a tablet into a register selling from the store's own catalog, stock and prices, even offline.
Why version 2: 2.0 makes opening and closing the register, split payments and today's sales report free (the "New in 2.0" line above the H1).

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: /pro, desktop and phone (all locales)
- Element: The seven feature cards under "What's included in Pro?" (More Registers & Multiple Stores, Payment Terminal Integration, Stock & Price Editing, Order Management, Customer Management, Reports…, Custom Payment Gateways), next to the buy box line "One license, all features."
- Problem: /pro is the page that claims to list "all features", but it lists fewer than the comparison pages do. Every /compare/* page says: "Pro adds: … a customer-facing display, the Coupons screen, … store-specific pricing, … and the extension directory." None of those four appear anywhere on /pro. "Store-specific pricing" shows up only as the word "pricing" inside the multi-store card.
- Why it costs: /pro is the page I send to a client with the price, and it undersells the product. A client who asks "does it do a customer display?" or "can staff apply coupons at the till?" gets no answer from the pricing page. I have to dig into a competitor comparison to find out these are Pro, or open a support thread.
- Fix: Add the missing Pro items already claimed in `compare.*.proAdds` to /pro, either as one short card or as a line under the grid, for example "Also in Pro: a customer-facing display, the Coupons screen, store-specific pricing and the in-app extension directory." Add it in all locales.
- Scope: ok. The copy reuses claims the site already makes on every /compare page. Price and plan wording stay untouched.

## Worst defect — UI
- Page/viewport: /extensions, phone 390x844 (also the first card on desktop)
- Element: Under the H2 "Card terminals and payments", the first and only card on the phone fold is "Email Invoice Gateway — Send an invoice email to the customer with a link to pay for the order."
- Problem: The group is meant for hardware, but it opens with the one entry that is not a terminal. A real terminal (Mercado Pago, Mollie, …) first appears below the fold. The well-known ones, Stripe, Square and SumUp, sit sixth to eighth because the group keeps catalog order.
- Why it costs: Hardware support is the question this page answers for a developer or an owner. The first screen shows an email-invoice gateway, so the page reads as "no terminals here" until you scroll. That weakens the "Works with the equipment you already have" promise the home page links into.
- Fix: In `EXTENSION_GROUPS`, order the payments group with terminals first (Stripe, Square, SumUp, PayPal Reader, Mollie, Windcave, …) and put Email Invoice Gateway and Vipps MobilePay last. Alternatively, sort that group by putting terminal entries ahead of gateways. Update the test's expected order to match.
- Scope: ok. The change is ordering within an existing group, with no new copy.

## Worst defect — SEO
- Page/viewport: /pro (all locales)
- Element: The "Frequently Asked Questions" section's five Q&As ("Is the free plugin limited?", "What happens when my license expires?", "How many sites can I use my license on?", …). facts.json reports JSON-LD on /pro as only `Organization` and `SoftwareApplication`.
- Problem: Every /compare/* page emits `FAQPage` JSON-LD for its FAQ (for example `compare/square/page.tsx:88`). The pricing page, which answers the pre-sales questions developers actually search for, emits none. This is the second round I have flagged it.
- Why it costs: Searches like "WCPOS Pro license expires" or "WCPOS free version limits" get no structured Q&A from wcpos.com. Rich results and AI answer engines quote third-party roundups instead of the owner's answer to "nothing switches off".
- Fix: Emit `FAQPage` JSON-LD on /pro from the same `pro.faq.*` strings already rendered, built the same way as the compare pages' FAQ block.
- Scope: ok. This is metadata only, and the copy already exists.

## Runner-up notes (max 3 lines)
- /pro multi-store card still doesn't say whether stores share one WooCommerce stock count or keep stock per location, which is my first question for a two-store client (needs-front-desk: plugin fact check, raised in round 11).
- /extensions phone: on most terminal cards the "Pro" badge wraps alone onto its own line ("Mollie Terminal for WooCommerce" / "Pro"), six cards in a row. Keep the badge with the last word or put it above the title.
- /pro phone: the buy box comes before "What's included in Pro?" by design (#713, round 2). I'm leaving it alone so the order doesn't swing back and forth, but a one-line feature teaser above the buy box would help.
