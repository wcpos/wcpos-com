# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A free till for my WooCommerce shop that runs on a tablet at the counter and uses the same products, stock and prices as my website, even when the internet drops.
Why version 2: In 2.0 I can open and close the register, split payments and see today's sales without paying anything.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home (`/`), the Free card under "Start free. Upgrade when you need more." It shows the same way on desktop and phone.
- Element: "Basic checkout" (third line of the Free list, between "Product search & grid" and "Offline mode"; en `pricing.free.features.f3`, with the same wording in every locale)
- Problem: At my market stall the question is "can I take cards on the free version?" The answer is yes. I take cash, and a card on the reader I already own is recorded as a Card sale. The home page says so further up ("take cash or card on your own terminal, and split a payment"), and /compare/square says it too ("takes cash, records cards taken on a separate terminal"). But I decide what $0 gets me from the Free card, and there it says "Basic checkout". Next to Pro's "Payment terminal integration", that reads as "the free version can't take cards".
- Why it costs: Square's first selling point is its free plan with cards, so a shop owner who reads this card can drop WCPOS from the trial list for a reason that is false. I named this in round 10. It is still open, and the round 11 fixes did not touch it.
- Fix: Change f3 to "Checkout with cash or your own card terminal" in all ten locales. It is the same claim the home feature card already makes, so nothing new is added.
- Scope: ok

## Worst defect — UI
- Page/viewport: Home (`/`) at phone width (390 px). The same happens on the nl home and on /extensions cards with long titles.
- Element: The feature card "Reports across days, registers & stores", whose "Pro" badge drops onto a line of its own under the title
- Problem: The other three Pro cards in the grid ("Customer profiles", "Order history & management", "Edit stock & prices on the fly") keep the badge next to the title. On this card the title fills the line, so the badge sits alone on a second line, indented, with a gap above the description. The badge then looks like a stray tag, not part of the heading.
- Why it costs: These cards are where I sort out what is free and what is Pro. Reports is the one feature that is half free (today's sales) and half Pro, and the loose badge makes it the hardest card to read. It looks like a layout bug in the one section I read slowly.
- Fix: In `FeatureCard`, keep the badge with the last word of the title (wrap that word and the badge in a `whitespace-nowrap` span), or place the badge above the title, so it never wraps alone.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/pro`, all viewports and locales
- Element: "Frequently Asked Questions": five Q&As ("Is the free plugin limited?", "What's the difference between Yearly and Lifetime?", "What happens when my license expires?", "How many sites can I use my license on?", "What payment methods do you accept?"). JSON-LD on the page: only `Organization` and `SoftwareApplication`.
- Problem: All seven /compare/* pages output `FAQPage` JSON-LD for their FAQs, but the page that answers "is the free plugin limited" and "what happens when my license expires" does not. These are the questions a shop owner types into a search engine before buying.
- Why it costs: Without the markup, search engines are less sure these answers belong to WCPOS Pro. That gives /pro, the money page, less chance of the expanded result or AI-answer citation that the comparison pages are set up for. It has been a deferred candidate since round 10.
- Fix: Output `FAQPage` JSON-LD on /pro built from the same translated `faq` messages already on the page, as the /compare pages do. The wording stays the same, so the price text is not changed.
- Scope: ok

## Runner-up notes (max 3 lines)
- The home page still shows the comparisons only as a small link under the final call to action. A "Comparing Square or FooSales? See how we compare →" link under the Free/Pro card would avoid touching the header nav, which is the front desk's call.
- On the /compare hub, FooSales is the last of seven cards even though the subtitle names it second. Square and FooSales are what I came for, and they sit 3rd and 7th.
- /compare/square "Where Square is genuinely better" leads with "Square Free ($0/month) … WCPOS Pro costs $129 or more", which reads as if WCPOS has no free version. This is price wording, so it is needs-front-desk.
