# Judge: shop-owner (shop owner comparing POS plugins)

## 10-second test
What is WCPOS: A till for my WooCommerce shop that turns my tablet into the register at the counter, with the same products, stock and prices as my website, even when the internet drops.
Why version 2: In 2.0 I can open and close the register, split payments and see today's sales, all on the free version.

## Scores
| Track | Score |
|---|---|
| Marketing | 7 |
| UI | 8 |
| SEO | 8 |

## Worst defect — Marketing
- Page/viewport: Home (`/`), the Free card under "Start free. Upgrade when you need more.", desktop and phone (shown at phone width in the full shot)
- Element: "Basic checkout" (third line of the Free list, between "Product search & grid" and "Offline mode"; en `pricing.free.features.f3`, with the same wording in every locale)
- Problem: My first question for any till is "can I take cards on the free version at my market stall?" The answer is yes. The free version takes cash, and a card on the reader I already own is recorded as a Card sale. The home feature card says so ("take cash or card on your own terminal, and split a payment"), and so does /compare/square ("takes cash, records cards taken on a separate terminal"). But I decide what $0 gets me from the Free card, and there it says only "Basic checkout". Directly below, Pro's list says "Payment terminal integration", so "Basic" reads as "no cards unless you pay".
- Why it costs: Square's main pitch is a free plan that takes cards. A shop owner who reads this card can strike WCPOS off this week's trial list for a reason that is false. This is the third round I have named it (rounds 10, 12, 13), and round 12 listed it as a round-13 candidate.
- Fix: Change f3 to "Cash, or card on your own terminal" (or "Checkout with cash or your own card terminal") in all ten locales. It reuses the claim the home feature card already makes, so nothing new is claimed.
- Scope: ok (feature-list wording, not price or plan terms)

## Worst defect — UI
- Page/viewport: Home (`/`) at phone width (390 px). The same happens on the nl home.
- Element: The feature card "Reports across days, registers & stores", whose "Pro" badge drops onto a line of its own, indented, under the title
- Problem: The card just above it, "Edit stock & prices on the fly", keeps its badge next to the title, and so do the other Pro cards. On the Reports card the title fills the line, so the badge wraps alone onto a second line with a gap before the description. It looks like a stray tag, not part of the heading.
- Why it costs: This grid is where I work out what is free and what is Pro. Reports is the one feature that is half free (today's sales) and half Pro, and the loose badge makes it the hardest card to read. It looks like a bug in the section I read most slowly. Named in rounds 11 and 12 and still unfixed.
- Fix: In `FeatureCard`, wrap the title's last word and the badge in one `whitespace-nowrap` span (or put the badge above the title), so the badge never wraps on its own.
- Scope: ok

## Worst defect — SEO
- Page/viewport: `/compare/square`, all viewports (the same holds for the other six /compare/* pages)
- Element: "Already have a Square Terminal? WCPOS Pro's Square Terminal gateway collects WooCommerce order payments on it…" and "Pro adds: multi-store management, more registers, card-terminal integrations…". Neither has a link, and the only body link on the page goes to demo.wcpos.com (`compare/square/page.tsx`, pricing section). facts.json counts 13 internal links, the same as the home page, so the body adds none.
- Problem: The comparison page I land on from a search for "Square for WooCommerce alternative" sells Pro and the Square Terminal extension but never links to /pro or to the Square Terminal entry on /extensions. The page passes no link equity to the money page or the extensions page. A reader who is convinced has to find "Pro" in the header.
- Why it costs: The /compare/* pages are the site's strongest long-tail search pages. Without contextual links, /pro and /extensions get no anchor-text signal for "Square Terminal WooCommerce POS", and a convinced visitor loses the obvious next click. Named by the seo judge in round 12 and listed as a round-13 candidate.
- Fix: Link "WCPOS Pro" in `square.pricing.proAdds` (and in the "Already have a Square Terminal?" paragraph) to `/pro`, and "Square Terminal gateway" to `/extensions`. Do the same on the other comparison pages with their own existing words, so no copy changes.
- Scope: ok

## Runner-up notes (max 3 lines)
- The /compare hub subtitle names "Square, FooSales, Oliver POS", but the cards run Oliver, WooCommerce, Square (3rd) … FooSales (7th, last). Reorder the cards to follow the subtitle.
- /compare/square "Where Square is genuinely better" opens "WCPOS Pro costs $129 or more", which reads as if WCPOS has no free plan. It is price wording, so needs-front-desk.
- /pro's new card title "Customer-facing display" is in sentence case among Title Case cards ("Stock & Price Editing").
